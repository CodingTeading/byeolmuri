"""빠진 성운·성단·은하를 DSO survey 에 채워 넣는다.

업스트림 survey 는 9,008개로 잘 추려져 있지만 구멍이 있다. h Persei(3.7등급),
석호성운, 장미성운, 동베일성운처럼 아마추어가 실제로 찾는 천체가 빠져 있다.

OpenNGC(13,970개)를 통째로 넣는 것은 답이 아니다. 새로 들어올 4,232개 중
12등급보다 밝은 것은 39개뿐이고, 절반 이상이 15등급보다 어두워 어떤
아마추어 망원경으로도 보이지 않는다. 499개는 아예 단일 항성이라 항성
목록과 겹친다. 화면만 어지럽히고 파일만 키운다.

그래서 **볼 수 있는 것만** 넣는다.
  - 항성류(*, **, *Ass, Other, Nova, Dup, NonEx) 제외
  - 14등급 이내이거나 고유명이 있는 것

출력: apps/skydata-overlay/dso/
"""
import csv
import glob
import io
import math
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'search-index'))
import eph            # noqa: E402
import eph_write      # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
BASE_DSO = os.path.join(HERE, '..', 'test-skydata', 'dso')
OUT_DSO = os.path.join(HERE, '..', 'skydata-overlay', 'dso')
NGC_CSV = os.path.join(HERE, 'cache', 'NGC.csv')

MAG_LIMIT = 14.0
STAR_LIKE = {'*', '**', '*Ass', 'Other', 'Nova', 'Dup', 'NonEx'}

# OpenNGC 의 유형 코드를 엔진이 아는 SIMBAD otype 으로 옮긴다.
# EmN/RfN 은 엔진에 대응 코드가 없어 성간물질(ISM)로 둔다.
TYPE_MAP = {
    'G': 'G', 'GPair': 'PaG', 'GTrpl': 'GrG', 'GGroup': 'GrG',
    'OCl': 'OpC', 'GCl': 'GlC', 'Cl+N': 'Cl*', 'PN': 'PN',
    'HII': 'HII', 'EmN': 'ISM', 'RfN': 'ISM', 'DrkN': 'DNe',
    'SNR': 'SNR', 'Neb': 'ISM',
}

D2R = math.pi / 180
ARCMIN = D2R / 60


