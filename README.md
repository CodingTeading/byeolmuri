# 별무리

**밤하늘을 읽는 법을 배우는 곳.** 지금 있는 곳의 하늘을 실시간으로 보여주고,
오늘 밤 볼 만한 것을 골라주고, 별자리를 설명해 줍니다.

<https://byeolmuri.codingteading.com>

광고도 추적도 없는 **비영리 오픈소스** 프로젝트입니다.

---

## 무엇이 다른가

원본 [Stellarium Web](https://stellarium-web.org) 은 훌륭한 뷰어이지만
하늘을 보여주고 끝납니다. 별무리는 세 가지를 더 합니다.

**오늘 밤 관측 플래너** — 일몰·천문박명·달 방해도·기상청 예보를 종합해
"오늘 밤 관측 좋음/보통/나쁨"을 판정하고, 볼 만한 천체를 고도와 밝기로
골라 줍니다. 하늘을 보여주는 것과 관측을 계획하게 해주는 것은 다릅니다.

**이론과 실습을 한 화면에** — 왼쪽에 진짜 하늘이 떠 있고 오른쪽에서 설명이
진행됩니다. 설명이 넘어갈 때마다 하늘이 그에 맞춰 움직입니다. 천문대에서
선생님이 돔을 돌려가며 설명하는 것과 같습니다. 동영상 강의와 달리 학생이
설명 도중에도 직접 하늘을 돌려보고 다른 별을 눌러볼 수 있습니다.

**한국어 우선, 그리고 4개 언어** — 천체 이름을 한국어로 부릅니다. 직녀성,
좀생이별, 안드로메다은하로 검색됩니다. 한국어·영어·일본어·스페인어를
지원합니다.

**백엔드가 없습니다** — 원본은 천체 검색을 외부 비공개 API 에 의존하지만,
별무리는 빌드 타임에 만든 정적 색인(24,623개 천체)을 씁니다. 정적 호스팅만으로
사이트 전체가 돌아가므로 운영비가 들지 않습니다.

## 개발

```bash
git clone https://github.com/CodingTeading/byeolmuri.git
cd byeolmuri/apps/web-frontend
cp -r ../test-skydata ../skydata
yarn install
NODE_OPTIONS=--openssl-legacy-provider yarn dev   # http://localhost:8080
```

엔진 바이너리(WASM)는 저장소에 들어 있어 emscripten 도 Docker 도 필요
없습니다. 자세한 것은 [docs/dev-setup.md](docs/dev-setup.md).

## 문서

| 문서 | 내용 |
|---|---|
| [docs/architecture-notes.md](docs/architecture-notes.md) | 코드 구조, 플러그인 시스템, 데이터 흐름 |
| [docs/dev-setup.md](docs/dev-setup.md) | 개발 환경, 엔진 빌드 |
| [docs/i18n.md](docs/i18n.md) | 다국어 3층 구조와 주소 규칙 |
| [docs/planner.md](docs/planner.md) | 관측 플래너 계산과 기상청 연동 |
| [docs/menu-features.md](docs/menu-features.md) | 메뉴의 세 기능 — 하늘 밝기 · 이번 달 볼거리 · 관측 기록 |
| [apps/search-index/README.md](apps/search-index/README.md) | 정적 검색 색인 |
| [apps/web-frontend/src/plugins/learn/README.md](apps/web-frontend/src/plugins/learn/README.md) | **레슨 쓰는 법** |
| [docs/handoff-content.md](docs/handoff-content.md) | 레슨·포털 작업 인수인계 |
| [docs/lesson-review.md](docs/lesson-review.md) | 레슨 검수 의뢰서 — 사실·기능·오탈자 점검 |
| [docs/lesson-review-result.md](docs/lesson-review-result.md) | 그 검수 결과 (2026-08, 반영 완료) |
| [docs/handoff-i18n.md](docs/handoff-i18n.md) | **레슨 번역 인수인계** — 다음 다국어 작업 |
| [docs/i18n-glossary.md](docs/i18n-glossary.md) | 태그 대역표와 언어별 문체 규칙 |
| [docs/i18n-review.md](docs/i18n-review.md) | **다국어판 검수 의뢰서** — en·ja·es 대조와 사실 확인 |
| [docs/i18n-review-result.md](docs/i18n-review-result.md) | 그 검수 결과 (2026-08, 반영 완료) |

## 레슨 추가

코드를 건드릴 필요가 없습니다. `content/<lang>/<id>.json` 을 쓰고 목록에
한 줄 넣으면 됩니다. 형식은 위 학습 플러그인 문서에 있습니다.

## 커밋 계정

이 저장소만 `CodingTeading` 계정을 씁니다. `git config --local` 로 걸려 있어
다른 프로젝트에는 영향이 없습니다. **전역 설정을 바꾸지 마세요.**

```
git 전역      송현종 / hopse31c@gmail.com   ← 건드리지 않는다
이 저장소만    CodingTeading
푸시          SSH 별칭 github-codingteading
gh 활성 계정   hopse31c
```

## 라이선스와 출처

GNU AGPL v3. [Stellarium Web Engine](https://github.com/Stellarium/stellarium-web-engine)
을 기반으로 만들었습니다. 원본 README 는 [docs/upstream-README.md](docs/upstream-README.md)
에 있습니다.

**Stellarium 공식 프로젝트 및 Stellarium Labs 와는 무관한 별개의 프로젝트입니다.**

날씨 예보는 기상청 단기예보 서비스(공공데이터포털)를 이용합니다.
