// 별무리 관측 플래너 - 기상 예보
//
// 기상청 단기예보를 Pages Function 프록시(/api/forecast)를 통해 받는다.
// 브라우저에서 기상청을 직접 부르면 API 키가 노출되므로 프록시를 거친다.
// functions/api/forecast.js 참고.

// 하늘상태(SKY) 별 관측 적합도. 구름은 관측의 성패를 가르는 요소라
// 흐림과 맑음의 차이를 크게 벌려둔다.
const SKY_SCORE = { 1: 1.0, 3: 0.45, 4: 0.1 }

// 이 모듈은 번역문을 만들지 않는다. 화면이 $t() 로 옮기도록 키만 돌려준다.
const SKY_KEY = { 1: 'planner.skyClear', 3: 'planner.skyCloudy', 4: 'planner.skyOvercast' }
const PTY_KEY = {
  0: '',
  1: 'planner.ptyRain',
  2: 'planner.ptyRainSnow',
  3: 'planner.ptySnow',
  4: 'planner.ptyShower',
  5: 'planner.ptyDrizzle',
  6: 'planner.ptySleet',
  7: 'planner.ptySnowFlurry'
}

// 기상청 예보 시각은 KST 기준 "YYYYMMDDHH" 문자열이다.
function kstHourToDate (s) {
  const y = Number(s.slice(0, 4))
  const m = Number(s.slice(4, 6))
  const d = Number(s.slice(6, 8))
  const h = Number(s.slice(8, 10))
  return new Date(Date.UTC(y, m - 1, d, h) - 9 * 3600 * 1000)
}

export function fetchForecast (lat, lon) {
  const url = process.env.BASE_URL + 'api/forecast?lat=' +
    lat.toFixed(4) + '&lon=' + lon.toFixed(4)
  return fetch(url).then(res => {
    if (!res.ok) throw new Error('forecast HTTP ' + res.status)
    return res.json()
  })
}

/*
 * 예보를 밤 시간대에 맞춰 요약한다.
 *
 * 반환: { hours: [...], score, text, cloudiest } 또는 null
 *   score 0(관측 불가) ~ 1(완전 맑음)
 */
export function summarize (forecast, night) {
  if (!forecast || !forecast.supported || !forecast.hours || !night) return null
  const from = night.duskEnd !== null ? night.duskEnd : night.sunset
  const to = night.dawnStart !== null ? night.dawnStart : night.sunrise
  if (from === null || to === null) return null

  // MJD -> Date. sw_helpers 의 setMJD 와 같은 변환이다.
  const toDate = (mjd) => new Date((mjd + 2400000.5 - 2440587.5) * 86400000)
  const fromT = toDate(from).getTime()
  const toT = toDate(to).getTime()

  const inWindow = forecast.hours.filter(h => {
    const t = kstHourToDate(h.time).getTime()
    return t >= fromT - 3600000 && t <= toT
  })
  if (!inWindow.length) return null

  let sum = 0
  let rain = false
  for (const h of inWindow) {
    const sky = SKY_SCORE[h.sky] !== undefined ? SKY_SCORE[h.sky] : 0.45
    // 비나 눈이 오면 관측은 불가능하다. 평균에 묻히지 않도록 따로 표시한다.
    if (h.pty) rain = true
    sum += h.pty ? 0 : sky
  }
  const score = sum / inWindow.length

  let key
  if (rain) key = 'planner.skyRain'
  else if (score >= 0.85) key = 'planner.skyClear'
  else if (score >= 0.55) key = 'planner.skyMostlyClear'
  else if (score >= 0.3) key = 'planner.skyCloudy'
  else key = 'planner.skyOvercast'

  return {
    hours: inWindow,
    score: score,
    textKey: key,
    rain: rain,
    // 시간대별 하늘 상태 (타임라인 표시용)
    timeline: inWindow.map(h => ({
      hour: Number(h.time.slice(8, 10)),
      sky: h.sky,
      pty: h.pty,
      labelKey: (PTY_KEY[h.pty] || SKY_KEY[h.sky] || '')
    }))
  }
}

/*
 * 오늘 밤 전체 관측 지수. 구름이 가장 중요하고 그 다음이 달이다.
 * 어두운 시간이 아예 없으면 0.
 */
export function observingScore (night, moon, weather) {
  if (!night || !night.darkHours) return { score: 0, textKey: 'planner.impossible' }
  const moonScore = moon ? 1 - moon.interference : 1
  let score
  if (weather) {
    score = weather.score * 0.65 + moonScore * 0.35
  } else {
    // 예보가 없으면 달만 보고 판단한다. 구름을 모른다는 사실을 감춰선 안 되므로
    // 문구에서 '달 기준'임을 밝힌다.
    score = moonScore
  }
  let key
  if (score >= 0.7) key = 'planner.good'
  else if (score >= 0.45) key = 'planner.fair'
  else if (score >= 0.2) key = 'planner.poor'
  else key = 'planner.bad'
  return { score: score, textKey: key, weatherKnown: !!weather }
}

export default { fetchForecast, summarize, observingScore, SKY_KEY, PTY_KEY }