def ang2pix_base(ra, dec):
    """HEALPix nside=1 픽셀. nside=1 에서는 RING 과 NESTED 가 같다."""
    z = math.sin(dec)
    za = abs(z)
    tt = (ra % (2 * math.pi)) / (math.pi / 2)
    if za <= 2.0 / 3.0:
        jp = int(0.5 + tt - z * 0.75)
        jm = int(0.5 + tt + z * 0.75)
        ir = 2 + jp - jm
        kshift = 1 - (ir & 1)
        ip = ((jp + jm - 1 + kshift + 1) // 2) % 4
        return (ir - 1) * 4 + ip
    tp = tt - int(tt)
    tmp = math.sqrt(3 * (1 - za))
    jp, jm = int(tp * tmp), int((1 - tp) * tmp)
    ir = jp + jm + 1
    ip = int(tt * ir) % (4 * ir)
    return 2 * ir * (ir - 1) + ip if z > 0 else 12 - 2 * ir * (ir + 1) + ip


def parse_ra(s):
    h, m, sec = s.split(':')
    return (int(h) + int(m) / 60 + float(sec) / 3600) * 15 * D2R


def parse_dec(s):
    sign = -1 if s.strip()[0] == '-' else 1
    d, m, sec = s.strip().lstrip('+-').split(':')
    return sign * (int(d) + int(m) / 60 + float(sec) / 3600) * D2R


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def load_existing():
    """기존 타일을 픽셀별로 읽어 그대로 보존한다."""
    tiles = {}
    seen = set()
    for path in sorted(glob.glob(os.path.join(BASE_DSO, 'Norder0', 'Dir0', '*.eph'))):
        pix = int(re.search(r'Npix(\d+)', path).group(1))
        rows = list(eph.read_rows(io.open(path, 'rb').read(), b'DSO '))
        tiles[pix] = rows
        for r in rows:
            for d in r['ids'].split('|'):
                d = d.strip()
                if d:
                    seen.add(d)
    return tiles, seen


def ids_for(r):
    """엔진이 쓸 식별자 목록. 사람이 검색할 만한 것을 앞에 둔다."""
    out = []
    for cn in (r.get('Common names') or '').split(','):
        cn = cn.strip()
        if cn:
            out.append('NAME ' + cn)
    if r.get('M'):
        out.append('M ' + str(int(r['M'])))
    m = re.match(r'^(NGC|IC)(\d+)(.*)$', r['Name'])
    if m:
        out.append('%s %d%s' % (m.group(1), int(m.group(2)), m.group(3)))
    for ident in (r.get('Identifiers') or '').split(','):
        ident = ident.strip()
        if ident and ident not in out:
            out.append(ident)
    return out


def main():
    if not os.path.exists(NGC_CSV):
        raise SystemExit('먼저 NGC.csv 를 %s 에 받아두세요.' % NGC_CSV)

    tiles, seen = load_existing()
    existing = sum(len(v) for v in tiles.values())

    rows = list(csv.DictReader(io.open(NGC_CSV, encoding='utf-8'), delimiter=';'))
    added, skipped_faint, skipped_star, skipped_dup = 0, 0, 0, 0

    for r in rows:
        if r['Type'] in STAR_LIKE:
            skipped_star += 1
            continue
        ids = ids_for(r)
        if any(i in seen for i in ids if i.startswith(('NGC ', 'IC ', 'M '))):
            skipped_dup += 1
            continue
        vmag, bmag = num(r['V-Mag']), num(r['B-Mag'])
        mag = vmag if vmag is not None else bmag
        has_name = bool((r.get('Common names') or '').strip())
        if not has_name and (mag is None or mag > MAG_LIMIT):
            skipped_faint += 1
            continue
        try:
            ra, de = parse_ra(r['RA']), parse_dec(r['Dec'])
        except (ValueError, AttributeError):
            continue

        maj, minr = num(r['MajAx']), num(r['MinAx'])
        row = {
            'type': TYPE_MAP.get(r['Type'], 'ISM'),
            'vmag': vmag if vmag is not None else float('nan'),
            'bmag': bmag if bmag is not None else float('nan'),
            'ra': ra, 'de': de,
            'smax': maj * ARCMIN if maj else float('nan'),
            'smin': minr * ARCMIN if minr else float('nan'),
            'angl': num(r['PosAng']) * D2R if num(r['PosAng']) is not None else float('nan'),
            'morp': (r.get('Hubble') or '').strip(),
            'snam': (r.get('Common names') or '').split(',')[0].strip() or ids[0],
            'ids': '|'.join(ids)[:255],
        }
        tiles.setdefault(ang2pix_base(ra, de), []).append(row)
        added += 1

    out_dir = os.path.join(OUT_DSO, 'Norder0', 'Dir0')
    os.makedirs(out_dir, exist_ok=True)
    for pix in sorted(tiles):
        blob = eph_write.build_tile(tiles[pix], 0, pix)
        io.open(os.path.join(out_dir, 'Npix%d.eph' % pix), 'wb').write(blob)

    # properties 도 함께 내보낸다. 체크섬은 엔진이 확인하지 않으므로 뺀다.
    io.open(os.path.join(OUT_DSO, 'properties'), 'w', encoding='utf-8',
            newline='\n').write(
        'obs_description          = base DSO survey for byeolmuri\n'
        'hips_release_date        = 2026-08-20T00:00Z\n'
        'hips_order_min           = 0\n'
        'type                     = dso\n'
        'hips_tile_format         = eph\n')

    total = sum(len(v) for v in tiles.values())
    sys.stderr.write(
        '기존 %d + 추가 %d = %d개\n' % (existing, added, total))
    sys.stderr.write(
        '건너뜀: 항성류 %d, 이미 있음 %d, 너무 어두움 %d\n'
        % (skipped_star, skipped_dup, skipped_faint))


if __name__ == '__main__':
    main()
