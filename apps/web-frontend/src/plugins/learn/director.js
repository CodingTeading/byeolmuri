// 별무리 학습 - 디렉터
//
// 레슨의 한 단계(step)를 받아 하늘을 그 상태로 만든다.
// 천문대에서 선생님이 "자, 이제 북쪽을 봅시다" 하면 돔이 돌아가는 것과 같다.
//
// 원칙: step 에 적힌 것만 바꾼다. 없는 항목은 이전 단계의 상태를 유지한다.
// 그래야 레슨 JSON 이 "이번에 달라지는 것"만 적으면 되고, 읽는 사람도
// 무엇이 바뀌는지 한눈에 안다.

import Moment from 'moment'

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
  const deadline = Date.now() + (timeoutMs || 6000)
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
 * step.sky  { date, lat, lng, elev, az, alt, fov, timeSpeed }
 * step.show { 위 TOGGLES 의 키: true/false }
 * step.lookAt  천체 이름 — 그쪽으로 시야를 옮기고 따라간다
 * step.select  천체 이름 — 선택해서 정보를 띄운다
 */
export async function apply (stel, step) {
  if (!stel || !step) return
  const sky = step.sky || {}
  const obs = stel.core.observer

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

/*
 * 레슨을 떠날 때 하늘을 평소 상태로 되돌린다.
 * 레슨이 대기를 끄고 시간을 300배로 돌려놨는데 그대로 두면
 * 사용자는 앱이 고장난 줄 안다.
 */
export function reset (stel) {
  if (!stel) return
  stel.core.time_speed = 1
  clearTarget(stel)
  const defaults = {
    constellationLines: false,
    constellationArt: false,
    constellationLabels: false,
    onlyPointedConstellation: false,
    atmosphere: true,
    landscape: true,
    azimuthalGrid: false,
    equatorialGrid: false,
    dso: true,
    milkyway: true
  }
  for (const key of Object.keys(defaults)) {
    setPath(stel.core, TOGGLES[key], defaults[key])
  }
}

export default { apply, reset, findObj, TOGGLES }
