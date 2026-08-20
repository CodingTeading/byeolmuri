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
