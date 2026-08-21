# 용어집 — 레슨 번역

레슨 본문(`src/plugins/learn/content/<lang>/`)을 옮길 때 쓰는 대역표입니다.
번역 절차와 주의점은 [handoff-i18n.md](handoff-i18n.md) 에 있습니다. 이 문서는
**말을 고정하는 것**만 합니다.

고정하는 이유는 둘입니다.

- **태그는 포털의 검색과 필터가 씁니다.** 같은 개념을 레슨마다 다르게 옮기면
  필터가 쪼개져 `constellation` 과 `constellations` 가 따로 뜹니다
- **레슨이 화면의 글자를 읽으라고 시킵니다.** "천체 정보의 거리를 보세요" 라고
  해 놓고 본문이 `light-years`, 화면이 `light years` 면 읽는 사람이 멈칫합니다

---

## 0. 문체

한국어판은 존댓말로 읽는 사람에게 말을 겁니다("~해 보세요", "보이나요?").
그 **톤**을 각 언어에서 자연스러운 방식으로 옮깁니다. 형태를 옮기는 것이
아닙니다.

| 언어 | 톤 | 예 |
|---|---|---|
| en | 평이한 2인칭 명령·권유. 영국식 철자 | "Look north." / "Can you see it?" |
| ja | です・ます체. 지시는 「〜てみましょう」 | 「北の空を見てみましょう。」 |
| es | **tú** 기준(usted 아님). 친근한 안내 | "Mira hacia el norte." / "¿Lo ves?" |

영어는 **영국식 철자**로 통일합니다(`colour`, `centre`, `analyse`). 이미
`learn.trackDesc.measure` 가 "brightness, colour and distance" 로 되어 있어
거기 맞춥니다.

### 지키는 서술 규칙

handoff-i18n 4.3 의 규칙입니다. **번역에서 되살아나기 쉬운 것**이라 여기 다시
적습니다.

| 쓰지 않음 | 씀 |
|---|---|
| "our ancestors", 「私たちの祖先」, "nuestros antepasados" | "in East Asia", "in Joseon-era Korea" |
| "in our country", "we can't see it here" | "at 37°N it never rises above the horizon" |
| 나라 이름으로 말하는 가시성 | **위도**로 말하는 가시성 |

한국 이야기는 **빼지 않습니다.** 누구의 이야기인지 밝혀 적을 뿐입니다.
그 언어권에 같은 자리를 두고 전해오는 이야기가 있으면 **보탭니다.**

---

## 1. 화면과 맞춰야 하는 말

레슨이 "화면의 이 줄을 보세요" 라고 시키는 것들입니다. **여기 있는 말은
번역자가 고르는 것이 아니라 화면에서 가져오는 것입니다.** 바꾸려면 본문이
아니라 `src/locales/<lang>.json` 을 바꿔야 합니다.

| ko | en | ja | es | 출처 |
|---|---|---|---|---|
| 광년 | light years | 光年 | años luz | `locales.light years` ※※ |
| 밝기 | Magnitude | 等級 | Magnitud | `locales.Magnitude` |
| 거리 | Distance | 距離 | Distancia | `locales.Distance` |
| 방위/고도 | Az/Alt | 方位/高度 | Az/Alt ※ | `locales.Az/Alt` |
| 별자리 | Constellations | 星座 | Constelaciones | `locales.Constellations` |
| 대기 | Atmosphere | 大気 | Atmósfera | `locales.Atmosphere` |
| 지형 | Landscape | 地上風景 | Paisaje | `locales.Landscape` |

※※ **이 키는 2026-08-22 에야 생겼습니다.** 그전까지 `selected-object-info.vue`
가 `$t('light years')` 를 부르는데 키가 네 언어 어디에도 없어, `formatFallbackMessages`
에 걸려 **한국어 화면에서도 `light years` 로 떴습니다.** 이 표는 그 사이에도 키가
있다고 적고 있었습니다. 화면 문구를 표에 올릴 때는 로케일 파일에 실제로 있는지
확인하고 올리세요.
| 은하수 | Milky Way | 天の川 | Vía Láctea | `locales.Milky Way` |
| 성운·성단·은하 | Deep Sky Objects | 星雲・星団・銀河 | Objetos de cielo profundo | `locales.Deep Sky Objects` |
| 지평 좌표 격자 | Azimuthal Grid | 地平座標グリッド | Rejilla azimutal | `locales.Azimuthal Grid` |
| 박명 | Twilight | 薄明 | Crepúsculo | `locales.Twilight` |
| '오늘 밤' 탭 | the **Tonight** tab | 「今夜」タブ | la pestaña **Esta noche** | `planner.tab` |

