// 별무리 관측 플래너 - 천문 계산
//
// 관측 계획에 필요한 정밀도는 '분' 단위면 충분하다. 따라서 태양/달처럼
// 정확한 궤도 계산이 필요한 천체는 엔진에 맡기고, 수백 개의 관측 대상은
// 적경/적위에서 해석적으로 고도를 구한다. 대상마다 시간을 샘플링하며
// 엔진을 호출하면 수천 번의 WASM 왕복이 생겨 UI 가 멈춘다.

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

// 하루를 5분 단위로 훑는다. 박명 시각을 분 단위로 잡기에 충분하다.
const STEP_MIN = 5
const STEP = 1 / (24 * 60 / STEP_MIN)

// 태양 고도 기준. -18°가 천문박명으로, 이때부터 하늘이 완전히 어둡다.
export const HORIZON = -0.833 * D2R // 대기굴절과 태양 반지름 보정
export const TWILIGHT_ASTRO = -18 * D2R

/*
 * 엔진으로 특정 시각의 천체 고도를 구한다 (라디안).
 * sw_helpers 의 getTimeAfterSunset 이 쓰는 것과 같은 경로다.
 */
export function altitudeAt (stel, obj, obs, mjd) {
  obs.utc = mjd
  const radec = obj.getInfo('RADEC', obs)
  const azalt = stel.convertFrame(obs, 'ICRF', 'OBSERVED', radec)
  return stel.anpm(stel.c2s(azalt)[1])
}

/*
 * 태양 고도가 threshold 를 지나는 시각을 찾는다.
 * direction: -1 이면 내려가는 순간(일몰/박명 시작), +1 이면 올라가는 순간.
 * 못 찾으면 null (백야, 극야 등).
 */
function findSunCrossing (stel, obs, from, to, threshold, direction) {
  const sun = stel.getObj('NAME Sun')
  if (!sun) return null
  let prev = altitudeAt(stel, sun, obs, from)
  for (let t = from + STEP; t <= to; t += STEP) {
    const alt = altitudeAt(stel, sun, obs, t)
    const crossed = direction < 0
      ? (prev >= threshold && alt < threshold)
      : (prev < threshold && alt >= threshold)
    if (crossed) {
      // 5분 구간을 이분법으로 좁혀 분 단위까지 맞춘다.
      let lo = t - STEP
      let hi = t
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2
        const a = altitudeAt(stel, sun, obs, mid)
        if ((a < threshold) === (direction < 0)) hi = mid
        else lo = mid
      }
      return (lo + hi) / 2
    }
    prev = alt
  }
  return null
}

/*
 * '오늘 밤'의 구간을 구한다. 기준 시각 이후 처음 오는 밤이다.
 *
 * 반환: { sunset, duskEnd, dawnStart, sunrise, darkHours }
 *       duskEnd ~ dawnStart 가 천문박명 밖의 진짜 어두운 시간이다.
 */
export function findNight (stel, fromMjd) {
  const obs = stel.observer.clone()
  const start = fromMjd !== undefined ? fromMjd : stel.observer.utc
  try {
    const sunset = findSunCrossing(stel, obs, start, start + 1, HORIZON, -1)
    if (sunset === null) return null
    const duskEnd = findSunCrossing(stel, obs, sunset, sunset + 0.5, TWILIGHT_ASTRO, -1)
    const dawnStart = findSunCrossing(stel, obs, duskEnd || sunset,
      (duskEnd || sunset) + 0.75, TWILIGHT_ASTRO, 1)
    const sunrise = findSunCrossing(stel, obs, dawnStart || sunset,
      (dawnStart || sunset) + 0.5, HORIZON, 1)
    const darkHours = (duskEnd !== null && dawnStart !== null)
      ? (dawnStart - duskEnd) * 24 : 0
    return { sunset, duskEnd, dawnStart, sunrise, darkHours }
  } finally {
    obs.destroy && obs.destroy()
  }
}

/*
 * 달 정보. 위상은 태양-달 이각에서 구한 조명 비율(0~1)이다.
 */
export function moonInfo (stel, night) {
  const moon = stel.getObj('NAME Moon')
  if (!moon || !night) return null
  const obs = stel.observer.clone()
  try {
    const mid = night.duskEnd !== null && night.dawnStart !== null
      ? (night.duskEnd + night.dawnStart) / 2 : night.sunset
    obs.utc = mid
    const phase = moon.getInfo('phase', obs)
    const illum = typeof phase === 'number' ? phase : 0

    // 어두운 시간대에 달이 떠 있는 비율을 구한다. 실제 방해 정도는
    // '달이 떠 있는가' 보다 '얼마나 밝은 달이 얼마나 오래 떠 있는가' 이다.
    let up = 0
    let total = 0
    const from = night.duskEnd !== null ? night.duskEnd : night.sunset
    const to = night.dawnStart !== null ? night.dawnStart : night.sunrise
    if (from !== null && to !== null) {
      for (let t = from; t <= to; t += STEP) {
        total++
        if (altitudeAt(stel, moon, obs, t) > 0) up++
      }
    }
    const upFraction = total ? up / total : 0
    return {
      illumination: illum,
      upFraction: upFraction,
      // 0(방해 없음) ~ 1(보름달이 밤새 떠 있음)
      interference: illum * upFraction
    }
  } finally {
    obs.destroy && obs.destroy()
  }
}

/*
 * 그리니치 평균 항성시 (라디안).
 * IAU 1982 근사식. 계획용으로는 초 단위 오차도 무의미하다.
 */
export function gmst (mjdUt1) {
  const d = mjdUt1 - 51544.5
  const t = d / 36525
  let h = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t
  h = ((h % 360) + 360) % 360
  return h * D2R
}

/*
 * 적경/적위와 관측지에서 특정 시각의 고도를 구한다 (라디안).
 * 대기굴절은 무시한다. 관측 대상 선정에는 영향이 없다.
 */
export function altitudeOf (ra, dec, lat, lon, mjd) {
  const ha = gmst(mjd) + lon - ra
  return Math.asin(
    Math.sin(lat) * Math.sin(dec) +
    Math.cos(lat) * Math.cos(dec) * Math.cos(ha))
}

/*
 * 남중(자오선 통과) 시각. 주어진 시각 이후 처음 오는 남중이다.
 */
export function transitTime (ra, lon, mjd) {
  // 항성일 기준으로 시간각이 0 이 되는 시점
  let ha = gmst(mjd) + lon - ra
  ha = ((ha % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const toGo = (2 * Math.PI - ha) / (2 * Math.PI) * 0.9972695663
  return mjd + toGo
}

/*
 * 밤 시간대 동안 대상의 관측 조건을 계산한다.
 *
 * 반환: { maxAlt, bestTime, aboveMinutes } (고도는 라디안)
 */
export function visibility (ra, dec, lat, lon, night, minAlt) {
  const from = night.duskEnd !== null ? night.duskEnd : night.sunset
  const to = night.dawnStart !== null ? night.dawnStart : night.sunrise
  if (from === null || to === null) return null
  let maxAlt = -Math.PI
  let bestTime = from
  let above = 0
  for (let t = from; t <= to; t += STEP) {
    const alt = altitudeOf(ra, dec, lat, lon, t)
    if (alt > maxAlt) {
      maxAlt = alt
      bestTime = t
    }
    if (alt >= minAlt) above += STEP_MIN
  }
  return { maxAlt: maxAlt, bestTime: bestTime, aboveMinutes: above }
}

export default {
  HORIZON, TWILIGHT_ASTRO, altitudeAt, findNight, moonInfo,
  gmst, altitudeOf, transitTime, visibility
}
