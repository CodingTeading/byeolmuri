# 정적 검색 색인

별무리는 천체 검색에 **백엔드 서버를 쓰지 않는다.** 빌드 타임에 만든
정적 JSON 하나를 브라우저가 받아서 전부 클라이언트에서 처리한다.
덕분에 사이트 전체가 정적 호스팅만으로 돌아가고 운영비가 0원이다.

원본 stellarium-web.org 는 이 기능을 `api.noctuasky.com` 이라는
비공개 API에 의존한다 (`/api/v1/skysources/name/...`, `/api/v1/skysources/?q=...`).

## 무엇이 들어가는가

색인 대상은 **엔진이 실제로 해석할 수 있는 천체뿐이다.**
카탈로그에만 있고 skydata 에 없는 천체를 넣으면 검색 결과를 눌러도
아무것도 선택되지 않는 죽은 항목이 되기 때문에, 소스를 skydata 로 못박았다.

| 분류 | 개수 | 출처 |
|---|---|---|
| DSO | 9,008 | `apps/skydata/dso` HiPS 타일 |
| 항성 | 15,527 | `apps/skydata/stars` HiPS 타일 (max_vmag 7.0) |
| 별자리 | 88 | `apps/skydata/skycultures/western/index.json` |
| **합계** | **24,623** | 원본 1.0MB / gzip 약 370KB |

이 중 191개에 한글 이름이 붙어 있다 (`korean-names.json`).

> OpenNGC(13,970개, CC-BY-SA-4.0)와 HYG 카탈로그(CC-BY-SA-2.5)도 검토했지만
> 쓰지 않았다. skydata 에 없는 천체를 넣어봐야 죽은 검색 결과만 늘고,
> 서로 다른 버전의 share-alike 라이선스를 한 파일에 섞는 문제도 생긴다.
> DSO survey 자체를 확장하려면 `.eph` 타일 생성기가 필요한데, 업스트림
> `tools/` 에는 들어있지 않다. 별도 과제.

## 구성

| 파일 | 역할 |
|---|---|
| `eph.py` | `.eph` 타일 파서. 포맷은 upstream `src/eph-file.c` 사양을 따름 |
| `extract.py` | 타일에서 검색 대상 천체와 식별자를 뽑아냄 |
| `korean-names.json` | **손으로 큐레이션한 한글 천체명** |
| `build_index.py` | 위를 합쳐 `web-frontend/public/search-index.json` 생성 |

## 재생성

```bash
cd apps/search-index
python build_index.py
```

skydata 를 갱신했거나 `korean-names.json` 을 고쳤을 때만 다시 돌리면 된다.
결과물은 저장소에 커밋되어 있으므로 **사이트 빌드에는 Python 이 필요 없다.**

## 한글 이름 큐레이션 규칙

- 전통 명칭이 확실히 정착된 것만 전통명을 쓴다 (직녀성, 견우성, 북극성,
  천랑성, 노인성, 대각성, 좀생이별). 나머지는 표준 음차 표기.
- 근거가 불확실한 옛 이름은 넣지 않는다. 틀린 이름을 넣는 것보다 없는 게 낫다.
- 키는 엔진이 쓰는 식별자다. DSO 타일은 `NAME Pleiades` 형태,
  별 타일은 접두사 없이 `Vega` 형태로 저장하므로 빌더가 양쪽을 다 시도하고
  대소문자도 무시한다 (`MIRACH` 처럼 대문자로 들어있는 경우가 있다).
- 타일에 고유명이 아예 없는 별은 바이어 부호를 키로 쓴다 (예: `* zet UMa` = 미자르).
- 빌드 시 매칭되지 않은 키는 경고로 출력된다. 현재 7개가 skydata 에 없어서
  대기 중이며, skydata 를 확장하면 자동으로 붙는다.
