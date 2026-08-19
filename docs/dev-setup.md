# 개발 환경 세팅

우리 포크는 **엔진(C/WASM)을 수정하지 않는다**는 원칙을 따른다.
따라서 엔진 바이너리는 한 번만 만들어 두면 되고, 이후 모든 개발은 **Node만 있으면** 된다.

## 1. 필요한 것

| 항목 | 용도 | 필수 여부 |
|---|---|---|
| Node.js 18+ / yarn 1.x | 프론트엔드 개발 서버 | **필수** |
| Docker | 엔진 WASM 빌드 | 엔진을 직접 빌드할 때만 |
| emscripten 1.39.17 | 엔진 WASM 빌드 | Docker 이미지에 포함 |

> Node 24 + `NODE_OPTIONS=--openssl-legacy-provider` 조합으로 정상 동작 확인 (2026-08-19).
> 업스트림 `Dockerfile`은 node:12를 쓰지만 프론트엔드 개발에는 필요 없다.

## 2. 엔진 바이너리 확보 (셋 중 하나)

`apps/web-frontend/src/assets/js/` 에 `stellarium-web-engine.js` 와
`stellarium-web-engine.wasm` 두 파일이 있어야 한다. (업스트림 `.gitignore` 대상)

### 방법 A — GitHub Actions (권장, 로컬 세팅 불필요)
`.github/workflows/build-engine.yml` 를 `workflow_dispatch` 로 실행하고
`stellarium-web-engine` 아티팩트를 받아 위 경로에 푼다. 퍼블릭 저장소는 무료.

### 방법 B — 로컬 Docker
```bash
cd apps/web-frontend
make setup          # emsdk 이미지 빌드 + 엔진 빌드 + node 이미지 빌드
```
Windows에서는 `make`의 `-it` 플래그와 `$(PWD)` 경로 때문에 실패할 수 있으므로
저장소 루트에서 직접 실행하는 편이 확실하다:
```bash
docker build -f apps/web-frontend/Dockerfile.jsbuild -t swe-dev apps/web-frontend
docker run --rm -v "/c/projects/stellarium:/app" swe-dev \
  bash -c "source /emsdk/emsdk_env.sh && make js-es6"
cp build/stellarium-web-engine.js build/stellarium-web-engine.wasm \
   apps/web-frontend/src/assets/js/
```

### 방법 C — 릴리스 자산
우리 저장소 Release에 올려둔 바이너리를 내려받는다. (추후 자동화 예정)

> emsdk 버전 **1.39.17 고정**. 엔진이 `EXTRA_EXPORTED_RUNTIME_METHODS`,
> `allocate()`, `writeAsciiToMemory` 를 쓰는데 emscripten 2.x/3.x에서 전부 제거됐다.

## 3. 스카이 데이터

`vue.config.js` 가 빌드 시 `apps/skydata/` 를 `dist/skydata/` 로 복사한다.
개발용으로는 저장소에 들어있는 샘플(4.6MB)을 그대로 쓴다:

```bash
cp -r apps/test-skydata apps/skydata
```

`apps/skydata/` 는 `.gitignore` 에 등록되어 있다.

## 4. 개발 서버

```bash
cd apps/web-frontend
yarn install
NODE_OPTIONS=--openssl-legacy-provider yarn dev   # http://localhost:8080
```

## 5. 업스트림에서 가져온 수정 사항

- `apps/web-frontend/package.json`: `"vue": "^3.0.0"` → `"^2.6.11"`.
  업스트림 master의 버그. 앱 전체가 Vue 2 API(`new Vue`, `Vue.use`)인데
  package.json이 Vue 3을 요구해서 `vue-template-compiler` 버전 불일치로 빌드가 죽는다.
