# skydata 도구

업스트림 `apps/test-skydata` 는 그대로 두고, 우리가 갱신한 파일만
`apps/skydata-overlay/` 에 둔다. 빌드할 때 test-skydata 위에 덮는다.

```bash
cp -r apps/test-skydata apps/skydata
cp -r apps/skydata-overlay/. apps/skydata/
```

업스트림 파일을 직접 고치면 나중에 변경을 가져올 때마다 충돌이 난다.

## refresh_tle.py — 인공위성 궤도요소

업스트림 TLE 는 **2020년 1월** 것이다. 6년이 지나 상당수 위성이 이미
대기권에 재진입했고, 엔진 콘솔에 궤도 계산 오류가 수백 줄씩 찍혔다.
남아 있는 위성도 위치가 크게 틀렸다.

CelesTrak 에서 최신 TLE 를 받되, **궤도요소만 갈아끼우고** 이름·그룹·밝기
같은 메타데이터는 기존 파일에서 가져온다. CelesTrak 은 이름과 궤도요소만
주기 때문이다.

```bash
python apps/skydata-tools/refresh_tle.py
```

받는 무리는 `stations`, `visual`, `amateur`, `science`, `gps-ops` 다.
정지궤도(`geo`)는 568개나 되면서 맨눈에 보이지도, 움직이지도 않아 뺐다.
`active` 전체는 1만 개가 넘어 파일도 화면도 감당이 안 된다.

현재 345개, 33KB.

### 자동 갱신

`.github/workflows/refresh-tle.yml` 이 매주 월요일에 돌린다. TLE 는 며칠만
지나도 위치가 어긋나므로 사람이 기억해서 하는 일로 두면 안 된다.

내용이 그대로면 커밋하지 않는다. gzip 의 mtime 을 0 으로 고정해 두어서
같은 데이터면 파일도 바이트까지 같다.

### 출처

궤도요소는 [CelesTrak](https://celestrak.org) 에서 받는다. 원 자료는
미 우주군이 공개하는 공개 데이터다.

## merge_dso.py — 빠진 성운·성단·은하 채우기

업스트림 survey 는 9,008개로 잘 추려져 있지만 구멍이 있다. **h Persei(3.7등급),
장미성운, 동베일성운** 처럼 아마추어가 실제로 찾는 천체가 빠져 있었다.

OpenNGC(13,970개)를 통째로 넣는 것은 답이 아니다. 새로 들어올 4,232개 중
12등급보다 밝은 것은 39개뿐이고, 절반 이상이 15등급보다 어두워 어떤 아마추어
망원경으로도 보이지 않는다. 499개는 아예 단일 항성이라 항성 목록과 겹친다.

그래서 **볼 수 있는 것만** 넣는다. 항성류를 빼고, 14등급 이내이거나 고유명이
있는 것만 고른다. 결과는 **222개 추가 (9,008 → 9,230)**, 521KB.

```bash
mkdir -p apps/skydata-tools/cache
curl -sL https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv   -o apps/skydata-tools/cache/NGC.csv
python apps/skydata-tools/merge_dso.py
python apps/search-index/build_index.py   # 검색 색인도 다시
```

### eph_write.py

`.eph` 타일 기록기. 업스트림에는 타일을 만드는 도구가 없어서 직접 만들었다.
포맷은 `src/eph-file.c` 를 따르고, `apps/search-index/eph.py` 의 역연산이다.

HEALPix 픽셀 배정은 기존 타일 9,008개를 전부 대조해 검증했다(불일치 0).
기록기도 기존 타일을 읽어 다시 쓰고 또 읽는 왕복 검사를 통과한다.

### 출처

[OpenNGC](https://github.com/mattiaverga/OpenNGC), CC-BY-SA-4.0.
