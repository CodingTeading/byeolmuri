"""정적 검색 색인 빌더.

skydata 의 .eph 타일과 스카이컬처에서 검색 가능한 천체를 뽑고,
큐레이션한 한글 이름을 붙여 하나의 JSON 으로 내보낸다.

출력: apps/web-frontend/public/search-index.json

이 색인에는 '엔진이 실제로 해석할 수 있는 천체'만 들어간다.
카탈로그에만 있고 skydata 에 없는 천체를 넣으면 검색 결과를 눌러도
아무것도 선택되지 않는 죽은 항목이 되기 때문이다.
"""
import io
import json
import os
import sys

import extract

HERE = os.path.dirname(os.path.abspath(__file__))
SKYDATA = os.path.join(HERE, '..', 'skydata')
OUT = os.path.join(HERE, '..', 'web-frontend', 'public', 'search-index.json')


def load_constellations(korean):
    path = os.path.join(SKYDATA, 'skycultures', 'western', 'index.json')
    data = json.load(io.open(path, encoding='utf-8'))
    out = []
    for c in data['constellations']:
        names = [c['id']]
        cn = c.get('common_name') or {}
        for key in ('native', 'english'):
            if cn.get(key) and cn[key] not in names:
                names.append(cn[key])
        entry = {'n': names, 't': 'Con', 'v': None}
        ko = korean['constellations'].get(c.get('iau'))
        if ko:
            entry['k'] = [ko]
        out.append(entry)
    return out


def main():
    korean = json.load(io.open(os.path.join(HERE, 'korean-names.json'),
                               encoding='utf-8'))
    ko_objects = korean['objects']

    records = extract.load_dsos(SKYDATA) + extract.load_stars(SKYDATA)
    for r in records:
        r.pop('ra', None)
        r.pop('de', None)

    # 한글 이름을 식별자로 매칭한다.
    # DSO 타일은 고유명을 "NAME Pleiades" 로, 별 타일은 접두사 없이 "Vega" 로
    # 저장한다. 큐레이션 파일이 어느 쪽으로 적혀 있든 맞도록 양쪽을 다 시도한다.
    def variants(name):
        yield name
        if name.startswith('NAME '):
            yield name[5:]
        else:
            yield 'NAME ' + name

    # 일부 고유명은 타일에 대문자로 들어있다 (예: "MIRACH"). 대소문자는 무시한다.
    lookup = {}
    for key, values in ko_objects.items():
        for v in variants(key):
            lookup[v.lower()] = (key, values)

    used = set()
    for r in records:
        ko = []
        for name in r['n']:
            hit = lookup.get(name.lower())
            if not hit:
                continue
            used.add(hit[0])
            for k in hit[1]:
                if k not in ko:
                    ko.append(k)
        if ko:
            r['k'] = ko

    records += load_constellations(korean)

    missed = sorted(set(ko_objects) - used)
    if missed:
        sys.stderr.write('매칭 실패한 한글 이름 키 %d개:\n  %s\n'
                         % (len(missed), '\n  '.join(missed)))

    payload = {'version': 1, 'objects': records}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8').write(
        json.dumps(payload, ensure_ascii=False, separators=(',', ':')))

    ko_count = sum(1 for r in records if r.get('k'))
    size = os.path.getsize(OUT)
    print('천체 %d개 (한글명 %d개), %.1f KB' % (len(records), ko_count, size / 1024))
    print('출력:', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
