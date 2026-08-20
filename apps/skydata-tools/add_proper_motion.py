"""항성 타일에 고유운동을 채워 넣는다.

업스트림 test-skydata 의 별에는 고유운동이 비어 있다. 시차는 15,409/15,527
개가 들어 있는데 pra/pde 는 전부 0 이다. 컬럼만 있고 값이 없다.

엔진은 고유운동을 제대로 적용한다 (stars.c 의 star_get_astrom 이
위치 + 속도 x 경과시간 으로 계산한다). 그러니 값만 채우면 시간을 수만 년
돌렸을 때 별자리 모양이 실제로 변한다.

  주의: 엔진은 시차가 0 이하인 별의 고유운동을 무시한다. 속도가 무한대가
  되기 때문이다 (stars.c:113). 시차가 없는 118개는 채워도 소용이 없다.

출처는 HYG 항성 목록이다. 우리 별은 전부 HIP 번호를 갖고 있어 매칭이 확실하다.

출력: apps/skydata-overlay/stars/
"""
import csv
import glob
import gzip
import io
import math
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'search-index'))
import eph            # noqa: E402
import eph_write      # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, '..', 'test-skydata', 'stars')
OUT = os.path.join(HERE, '..', 'skydata-overlay', 'stars')
CACHE = os.path.join(HERE, 'cache', 'hyg.csv.gz')

HYG_URLS = [
    'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v34.csv.gz',
    'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/v3/hyg_v33.csv.gz',
]
UA = 'byeolmuri/1.0 (+https://byeolmuri.codingteading.com) star catalogue fetch'

MAS2RAD = math.pi / 180 / 3600 / 1000


def http_get_binary(url):
    """urllib 으로 받고, 인증서 검증이 막히면 curl 로 넘어간다."""
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read()
    except urllib.error.URLError as e:
        if 'CERTIFICATE_VERIFY_FAILED' not in str(e) or not shutil.which('curl'):
            raise
        out = subprocess.run(['curl', '-sSL', '--max-time', '180', '-A', UA, url],
                             capture_output=True, check=True)
        return out.stdout


def fetch_hyg():
    if os.path.exists(CACHE) and os.path.getsize(CACHE) > 1000000:
        return CACHE
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    last = None
    for url in HYG_URLS:
        try:
            data = http_get_binary(url)
            if len(data) > 1000000:
                io.open(CACHE, 'wb').write(data)
                sys.stderr.write('HYG 받음: %s (%.1f MB)\n' % (url, len(data) / 1048576))
                return CACHE
        except Exception as e:
            last = e
    raise SystemExit('HYG 목록을 받지 못했습니다: %s' % last)


def load_pm():
    """HIP 번호 -> (pmra, pmdec) 라디안/년.

    HYG 의 pmra 는 이미 cos(적위) 가 곱해진 값이고, 엔진이 저장하는 pra 도
    같은 규약이다 (stars.c 가 eraStarpv 에 넘길 때 cos(de) 로 나눈다).
    그대로 단위만 바꾸면 된다.
    """
    path = fetch_hyg()
    pm = {}
    # 열 이름이 따옴표로 감싸여 있고 값에도 쉼표가 들어갈 수 있어
    # 직접 자르지 않고 csv 모듈에 맡긴다.
    with gzip.open(path, 'rt', encoding='utf-8', errors='replace', newline='') as f:
        reader = csv.DictReader(f)
        cols = [c.strip().strip(chr(34)) for c in (reader.fieldnames or [])]
        reader.fieldnames = cols
        for col in ('hip', 'pmra', 'pmdec'):
            if col not in cols:
                raise SystemExit('HYG 에 %s 열이 없습니다: %s' % (col, cols[:12]))
        for row in reader:
            hip = (row.get('hip') or '').strip()
            if not hip:
                continue
            try:
                h = int(float(hip))
                ra = float(row.get('pmra') or 0)
                de = float(row.get('pmdec') or 0)
            except ValueError:
                continue
            if h and (ra or de):
                pm[h] = (ra * MAS2RAD, de * MAS2RAD)
    return pm


def main():
    pm = load_pm()
    sys.stderr.write('HYG 에서 고유운동 %d개\n' % len(pm))

    total = filled = no_hip = no_match = no_plx = 0
    for path in sorted(glob.glob(os.path.join(BASE, '**', '*.eph'), recursive=True)):
        blob = io.open(path, 'rb').read()
        chunks = list(eph.read_chunks(blob))
        extra = [(t, d) for t, d in chunks if t != b'STAR']
        rows = list(eph.read_rows(blob, b'STAR'))
        if not rows:
            continue
        for r in rows:
            total += 1
            hip = r.get('hip')
            if not hip:
                no_hip += 1
                continue
            v = pm.get(hip)
            if not v:
                no_match += 1
                continue
            r['pra'], r['pde'] = v
            filled += 1
            plx = r.get('plx')
            if plx is None or plx != plx or plx <= 0:
                no_plx += 1

        rel = os.path.relpath(path, BASE)
        rel_posix = rel.replace(os.sep, '/')
        m = re.search(r'Norder(\d+)/.*Npix(\d+)\.eph$', rel_posix)
        if not m:
            sys.stderr.write('타일 이름을 알 수 없습니다: %s\n' % rel)
            continue
        order, pix = int(m.group(1)), int(m.group(2))

        out_path = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        io.open(out_path, 'wb').write(eph_write.build_tile(
            rows, order, pix, chunk_type=b'STAR',
            columns=eph_write.STAR_COLUMNS, row_size=eph_write.STAR_ROW_SIZE,
            extra_chunks=extra))

    # properties 도 같이 내보낸다. 없으면 엔진이 survey 를 열지 못한다.
    src_props = os.path.join(BASE, 'properties')
    if os.path.exists(src_props):
        os.makedirs(OUT, exist_ok=True)
        shutil.copyfile(src_props, os.path.join(OUT, 'properties'))

    sys.stderr.write(
        '별 %d개 중 %d개에 고유운동을 넣었다\n'
        '  HIP 없음 %d · HYG 에 없음 %d · 시차가 없어 엔진이 무시할 것 %d\n'
        % (total, filled, no_hip, no_match, no_plx))


if __name__ == '__main__':
    main()