※ 표시한 칸은 그 로케일에 번역이 없어 화면에 영어가 그대로 뜹니다.
**본문에서 그 줄을 짚을 때는 화면에 뜨는 대로 적으세요.** 스페인어판에서
`Az/Alt` 를 "Acimut/Altura" 라고 적으면 화면과 어긋납니다. 로케일을 채우게
되면 본문도 같이 고쳐야 합니다.

**별자리 이름은 로케일에 없습니다.** 엔진이 라틴어/영어 이름을 그립니다.
그래서 한국어판이 "큰곰자리(Ursa Major)" 라고 쓰듯, **현지 이름 + 괄호에
화면에 뜨는 이름**을 씁니다.

- ja — 「おおぐま座（Ursa Major）」
- es — "la Osa Mayor (Ursa Major)"
- en — "Ursa Major" (그대로)

---

## 2. 태그 대역표 (67개)

**여기 없는 태그를 새로 만들지 마세요.** 새 태그가 필요하면 이 표에 먼저
추가하고 쓰세요.

### 대상·천체

| ko | en | ja | es |
|---|---|---|---|
| 북두칠성 | Big Dipper | 北斗七星 | el Carro |
| 북극성 | Polaris | 北極星 | Polaris |
| 안드로메다 | Andromeda | アンドロメダ | Andrómeda |
| 오리온 | Orion | オリオン | Orión |
| 아크투루스 | Arcturus | アークトゥルス | Arturo |
| 스피카 | Spica | スピカ | Spica |
| 알비레오 | Albireo | アルビレオ | Albireo |
| 알골 | Algol | アルゴル | Algol |
| 노인성 | Canopus | カノープス | Canopus |
| 좀생이별 | Seven Sisters | すばる | las Cabrillas |
| 달 | Moon | 月 | Luna |
| 행성 | planet | 惑星 | planeta |
| 혜성 | comet | 彗星 | cometa |
| 핼리 | Halley | ハレー | Halley |
| 은하 | galaxy | 銀河 | galaxia |
| 성운 | nebula | 星雲 | nebulosa |
| 산개성단 | open cluster | 散開星団 | cúmulo abierto |
| 변광성 | variable star | 変光星 | estrella variable |
| 식쌍성 | eclipsing binary | 食連星 | binaria eclipsante |
| 유성우 | meteor shower | 流星群 | lluvia de meteoros |
| 대삼각형 | Summer Triangle | 夏の大三角 | Triángulo de Verano |
| 은하수 | Milky Way | 天の川 | Vía Láctea |
| 별자리 | constellation | 星座 | constelación |
| 별의 탄생 | star formation | 星の誕生 | formación estelar |

`좀생이별` 은 플레이아데스의 한국 민간 이름입니다. 그래서 다른 언어에서도
**그 언어권의 민간 이름**으로 옮깁니다(학명 Pleiades 가 아니라). 이것이
4.3 의 "같은 자리를 두고 전해오는 이야기가 있으면 보탠다" 를 태그에서
지키는 방식입니다.

### 현상·원리

| ko | en | ja | es |
|---|---|---|---|
| 일식 | solar eclipse | 日食 | eclipse solar |
| 월식 | lunar eclipse | 月食 | eclipse lunar |
| 위상 | phases | 満ち欠け | fases |
| 달의 궤도 | lunar orbit | 月の軌道 | órbita lunar |
| 일주운동 | diurnal motion | 日周運動 | movimiento diurno |
| 세차운동 | precession | 歳差運動 | precesión |
| 고유운동 | proper motion | 固有運動 | movimiento propio |
| 역행 | retrograde | 逆行 | retrogradación |
| 충 | opposition | 衝 | oposición |
| 지구의 공전 | Earth's orbit | 地球の公転 | órbita de la Tierra |
| 계절 | seasons | 季節 | estaciones |
| 박명 | twilight | 薄明 | crepúsculo |
| 일몰 | sunset | 日の入り | puesta de sol |
| 복사점 | radiant | 放射点 | radiante |
| 천동설 | geocentrism | 天動説 | geocentrismo |

