"""인공위성 궤도요소(TLE) 갱신.

업스트림 test-skydata 의 TLE 는 2020년 1월 것이다. 6년이 지나 상당수 위성이
이미 대기권에 재진입했고, 엔진 콘솔에 궤도 계산 오류가 수백 줄씩 찍힌다.
남아 있는 위성도 위치가 크게 틀린다.

CelesTrak 에서 최신 TLE 를 받아 갈아끼운다. 다만 궤도요소만 바꾸고
이름·그룹·밝기 같은 메타데이터는 기존 파일에서 가져온다. CelesTrak 은
이름과 궤도요소만 주기 때문이다.

출력: apps/skydata-overlay/tle_satellite.jsonl.gz

업스트림 파일을 직접 고치지 않고 overlay 로 두는 이유는, 업스트림에서
변경을 가져올 때 충돌을 만들지 않기 위해서다. 빌드할 때 test-skydata 위에
overlay 를 덮어쓴다.
"""
import gzip
import io
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, '..', 'test-skydata', 'tle_satellite.jsonl.gz')
OUT = os.path.join(HERE, '..', 'skydata-overlay', 'tle_satellite.jsonl.gz')

# 플라네타리움에서 의미 있는 무리만 받는다. active 전체(1만 개 이상)를
# 넣으면 파일도 커지고 화면도 알아볼 수 없게 된다.
# 정지궤도(geo)는 뺀다. 568개나 되는데 맨눈으로는 보이지 않고 움직이지도
# 않아 화면만 어지럽힌다. GPS 는 쌍안경으로 볼 수 있고 설명거리도 되어 남긴다.
GROUPS = ['stations', 'visual', 'amateur', 'science', 'gps-ops']
URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP={g}&FORMAT=tle'

UA = 'byeolmuri/1.0 (+https://byeolmuri.codingteading.com) TLE refresh'


def http_get(url):
    """urllib 로 받고, 인증서 검증이 막히면 curl 로 넘어간다.

    사내 프록시가 자체 CA 를 끼워 넣는 PC 에서는 파이썬이 검증에 실패하는데
    curl 은 시스템 인증서 저장소를 써서 통과한다. CI(우분투)에서는 urllib
    로 그냥 된다. 검증을 끄는 선택은 하지 않는다.
    """
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read().decode('utf-8', 'replace')
    except urllib.error.URLError as e:
        if 'CERTIFICATE_VERIFY_FAILED' not in str(e) or not shutil.which('curl'):
            raise
        out = subprocess.run(
            ['curl', '-sSL', '--max-time', '60', '-A', UA, url],
            capture_output=True, check=True)
        return out.stdout.decode('utf-8', 'replace')


def fetch_group(group):
    text = http_get(URL.format(g=group))
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    out = {}
    for i in range(0, len(lines) - 2, 3):
        name, l1, l2 = lines[i].strip(), lines[i + 1], lines[i + 2]
        if not l1.startswith('1 ') or not l2.startswith('2 '):
            continue
        try:
            norad = int(l1[2:7])
        except ValueError:
            continue
        out[norad] = {'name': name, 'tle': [l1, l2], 'group': group}
    return out


def load_base():
    if not os.path.exists(BASE):
        return {}
    recs = {}
    with gzip.open(BASE, 'rt', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            n = r.get('model_data', {}).get('norad_number')
            if n is not None:
                recs[n] = r
    return recs


# CelesTrak 의 무리 이름을 기존 파일이 쓰던 표기로 옮긴다.
GROUP_LABEL = {
    'stations': 'Space Stations', 'visual': 'Visual', 'amateur': 'Amateur',
    'science': 'Science', 'gps-ops': 'GPS',
}


def build():
    base = load_base()
    fresh = {}
    for g in GROUPS:
        try:
            got = fetch_group(g)
        except Exception as e:
            sys.stderr.write('%s 를 받지 못했습니다: %s\n' % (g, e))
            continue
        for norad, v in got.items():
            if norad in fresh:
                # 여러 무리에 걸친 위성. 무리 이름만 합친다.
                if v['group'] not in fresh[norad]['groups']:
                    fresh[norad]['groups'].append(v['group'])
                continue
            fresh[norad] = {'name': v['name'], 'tle': v['tle'], 'groups': [v['group']]}
        sys.stderr.write('%-10s %d개\n' % (g, len(got)))

    if not fresh:
        raise SystemExit('받은 위성이 없습니다. 갱신을 중단합니다.')

    records = []
    kept, added = 0, 0
    for norad in sorted(fresh):
        f = fresh[norad]
        old = base.get(norad)
        if old:
            kept += 1
            rec = json.loads(json.dumps(old))  # 깊은 복사
            rec['model_data']['tle'] = f['tle']
        else:
            added += 1
            rec = {
                'types': ['Asa'],
                'model': 'tle_satellite',
                'model_data': {'norad_number': norad, 'tle': f['tle']},
                'names': ['NAME ' + f['name'], 'NORAD %d' % norad],
                'short_name': f['name'],
                'interest': 3.0,
            }
        rec['model_data']['group'] = [GROUP_LABEL.get(g, g) for g in f['groups']]
        records.append(rec)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    buf = io.StringIO()
    for r in records:
        buf.write(json.dumps(r, ensure_ascii=False, separators=(',', ':')))
        buf.write('\n')
    # mtime 을 0 으로 고정해야 내용이 같을 때 파일도 같아진다.
    # 그래야 자동 갱신이 의미 없는 커밋을 만들지 않는다.
    with gzip.GzipFile(OUT, 'wb', compresslevel=9, mtime=0) as gz:
        gz.write(buf.getvalue().encode('utf-8'))

    dropped = len(base) - kept
    sys.stderr.write(
        '\n위성 %d개 (기존 메타 유지 %d, 신규 %d, 사라진 것 %d)\n'
        % (len(records), kept, added, dropped))
    sys.stderr.write('%s  %.1f KB\n' % (os.path.normpath(OUT),
                                        os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    build()
