"""skydata 의 .eph 타일에서 검색 대상 천체를 뽑아낸다."""
import glob
import os
import re

import eph

# 검색에 의미가 있는 식별자 접두사만 남긴다.
# PGC / MCG / UGC / 2MASX 같은 건 사람이 검색창에 치지 않으면서 색인만 부풀린다.
DSO_KEEP = re.compile(r'^(NAME |M \d|NGC |IC |Cl |Sh2-|LDN |LBN |Barnard |Cr |Mel )')
STAR_KEEP = re.compile(r'^(\* |V\* |NAME )')


def _designations(ids: str):
    return [d for d in ids.split('|') if d] if ids else []


def load_dsos(skydata: str):
    out = []
    for path in sorted(glob.glob(os.path.join(skydata, 'dso/**/*.eph'), recursive=True)):
        for r in eph.read_rows(open(path, 'rb').read(), b'DSO '):
            names = _designations(r['ids'])
            keep = [n for n in names if DSO_KEEP.match(n)]
            if not keep:
                continue
            # 표시용 이름은 원본 순서를 지켜야 엔진의 designationCleanup 과 결과가 맞는다.
            out.append({
                'n': keep,
                't': r['type'],
                'v': None if r['vmag'] != r['vmag'] else round(r['vmag'], 2),
                'ra': round(r['ra'], 6),
                'de': round(r['de'], 6),
            })
    return out


def load_stars(skydata: str):
    out = []
    for path in sorted(glob.glob(os.path.join(skydata, 'stars/**/*.eph'), recursive=True)):
        for r in eph.read_rows(open(path, 'rb').read(), b'STAR'):
            names = _designations(r.get('ids') or '')
            # ids 의 첫 항목이 접두사 없이 오면 그게 고유명이다 (예: "Caph").
            proper = [n for n in names if not n.startswith(('* ', 'V* ', 'NAME '))]
            keep = proper + [n for n in names if STAR_KEEP.match(n)]
            hip = r.get('hip')
            if hip:
                keep.append('HIP %d' % hip)
            if not keep:
                continue
            out.append({
                'n': keep,
                't': '*',
                'v': None if r['vmag'] != r['vmag'] else round(r['vmag'], 2),
                'ra': round(r['ra'], 6),
                'de': round(r['de'], 6),
            })
    return out