### 재는 것

| ko | en | ja | es |
|---|---|---|---|
| 등급 | magnitude | 等級 | magnitud |
| 밝기 | brightness | 明るさ | brillo |
| 거리 | distance | 距離 | distancia |
| 시차 | parallax | 年周視差 | paralaje |
| 광년 | light years | 光年 | años luz |
| 파섹 | parsec | パーセク | pársec |
| 색 | colour | 色 | color |
| 온도 | temperature | 温度 | temperatura |
| 분광형 | spectral type | スペクトル型 | tipo espectral |
| 위도 | latitude | 緯度 | latitud |
| 천구 북극 | north celestial pole | 天の北極 | polo norte celeste |

### 자리와 때

| ko | en | ja | es |
|---|---|---|---|
| 북쪽 하늘 | northern sky | 北の空 | cielo norte |
| 남반구 | southern hemisphere | 南半球 | hemisferio sur |
| 봄 | spring | 春 | primavera |
| 여름 | summer | 夏 | verano |
| 가을 | autumn | 秋 | otoño |
| 겨울 | winter | 冬 | invierno |
| 황도 12궁 | zodiac | 黄道十二宮 | zodíaco |

### 하는 일

| ko | en | ja | es |
|---|---|---|---|
| 관측 계획 | planning | 観測計画 | planificación |
| 관측 조건 | observing conditions | 観測条件 | condiciones de observación |
| 관측 기록 | observing log | 観測記録 | registro de observación |
| 별 짚어가기 | star hopping | 星をたどる | salto de estrellas |
| 시간여행 | time travel | 時間旅行 | viaje en el tiempo |
| 눈의 적응 | dark adaptation | 暗順応 | adaptación a la oscuridad |

### 동아시아

| ko | en | ja | es |
|---|---|---|---|
| 28수 | 28 mansions | 二十八宿 | 28 mansiones |
| 음력 | lunar calendar | 太陰暦 | calendario lunar |
| 세시풍속 | folk customs | 年中行事 | costumbres populares |
| 견우직녀 | the Weaver and the Cowherd | 織姫と彦星 | la Tejedora y el Vaquero ※ |

※ **스페인어에서 `el Boyero` 는 쓰지 마세요.** 목동자리(Boötes)의 표준
이름입니다. `seasons` · `star-brightness` · `star-colors` 가 그 뜻으로 쓰고
있어, 설화의 견우까지 `el Boyero` 로 옮기면 한 낱말이 두 천체를 가리키게 됩니다
(2026-08-22 검수에서 실제로 걸렸습니다 — `summer-triangle` 6 의
「El Boyero y la Tejedora se miran a través de la Vía Láctea」 는 목동자리로
읽으면 은하수 근처에 있지도 않은 별자리 이야기가 됩니다). 견우는 소를 모는
사람이므로 `el Vaquero` 가 뜻도 맞고 충돌도 없습니다.

---

## 3. 본문에 되풀이되는 말

태그가 아니라 문장 안에서 반복되는 것들입니다.

### 고유명사

| ko | en | ja | es |
|---|---|---|---|
| 천상열차분야지도 | Cheonsang Yeolcha Bunyajido | 天象列次分野之図 | Cheonsang Yeolcha Bunyajido |
| 조선왕조실록 | the Annals of the Joseon Dynasty | 朝鮮王朝実録 | los Anales de la Dinastía Joseon |
| 국제천문연맹(IAU) | the IAU | 国際天文学連合（IAU） | la UAI |
| 한국천문연구원 | KASI | 韓国天文研究院 | KASI |
| 성군 | asterism | アステリズム | asterismo |
| 국자 (북두칠성 전체) | the Dipper | ひしゃく | el Cazo |
| 국자의 몸통 | the bowl | ます | el cuenco ※ |

