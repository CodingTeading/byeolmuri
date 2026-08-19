# 코드 구조 파악 결과 (0단계)

조사 대상: `Stellarium/stellarium-web-engine` @ `5403e930` (2026-08-11)

## 1. 큰 그림

```
stellarium-web-engine/
├── src/, ext_src/          C 엔진 (WebGL 렌더링) → emscripten → WASM   [건드리지 않음]
├── SConstruct, Makefile    엔진 빌드                                    [건드리지 않음]
├── apps/
│   ├── test-skydata/       샘플 스카이 데이터 4.6MB (별/DSO/행성/은하수/랜드스케이프/스카이컬처)
│   ├── simple-html/        엔진만 쓰는 최소 예제
│   └── web-frontend/       ★ stellarium-web.org 그 자체 (Vue 2 + Vuetify 2)  [우리 작업 영역]
└── .github/workflows/      (우리가 추가) 엔진 WASM 무료 빌드
```

엔진은 `apps/web-frontend/src/assets/js/stellarium-web-engine.{js,wasm}` 로 복사되어
App.vue에서 **동적 import** 된다. 엔진 상태는 vuex의 `$store.stel` 에 리액티브하게 미러링되고,
`this.$stel` 로 직접 조작한다.

## 2. ★ 플러그인 시스템 — 우리 차별화의 핵심 진입점

`src/main.js` 가 `require.context('./plugins/', true, /\.\/\w+\/index\.js$/)` 로
**`src/plugins/<이름>/index.js` 를 자동 로드**한다. 즉 디렉토리만 추가하면 기능이 붙는다.

플러그인이 내보낼 수 있는 것:

| 키 | 효과 | 등록 위치 |
|---|---|---|
| `name` | vuex 모듈 네임스페이스 | `store/index.js:17` |
| `storeModule` | 전역 상태 추가 | `store/index.js:19` |
| `routes` | 최상위 라우트(전체 화면 페이지) | `main.js:117` |
| `panelRoutes` | **우측 사이드 패널 탭** (`meta: { tabName, prio }`) | `main.js:120`, `observing-panel.vue:37` |
| `vuePlugin` | 전역 Vue 컴포넌트/필터 | `main.js:128` |
| `onAppMounted(app)` | 앱 마운트 훅 | `App.vue:217` |
| `onEngineReady(app)` | **엔진 초기화 완료 훅** (여기서 `$stel` 사용 가능) | `App.vue:241` |
| `locales/*.json` | i18n 번역 자동 병합 | `main.js:68` |

`meta.tabName` 은 `$t()` 를 거치므로 플러그인 자체 locales로 번역된다.
사이드 패널 폭은 400px 고정(`observing-panel.vue`).

**결론: 관측 플래너 / 한국 콘텐츠 / 장비 FOV 를 전부 `src/plugins/*` 로 만들면
업스트림 파일을 거의 건드리지 않고, 업스트림 머지 충돌도 거의 없다.**

## 3. 데이터 소스 — 한 파일에 모여 있음

`src/App.vue:250~271` 에서 전부 선언된다. 전부 `process.env.BASE_URL + 'skydata/...'`.

```
stars      → skydata/stars              (HiPS 타일)
skycultures→ skydata/skycultures/western
dso        → skydata/dso
landscapes → skydata/landscapes/guereins
milkyway   → skydata/surveys/milkyway
minor_planets → skydata/mpcorb.dat
planets    → skydata/surveys/sso/{moon,sun}
comets     → skydata/CometEls.txt
satellites → skydata/tle_satellite.jsonl.gz
```

빌드 시 `vue.config.js` 의 copy 플러그인이 `apps/skydata/` → `dist/skydata/` 로 옮긴다.

**중요 발견:** URL 쿼리 `?sc=<url>` 로 **스카이컬처를 외부 URL에서 로드**할 수 있다
(`App.vue:255`). 즉 천상열차분야지도 스카이컬처는 **코드 수정 없이** 데이터만 만들어
테스트할 수 있다.

## 4. 외부 서비스 의존 — 생각보다 적다

| 대상 | 용도 | 비용 | 우리 대응 |
|---|---|---|---|
| `api.noctuasky.com` | 천체 이름 조회 / 검색 (2개 엔드포인트, `sw_helpers.js:281,296`) | 남의 비공개 서버 | **교체 필요.** 정적 JSON 색인으로 대체 가능 |
| Wikipedia API | 천체 설명문 | 무료 | 유지 |
| Nominatim (OSM) | 위치 역지오코딩 (`sw_helpers.js:477`) | 무료(정책 준수 필요) | 유지, User-Agent 명시 |
| OSM 타일 (leaflet) | 위치 선택 지도 | 무료(정책 준수 필요) | 유지 |

NoctuaSky 의존이 **검색 2개 엔드포인트뿐**이라는 게 핵심이다.
정적 색인 파일로 대체하면 **백엔드 서버 없이 완전 정적 배포가 가능**하고,
그러면 GitHub Pages / Cloudflare Pages로 **호스팅 비용 0원**이 된다.

## 5. 업스트림 이슈

- `package.json` 의 `"vue": "^3.0.0"` 이 잘못됨 (앱은 Vue 2 API). → 우리 포크에서 `^2.6.11` 로 수정.
- `src/main.js` 가 `lodash` 를 import 하는데 `dependencies` 에 없음 (전이 의존에 얹혀 동작 중).
- Dockerfile들이 node:12 / emsdk 1.39.17 로 매우 낡음. 단, 프론트엔드는 Node 24에서
  `--openssl-legacy-provider` 만 주면 정상 컴파일되므로 실사용상 문제 없음.
