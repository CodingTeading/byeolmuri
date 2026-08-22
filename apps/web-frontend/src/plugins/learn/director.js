// 별무리 학습 - 디렉터
//
// 레슨의 한 단계(step)를 받아 하늘을 그 상태로 만든다.
// 천문대에서 선생님이 "자, 이제 북쪽을 봅시다" 하면 돔이 돌아가는 것과 같다.
//
// 원칙: step 에 적힌 것만 바꾼다. 없는 항목은 이전 단계의 상태를 유지한다.
// 그래야 레슨 JSON 이 "이번에 달라지는 것"만 적으면 되고, 읽는 사람도
// 무엇이 바뀌는지 한눈에 안다.

import Moment from 'moment'
import skyBrightness from '@/assets/sky-brightness.js'

const D2R = Math.PI / 180

// show 항목 이름 → 엔진 속성 경로.
// 레슨 JSON 이 엔진 내부 이름을 알 필요가 없도록 한 겹 둔다.
const TOGGLES = {
  constellationLines: 'constellations.lines_visible',
  constellationLabels: 'constellations.labels_visible',
  constellationArt: 'constellations.images_visible',
  constellationBounds: 'constellations.bounds_visible',
  onlyPointedConstellation: 'constellations.show_only_pointed',
  atmosphere: 'atmosphere.visible',
  landscape: 'landscapes.visible',
  azimuthalGrid: 'lines.azimuthal.visible',
  equatorialGrid: 'lines.equatorial_jnow.visible',
  meridian: 'lines.meridian.visible',
  ecliptic: 'lines.ecliptic.visible',
  dso: 'dsos.visible',
  milkyway: 'milkyway.visible',
  dss: 'dss.visible',
  stars: 'stars.visible'
}

function setPath (root, path, value) {
  const parts = path.split('.')
  let node = root
  for (let i = 0; i < parts.length - 1; i++) {
    node = node[parts[i]]
    if (!node) return false
  }
  node[parts[parts.length - 1]] = value
  return true
}

/*
 * 선택과 카메라 잠금을 함께 푼다.
 *
 * 주의: 엔진의 객체형 속성은 null 을 넣으면 무시된다. 0 을 넣어야 비워진다.
 * (core.selection = null 은 아무 일도 일어나지 않는다. 실측으로 확인)
 * 그리고 pointAndLock 이 걸어둔 core.lock 까지 풀지 않으면 화면이 계속
 * 그 천체를 따라다닌다.
 */
function clearTarget (stel) {
  stel.core.lock = 0
  stel.core.selection = 0
}

/*
 * 천체를 이름으로 찾는다. 엔진은 HiPS 타일을 비동기로 받으므로
 * 레슨을 열자마자 찾으면 아직 없을 수 있다. 잠깐 기다렸다 다시 본다.
 */
export function findObj (stel, name, timeoutMs) {
  // 12초. 6초로는 레슨을 열자마자 첫 단계에서 놓치는 일이 있었다.
  // 타일은 화면이 그려지면서 도착하므로 회선이 느리면 더 걸린다.
  const deadline = Date.now() + (timeoutMs || 12000)
  return new Promise(resolve => {
    const attempt = () => {
      let obj = null
      try { obj = stel.getObj(name) } catch (e) { obj = null }
      if (obj || Date.now() > deadline) { resolve(obj); return }
      setTimeout(attempt, 200)
    }
    attempt()
  })
}

/*
 * 한 단계를 하늘에 적용한다.
 *
 * step.sky  { date, lat, lng, elev, az, alt, fov, timeSpeed, home }
 * step.show { 위 TOGGLES 의 키: true/false }
 * step.lookAt  천체 이름 — 그쪽으로 시야를 옮기고 따라간다
 * step.select  천체 이름 — 선택해서 정보를 띄운다
 *
 * home 은 앱이 아는 관측지($store.state.currentLocation)다. 레슨이 관측지를
 * 옮겨 놓은 뒤 "다시 계신 곳으로" 돌아오려면 그 값이 필요하다. 레슨 JSON 은
 * 사용자가 어디 사는지 모르므로 sky.home 을 true 로 적기만 하면 된다.
 */
export async function apply (stel, step, home) {
  if (!stel || !step) return
  const sky = step.sky || {}
  const obs = stel.core.observer
  capture(stel)

  // 마지막 단계는 사용자가 사는 곳의 하늘이어야 한다. 밖에 나가 확인하라는
  // 마무리를 남의 동네 하늘 위에서 할 수는 없다.
  if (sky.home && home && home.lat !== undefined) {
    obs.latitude = home.lat * D2R
    obs.longitude = home.lng * D2R
    if (home.alt !== undefined) obs.elevation = home.alt
  }

  if (sky.date) {
    const d = new Date()
    d.setTime(new Moment(sky.date).toDate().getTime())
    obs.utc = d.getMJD()
  }
  if (sky.lat !== undefined) obs.latitude = sky.lat * D2R
  if (sky.lng !== undefined) obs.longitude = sky.lng * D2R
  if (sky.elev !== undefined) obs.elevation = sky.elev
  if (sky.fov !== undefined) stel.core.fov = sky.fov * D2R
  if (sky.timeSpeed !== undefined) stel.core.time_speed = sky.timeSpeed

  if (step.show) {
    for (const key of Object.keys(step.show)) {
      const path = TOGGLES[key]
      if (!path) {
        console.warn('[learn] 알 수 없는 표시 항목: ' + key)
        continue
      }
      setPath(stel.core, path, !!step.show[key])
    }
  }

  // 방위/고도를 직접 준 경우. lookAt 이 있으면 그쪽이 이긴다.
  if (!step.lookAt && (sky.az !== undefined || sky.alt !== undefined)) {
    clearTarget(stel)
    if (sky.az !== undefined) obs.yaw = sky.az * D2R
    if (sky.alt !== undefined) obs.pitch = sky.alt * D2R
  }

  if (step.lookAt) {
    const obj = await findObj(stel, step.lookAt)
    if (obj) stel.pointAndLock(obj)
    else console.warn('[learn] 찾을 수 없는 천체: ' + step.lookAt)
  }

  if (step.select) {
    const obj = await findObj(stel, step.select)
    if (obj) {
      stel.core.selection = obj
      if (!step.lookAt) stel.pointAndLock(obj)
    } else {
      console.warn('[learn] 찾을 수 없는 천체: ' + step.select)
    }
  } else if (step.clearSelection) {
    clearTarget(stel)
  }
}

