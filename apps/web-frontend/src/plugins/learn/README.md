# 학습 플러그인

이론과 실습을 한 화면에 둔다. 왼쪽에는 실제 하늘이 계속 떠 있고, 오른쪽
패널에서 설명이 진행되며, **설명이 넘어갈 때마다 하늘이 그에 맞춰 움직인다.**
천문대에서 선생님이 돔을 돌려가며 설명하는 것과 같은 구성이다.

동영상 강의와 다른 점은 하늘이 **살아 있다**는 것이다. 학생은 설명 도중에도
직접 끌어서 돌려보고, 확대하고, 다른 별을 눌러볼 수 있다.

## 레슨 추가하기

**코드를 건드릴 필요가 없다.** 파일 두 개만 만지면 된다.

1. `content/<id>.json` 에 레슨을 쓴다
2. `content/index.json` 의 `lessons` 배열에 한 줄 추가한다

레슨 본문은 목록에서 누를 때 따로 받아온다. 레슨이 늘어나도 첫 화면이
무거워지지 않는다.

## 레슨 형식

`content/big-dipper.json` 이 본보기다. 전체 구조는 이렇다.

```jsonc
{
  "id": "big-dipper",
  "title": "북두칠성은 어디일까?",
  "subtitle": "한 줄 설명",
  "minutes": 8,
  "level": "입문",              // 입문 · 기초 · 심화
  "tags": ["별자리", "북쪽 하늘"],
  "intro": "목록에서 보여줄 소개글",
  "steps": [ /* 아래 참고 */ ],
  "credits": "출처를 밝힐 것이 있으면"
}
```

### 단계(step)

```jsonc
{
  "title": "단계 제목",
  "text": "<p>본문. HTML 을 쓴다. <b>강조</b>는 흰색으로 나온다.</p>",

  "sky": {                     // 하늘 상태. 적은 것만 바뀐다
    "date": "2026-09-15T21:00:00+09:00",
    "lat": 37.5, "lng": 127.0, "elev": 0,
    "az": 0, "alt": 45,        // 방위/고도 (도). lookAt 이 있으면 무시된다
    "fov": 70,                 // 시야각 (도)
    "timeSpeed": 400           // 1=실시간, 0=정지, 400=400배
  },

  "show": {                    // 표시 요소. 적은 것만 바뀐다
    "constellationLines": true,
    "constellationArt": false,
    "constellationLabels": true,
    "constellationBounds": false,
    "onlyPointedConstellation": true,   // 보고 있는 별자리만 표시
    "atmosphere": false,
    "landscape": true,
    "azimuthalGrid": false,
    "equatorialGrid": false,
    "meridian": false,
    "ecliptic": false,
    "dso": true,
    "milkyway": true,
    "dss": false,
    "stars": true
  },

  "lookAt": "* alf UMa",       // 그쪽으로 시야를 옮기고 따라간다
  "select": "* alf UMa",       // 선택해서 오른쪽에 정보를 띄운다
  "clearSelection": true,      // 선택을 푼다

  "quiz": {
    "q": "질문",
    "opts": ["보기1", "보기2", "보기3", "보기4"],
    "right": 1,                // 0부터 센다
    "explain": "정답 해설. 틀린 이유까지 짚어주면 좋다"
  }
}
```

### 적은 것만 바뀐다

`sky` 와 `show` 는 **그 단계에서 달라지는 것만** 적는다. 나머지는 이전 단계
상태가 이어진다. 그래야 레슨을 읽는 사람도 무엇이 바뀌는지 한눈에 보인다.

레슨을 떠나면 `director.reset()` 이 하늘을 평소 상태로 되돌린다. 대기를 꺼두거나
시간을 400배로 돌려놓은 채 나가면 사용자는 앱이 고장난 줄 안다.

### 천체 이름

엔진이 아는 이름이어야 한다. 검색창에 쳐서 나오면 쓸 수 있다.

| 종류 | 예 |
|---|---|
| 고유명 | `Dubhe` `Polaris` `Vega` |
| 바이어 부호 | `* alf UMa` `* zet UMa` |
| 메시에 | `M 31` `M 45` |
| NGC/IC | `NGC 224` |
| 별자리 | `CON western UMa` |
| 행성 | `NAME Jupiter` `NAME Moon` |

고유명이 없는 별도 있다. 미자르는 `Mizar` 가 아니라 `* zet UMa` 로 찾아야 한다.
확실하지 않으면 `apps/web-frontend/public/search-index.json` 에서 확인한다.

## 콘텐츠를 쓸 때

- **위치는 되도록 지정하지 않는다.** 사용자가 있는 곳의 하늘이어야 오늘 밤
  밖에 나가서 그대로 확인할 수 있다. 위도를 비교하는 레슨처럼 꼭 필요할 때만
  `lat`/`lng` 를 쓴다
- **마지막 단계는 밖에서 직접 해볼 것으로 맺는다.** 화면 안에서 끝나면
  플라네타리움이지 관측 교육이 아니다
- 퀴즈 해설에는 정답만이 아니라 **왜 다른 보기가 틀렸는지**를 넣는다
- 별 이름의 유래, 문화별 이름 같은 이야기는 기억에 오래 남는다

## 엔진을 다룰 때 알아둘 것

- **객체형 속성은 `null` 로 비워지지 않는다. `0` 을 넣어야 한다.**
  `core.selection = null` 은 아무 일도 일어나지 않는다. 실측으로 확인했다
- `pointAndLock` 은 `core.lock` 을 걸어둔다. 선택만 풀고 잠금을 안 풀면
  화면이 계속 그 천체를 따라다닌다. `director.clearTarget()` 이 둘 다 푼다
- 엔진 객체(`$stel.core.*`)는 **Vue 반응형이 아니다.** 화면에 표시할 값은
  `$store.state.stel.*` 에서 읽어야 한다

## 파일

| 파일 | 역할 |
|---|---|
| `index.js` | 플러그인 등록. 패널 탭 `배우기` 와 레슨 라우트 |
| `lesson-list.vue` | 레슨 목록 |
| `lesson-view.vue` | 레슨 진행 화면 |
| `director.js` | 단계를 하늘에 적용. 엔진 속성 이름을 여기서만 안다 |
| `content/` | 레슨 데이터 |

## 들어오는 문 두 개

같은 레슨에 두 경로로 닿는다. 서로 대체가 아니라 보완이다.

| 주소 | 무엇 | 엔진 |
|---|---|---|
| `/learn` | 포털. 레슨 카탈로그 | **띄우지 않는다** |
| `/p/learn` | 패널 목록. 하늘을 보다가 고르기 | 이미 떠 있음 |
| `/p/learn/<id>` | 레슨 진행 | 필요 |

포털은 최상위 라우트라 App 밖에서 그려진다. 그래서 WASM 을 내려받지
않는다. 목록만 보러 온 사람에게 3MB 를 받게 할 이유가 없고, 검색엔진에도
가볍게 읽힌다. 레슨을 고르면 그때 하늘이 있는 쪽으로 넘어간다.
