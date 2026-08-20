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

## add_proper_motion.py — 별의 고유운동

업스트림 별 데이터에는 고유운동이 **비어 있습니다.** 시차는 15,409/15,527 개가
들어 있는데 `pra`/`pde` 는 전부 0 입니다. 컬럼만 있고 값이 없습니다.

엔진은 고유운동을 제대로 적용합니다 (`stars.c` 의 `star_get_astrom` 이
`위치 + 속도 × 경과시간` 으로 계산). 그러니 값만 채우면 시간을 수만 년 돌렸을 때
별자리 모양이 실제로 변합니다.

```bash
python apps/skydata-tools/add_proper_motion.py
```

HYG 항성 목록을 받아 HIP 번호로 맞춥니다 (`cache/hyg.csv.gz` 에 캐시).
우리 별은 전부 HIP 번호를 갖고 있어 매칭이 확실합니다.

**시차가 0 이하인 별의 고유운동은 엔진이 일부러 무시합니다** — 속도가 무한대가
되기 때문입니다 (`stars.c:113`). 118개가 여기 해당하며 채워도 소용이 없습니다.

### eph_write.py 의 항성 지원

항성 타일에는 데이터 청크 앞에 `{"children_mask": 15}` 를 담은 **JSON 청크**가
붙어 있습니다. 이걸 잃으면 엔진이 하위 타일이 있는지 몰라 더 어두운 별을
받아오지 않습니다. `build_tile(..., extra_chunks=...)` 으로 그대로 실어 보냅니다.

기존 타일을 읽어 다시 쓰고 또 읽는 왕복 검사를 통과합니다 (1,024행, 불일치 0).

## meteor-showers.json — 유성우

주요 11개를 손으로 정리했습니다. 복사점·활동기간·극대일·ZHR·진입속도.

**엔진이 하는 일은 제한적입니다.** 유성우는 검색·선택이 되고 선택하면 복사점에
기호와 이름이 찍히지만, **유성이 복사점에서 쏟아지지는 않습니다.** 유성 생성은
모듈 전역 `zhr` 하나만 보고 방향을 무작위로 잡습니다 (`modules/meteors.c`).
자세한 내용은 `docs/handoff-content.md`.