※ 스페인어 몸통을 `la cuchara`(숟가락)로 옮기면 `el cazo`(국자)와
나란히 놓였을 때 **서로 다른 물건 둘**로 읽힙니다. `big-dipper` 3 의
「siguiendo el cazo, del cuenco a la punta del mango」 가 그 자리입니다.
2026-08-22 에 `cuenco` 로 통일했습니다(10곳).

라틴 문자권(en·es)에서 한국 고유명사는 **로마자 표기 + 짧은 설명**을 붙입니다.
"Cheonsang Yeolcha Bunyajido, a Joseon star chart carved in stone" 처럼요.
일본어는 한자를 그대로 씁니다.

### 방향과 자리

레슨이 화면을 짚는 말입니다. **틀리면 글과 화면이 어긋납니다.**

| ko | en | ja | es |
|---|---|---|---|
| 화면 가운데 | the centre of the view | 画面の中央 | el centro de la vista |
| 왼쪽 위 | upper left | 左上 | arriba a la izquierda |
| 고도 | altitude | 高度 | altura |
| 방위 | azimuth | 方位 | acimut |
| 각거리 | angular distance | 角距離 | distancia angular |
| 시직경 | apparent diameter | 視直径 | diámetro aparente |
| 지평선 | the horizon | 地平線 | el horizonte |
| 천정 | the zenith | 天頂 | el cenit |
| 맨눈 | the naked eye | 肉眼 | a simple vista |
| 북위 37도 | 37°N | 北緯37度 | 37°N |

**위도는 `37°N` 형태로 씁니다.** 나라 이름으로 바꾸지 않습니다. 스페인어판
독자가 마드리드(40.4°N)라 해도 본문의 위도는 원문 그대로 둡니다.

### 지명

고정 관측지가 박힌 레슨(`latitude-sky`, `star-brightness` 5,
`twilight`, `eclipses` 6~7)에서 나옵니다. **이름은 옮기고 좌표는 그대로.**

| ko | en | ja | es |
|---|---|---|---|
| 서울 | Seoul | ソウル | Seúl |
| 제주 | Jeju | 済州 | Jeju |
| 시드니 | Sydney | シドニー | Sídney |
| 카디스 | Cádiz | カディス | Cádiz |
| 도쿄 | Tokyo | 東京 | Tokio |
| 마드리드 | Madrid | マドリード | Madrid |

---

## 4. 숫자

**어림하지 않습니다.** 본문의 고도·방위·시각·각거리·등급·거리는 전부 화면
엔진에서 재서 넣은 값입니다. 읽는 사람이 화면에서 바로 대조합니다.

- `123광년` → `123 light years` (`about 120` 아님)
- `1.8등급` → `magnitude 1.8`
- `01:20~02:30` → `01:20–02:30` (시각 표기는 24시간제 그대로)
- 소수점은 마침표를 씁니다. 스페인어에서도 `4.53` 으로 씁니다 —
  화면이 그렇게 뜨기 때문입니다
- **스페인어는 자릿수 구분 기호를 쓰지 않습니다**(`1400`, `26000`). 마침표를
  쓰면 소수점과 헷갈리고, 빈칸을 쓰면 숫자가 둘로 쪼개집니다. 화면도 구분
  기호 없이 뜹니다
- 일본어는 만·억을 씁니다(`2万6000光年`). 한자 수사(`一年`, `二十八宿`)는
  자연스러운 자리에 그대로 쓰되, **실측값에는 아라비아 숫자**를 씁니다

`node tools/check-lesson-parity.mjs <lang> <id>` 가 원문과 숫자 집합을
대조해 경고합니다. 경고가 뜨면 **하나하나 이유를 댈 수 있어야 합니다.**
"4월" → "April" 처럼 숫자가 말이 되어 사라지는 것은 정상입니다.

---

## 5. 새 말이 필요할 때

1. 이 문서의 표에 먼저 넣습니다
2. 이미 옮긴 레슨에 같은 개념이 다른 말로 들어가 있지 않은지 봅니다
3. 태그라면 `node tools/make-lesson-index.mjs <lang>` 을 돌려 포털 필터에
   어떻게 뜨는지 확인합니다
