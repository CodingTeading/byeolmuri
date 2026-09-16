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


# 언어별 큐레이션 파일. 모두 같은 구조({constellations, objects})와 같은 키
# (엔진 식별자)를 쓴다. 파일이 없는 언어는 엔진의 영어 이름으로 나온다.
LANG_FILES = [
    ('ko', 'korean-names.json'),
    ('ja', 'japanese-names.json'),
    ('es', 'spanish-names.json'),
]


def load_constellations(curated):
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
        for lang, table in curated:
            local = table['constellations'].get(c.get('iau'))
            if local:
                entry.setdefault('k', {})[lang] = [local]
        out.append(entry)
    return out


def main():
    curated = [(lang, json.load(io.open(os.path.join(HERE, f), encoding='utf-8')))
               for lang, f in LANG_FILES]

    records = extract.load_dsos(SKYDATA) + extract.load_stars(SKYDATA)
    for r in records:
        r.pop('ra', None)
        r.pop('de', None)

    # 이름을 식별자로 매칭한다.
    # DSO 타일은 고유명을 "NAME Pleiades" 로, 별 타일은 접두사 없이 "Vega" 로
    # 저장한다. 큐레이션 파일이 어느 쪽으로 적혀 있든 맞도록 양쪽을 다 시도한다.
    def variants(name):
        yield name
        if name.startswith('NAME '):
            yield name[5:]
        else:
            yield 'NAME ' + name

    for lang, table in curated:
        objects = table['objects']
        # 일부 고유명은 타일에 대문자로 들어있다 (예: "MIRACH"). 대소문자는 무시한다.
        lookup = {}
        for key, values in objects.items():
            for v in variants(key):
                lookup[v.lower()] = (key, values)

        used = set()
        for r in records:
            local = []
            for name in r['n']:
                hit = lookup.get(name.lower())
                if not hit:
                    continue
                used.add(hit[0])
                for k in hit[1]:
                    if k not in local:
                        local.append(k)
            if local:
                r.setdefault('k', {})[lang] = local

        missed = sorted(set(objects) - used)
        if missed:
            sys.stderr.write('[%s] 매칭 실패한 이름 키 %d개:\n  %s\n'
                             % (lang, len(missed), '\n  '.join(missed)))

    records += load_constellations(curated)

    payload = {'version': 1, 'objects': records}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    io.open(OUT, 'w', encoding='utf-8').write(
        json.dumps(payload, ensure_ascii=False, separators=(',', ':')))

    counts = ' · '.join('%s %d' % (lang, sum(1 for r in records if r.get('k', {}).get(lang)))
                        for lang, _ in LANG_FILES)
    size = os.path.getsize(OUT)
    print('천체 %d개 (언어별 이름: %s), %.1f KB' % (len(records), counts, size / 1024))
    print('출력:', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
