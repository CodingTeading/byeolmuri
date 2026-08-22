// 하늘 밝기(광공해) 설정.
//
// 엔진의 core.bortle_index 를 사람의 말로 감싼 것이다. 이 값 하나가 엔진
// 안에서 세 군데를 동시에 바꾼다.
//
//   - 별 점의 반지름   (src/core.c 의 core_get_point_for_mag_)
//   - 대기의 광공해 밝기 (src/modules/atmosphere.c)
//   - 겹쳐 보는 사진의 세기 (src/modules/dss.c)
//
// 그래서 값을 올리면 어두운 별이 사라지고 배경이 밝아진다. 도시 하늘이
// 그렇게 보이는 이유와 같은 순서다.
//
// 왜 필요한가. 엔진 기본값이 3, 곧 시골 하늘이다. 도시에 사는 사람은
// 자기가 결코 볼 수 없는 하늘을 화면으로 보면서 레슨의 "밖에 나가 찾아
// 보세요"를 읽게 된다. 나가서 못 찾고, 자기가 뭘 잘못했다고 생각한다.

const STORAGE_KEY = 'byeolmuri.bortle'

// 엔진 기본값이자 레슨이 쓰는 값. 레슨 본문의 "은하수가 가로지릅니다",
// "6등급까지 셀 수 있습니다" 같은 문장은 전부 이 하늘을 보고 쓰였다.
// 그래서 레슨이 도는 동안에는 사용자 설정과 상관없이 이 값을 쓴다.
export const LESSON_BORTLE = 3

export const DEFAULT_BORTLE = LESSON_BORTLE

// 보틀 등급 1~9 를 다섯 자리로 추린 것. 아홉 단계를 그대로 내놓으면
// 고르는 사람이 자기가 어디인지 판단할 수 없다.
export const LEVELS = [
  { key: 'downtown', bortle: 9 },
  { key: 'city', bortle: 7 },
  { key: 'suburb', bortle: 5 },
  { key: 'country', bortle: 3 },
  { key: 'dark', bortle: 1 }
]

export function isValid (b) {
  return Number.isInteger(b) && b >= 1 && b <= 9
}

export function load () {
  let raw = null
  try { raw = window.localStorage.getItem(STORAGE_KEY) } catch (e) { raw = null }
  const b = parseInt(raw, 10)
  return isValid(b) ? b : DEFAULT_BORTLE
}

export function save (b) {
  if (!isValid(b)) return
  try { window.localStorage.setItem(STORAGE_KEY, String(b)) } catch (e) {}
}

// 엔진에 써 넣는다. 엔진이 아직 없으면 아무 일도 하지 않는다.
export function applyTo (stel, b) {
  if (!stel || !isValid(b)) return
  stel.core.bortle_index = b
}

export default { LEVELS, LESSON_BORTLE, DEFAULT_BORTLE, isValid, load, save, applyTo }