// 레슨에 들어오기 직전의 하늘. 나갈 때 여기로 되돌린다.
let saved = null

/*
 * 레슨이 손대기 전의 상태를 적어 둔다. 첫 단계에서 한 번만.
 *
 * 위치까지 적어 두는 이유가 있다. 위도를 비교하는 레슨은 관측지를 적도나
 * 남반구로 옮기는데, 되돌리지 않으면 레슨을 나간 뒤에도 하늘이 남의 동네
 * 하늘로 남는다. 관측지는 앱이 시작할 때 한 번만 정하므로 저절로 돌아오지
 * 않는다. 시각도 마찬가지다. 1월로 옮겨 놓고 나가면 '오늘 밤'이 1월이 된다.
 */
function capture (stel) {
  if (saved) return
  const obs = stel.core.observer
  const shows = {}
  for (const key of Object.keys(TOGGLES)) {
    const parts = TOGGLES[key].split('.')
    let node = stel.core
    for (let i = 0; i < parts.length - 1 && node; i++) node = node[parts[i]]
    if (node) shows[key] = !!node[parts[parts.length - 1]]
  }
  // 레슨이 도는 동안에는 사용자가 고른 하늘 밝기를 잠시 밀어 둔다.
  // 레슨 본문의 "은하수가 삼각형을 가로지릅니다" 같은 문장은 어두운
  // 하늘을 보고 쓴 것이라, 도시 하늘 위에서는 헛말이 된다. 나갈 때
  // reset 이 사용자 설정으로 되돌린다.
  stel.core.bortle_index = skyBrightness.LESSON_BORTLE
  saved = {
    latitude: obs.latitude,
    longitude: obs.longitude,
    elevation: obs.elevation,
    utc: obs.utc,
    timeSpeed: stel.core.time_speed,
    fov: stel.core.fov,
    shows: shows,
    capturedAt: Date.now()
  }
}

/*
 * 레슨을 떠날 때 하늘을 들어오기 전 상태로 되돌린다.
 * 레슨이 대기를 끄고 시간을 400배로 돌려놨는데 그대로 두면
 * 사용자는 앱이 고장난 줄 안다.
 *
 * 시각은 흘러간 만큼 앞으로 당겨 놓는다. 레슨을 10분 읽었으면 하늘도
 * 10분 흘러 있어야 '지금 하늘'이다.
 *
 * location 은 앱이 아는 관측지($store.state.currentLocation)다. 이것을
 * 받는 이유가 있다. 앱은 위치를 감지한 뒤 엔진에 써 넣는데, 레슨이
 * 그보다 먼저 열리면 capture 가 엔진의 초기 기본값(대만)을 적어 둔다.
 * 그대로 되돌리면 레슨을 나온 사용자가 남의 나라 하늘을 보게 된다.
 * 위치의 주인은 엔진이 아니라 앱이므로 앱에게 물어본다.
 */
export function reset (stel, location) {
  if (!stel) return
  clearTarget(stel)
  // 하늘 밝기는 붙잡아 둔 값이 아니라 저장된 설정에서 되돌린다.
  // 관측지와 같은 이유다 — 이 값의 주인은 엔진이 아니라 앱이고,
  // 레슨을 읽는 도중에 설정을 바꿨을 수도 있다.
  skyBrightness.applyTo(stel, skyBrightness.load())
  if (!saved) {
    stel.core.time_speed = 1
    return
  }
  const obs = stel.core.observer
  if (location && location.lat !== undefined && location.lng !== undefined) {
    obs.latitude = location.lat * D2R
    obs.longitude = location.lng * D2R
    if (location.alt !== undefined) obs.elevation = location.alt
  } else {
    obs.latitude = saved.latitude
    obs.longitude = saved.longitude
    obs.elevation = saved.elevation
  }
  // 시간이 흐르고 있었다면 레슨을 읽은 만큼 앞으로 당겨 둔다.
  // 그래야 나갔을 때 '지금 하늘'이지 레슨을 열던 시각의 하늘이 아니다.
  const elapsed = saved.timeSpeed ? (Date.now() - saved.capturedAt) / 86400000 : 0
  obs.utc = saved.utc + elapsed * saved.timeSpeed
  stel.core.time_speed = saved.timeSpeed
  stel.core.fov = saved.fov
  for (const key of Object.keys(saved.shows)) {
    setPath(stel.core, TOGGLES[key], saved.shows[key])
  }
  saved = null
}

export default { apply, reset, findObj, TOGGLES }
