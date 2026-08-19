// 별무리 - 기상청 단기예보 프록시 (Cloudflare Pages Function)
//
// 왜 프록시를 두는가:
//   1. API 키를 감춘다. 정적 사이트에 키를 넣으면 번들에 그대로 노출되어
//      누구나 우리 일일 할당량을 소진시킬 수 있다.
//   2. 캐시한다. 단기예보는 하루 8번(02,05,08,11,14,17,20,23시)만 갱신되므로
//      같은 격자에 대한 요청은 한 번만 기상청에 보내면 된다. 공개 API 에
//      불필요한 부하를 주지 않는 것이 예의이기도 하다.
//
// 키는 Pages 환경변수 KMA_API_KEY 에 둔다. 저장소에는 넣지 않는다.

const ENDPOINT =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'

// 기상청 격자는 람베르트 정각원추도법이다. 아래 상수는 기상청 배포 코드 그대로.
function toGrid (lat, lon) {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0
  const OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136
  const DEGRAD = Math.PI / 180.0
  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD, olat = OLAT * DEGRAD
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) /
           Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = re * sf / Math.pow(ro, sn)
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5)
  ra = re * sf / Math.pow(ra, sn)
  let theta = lon * DEGRAD - olon
  if (theta > Math.PI) theta -= 2 * Math.PI
  if (theta < -Math.PI) theta += 2 * Math.PI
  theta *= sn
  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)
  }
}

// 발표 시각은 3시간 간격이고 실제 제공까지 10분쯤 걸린다.
// 45분 여유를 두고 확실히 나와 있는 회차를 고른다.
function baseSlot (now) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const slots = [2, 5, 8, 11, 14, 17, 20, 23]
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes()
  let pick = null
  for (const h of slots) {
    if (minutes >= h * 60 + 45) pick = h
  }
  if (pick === null) {
    kst.setUTCDate(kst.getUTCDate() - 1)
    pick = 23
  }
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return {
    baseDate: `${y}${m}${d}`,
    baseTime: String(pick).padStart(2, '0') + '00'
  }
}

export async function onRequestGet (context) {
  const { request, env } = context
  const url = new URL(request.url)
  const lat = parseFloat(url.searchParams.get('lat'))
  const lon = parseFloat(url.searchParams.get('lon'))

  const json = (body, status) => new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=1800'
    }
  })

  if (!isFinite(lat) || !isFinite(lon)) {
    return json({ error: 'lat, lon 파라미터가 필요합니다' }, 400)
  }
  if (!env.KMA_API_KEY) {
    return json({ error: '서버에 기상청 API 키가 설정되지 않았습니다' }, 503)
  }

  const grid = toGrid(lat, lon)
  // 기상청 격자를 벗어나면 예보가 없다. 한반도 밖에서는 조용히 미지원 처리.
  if (grid.nx < 1 || grid.nx > 149 || grid.ny < 1 || grid.ny > 253) {
    return json({ supported: false, reason: '기상청 예보 범위 밖입니다' })
  }

  const slot = baseSlot(new Date())
  const cache = caches.default
  const cacheKey = new Request(
    `${url.origin}/api/forecast?nx=${grid.nx}&ny=${grid.ny}` +
    `&b=${slot.baseDate}${slot.baseTime}`, { method: 'GET' })

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const target = `${ENDPOINT}?serviceKey=${env.KMA_API_KEY}` +
    `&pageNo=1&numOfRows=1000&dataType=JSON` +
    `&base_date=${slot.baseDate}&base_time=${slot.baseTime}` +
    `&nx=${grid.nx}&ny=${grid.ny}`

  let payload
  try {
    const res = await fetch(target)
    payload = await res.json()
  } catch (e) {
    return json({ error: '기상청 응답을 읽지 못했습니다' }, 502)
  }

  const header = payload && payload.response && payload.response.header
  if (!header || header.resultCode !== '00') {
    return json({
      error: '기상청 오류: ' + ((header && header.resultMsg) || 'unknown')
    }, 502)
  }

  // 필요한 항목만 시각별로 모은다.
  //   SKY 하늘상태 1맑음 3구름많음 4흐림
  //   PTY 강수형태 0없음 1비 2비/눈 3눈 4소나기
  //   POP 강수확률(%), TMP 기온(℃), REH 습도(%)
  const wanted = { SKY: 'sky', PTY: 'pty', POP: 'pop', TMP: 'tmp', REH: 'reh' }
  const byTime = {}
  for (const item of payload.response.body.items.item) {
    const key = wanted[item.category]
    if (!key) continue
    const t = item.fcstDate + item.fcstTime.slice(0, 2)
    if (!byTime[t]) byTime[t] = { time: t }
    byTime[t][key] = Number(item.fcstValue)
  }

  const out = json({
    supported: true,
    grid: grid,
    baseDate: slot.baseDate,
    baseTime: slot.baseTime,
    hours: Object.keys(byTime).sort().map(k => byTime[k])
  })
  context.waitUntil(cache.put(cacheKey, out.clone()))
  return out
}
