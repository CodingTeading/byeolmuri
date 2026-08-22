// 이번 달 볼거리 — 앞으로 두 달 사이에 일어나는 일을 모은다.
//
// 레슨은 일부러 연도를 쓰지 않는다. 별자리는 해마다 같은 자리에 오므로
// "8월에 남쪽 하늘" 이면 충분하고, 연도를 박으면 이듬해에 거짓말이 된다.
// 그 대가로 "그래서 언제" 가 비어 있었다. 「오늘 밤」 탭은 오늘만 보고,
// 레슨은 아무 날에나 맞으니 그 사이가 없다. 이 파일이 그 사이를 채운다.
//
// 엔진 계산에 기댄다. 엔진의 calendar API 는 쓸 수 없다 — JS 쪽 껍데기는
// 남아 있지만 이 저장소의 WASM 에는 calendar 심벌이 없다(확인함). 그래서
// 태양·달·행성의 위치를 직접 훑어 극값과 교차를 찾는다.
//
// **날짜만 낸다. 시각은 내지 않는다.** getInfo('RADEC') 이 지심이 아니라
// 지평 기준이라 달의 시차가 그대로 들어간다. 두 관측지에서 1.4도까지
// 벌어지는 것을 실측했고, 달은 한 시간에 0.5도쯤 움직이니 위상 시각이
// 두 시간까지 어긋날 수 있다. 날짜는 그래도 맞는다. 맞지 않는 값을
// 그럴듯하게 적느니 내지 않는 편이 낫다.

const R2D = 180 / Math.PI

// 훑는 간격. 달은 하루에 13도를 움직여 촘촘히 봐야 하고, 행성은 느리다.
const STEP_MOON = 0.25
const STEP_PLANET = 1

// 이 안으로 들어오면 "가까워진다" 고 본다. 팔을 뻗은 주먹이 10도쯤이니
// 4도는 손가락 두 개 폭이다. 한눈에 둘이 짝지어 보이는 거리다.
const CONJ_MAX = 4

const PLANETS = [
  { id: 'NAME Mercury', key: 'mercury', inner: true },
  { id: 'NAME Venus', key: 'venus', inner: true },
  { id: 'NAME Mars', key: 'mars', inner: false },
  { id: 'NAME Jupiter', key: 'jupiter', inner: false },
  { id: 'NAME Saturn', key: 'saturn', inner: false }
]

function sep (a, b) {
  const na = Math.hypot(a[0], a[1], a[2])
  const nb = Math.hypot(b[0], b[1], b[2])
  if (!na || !nb) return 0
  const d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb)
  return Math.acos(Math.max(-1, Math.min(1, d))) * R2D
}

function radec (obj, obs, mjd) {
  obs.utc = mjd
  return obj.getInfo('RADEC', obs)
}

// 세 점으로 극값의 자리를 좁힌다. 표본이 촘촘하므로 포물선 맞춤이면
// 충분하고, 엔진을 다시 부르지 않아 싸다.
function vertex (t0, step, y0, y1, y2) {
  const denom = y0 - 2 * y1 + y2
  if (!denom) return t0
  const d = 0.5 * (y0 - y2) / denom
  return t0 + d * step
}

// y(t) 가 level 을 지나는 자리. 표본 사이를 선형으로 본다.
function crossing (tA, tB, yA, yB, level) {
  if (yA === yB) return tA
  return tA + (level - yA) / (yB - yA) * (tB - tA)
}

function mjdToDate (stel, mjd) {
  return stel.MJD2date(mjd)
}

/*
 * 달-태양 이각을 훑어 삭 · 상현 · 보름 · 하현을 찾는다.
 *
 * 이각은 한 삭망월 동안 0 에서 180 까지 올랐다 내린다. 그래서
 *   - 삭   = 이각의 골
 *   - 보름 = 이각의 마루
 *   - 상현 = 90 도를 올라가며 지날 때
 *   - 하현 = 90 도를 내려오며 지날 때
 * 로 갈린다. 조명 비율(phase)만 보면 상현과 하현이 둘 다 0.5 라 갈리지
 * 않는다. 오르내리는 방향이 있어야 한다.
 */
function moonPhases (stel, obs, from, to, out) {
  const moon = stel.getObj('NAME Moon')
  const sun = stel.getObj('NAME Sun')
  if (!moon || !sun) return

  const ts = []
  const es = []
  for (let t = from; t <= to; t += STEP_MOON) {
    ts.push(t)
    es.push(sep(radec(moon, obs, t), radec(sun, obs, t)))
  }
  for (let i = 1; i < es.length - 1; i++) {
    if (es[i] < es[i - 1] && es[i] <= es[i + 1]) {
      out.push({ kind: 'moon', phase: 'new', mjd: vertex(ts[i], STEP_MOON, es[i - 1], es[i], es[i + 1]) })
    } else if (es[i] > es[i - 1] && es[i] >= es[i + 1]) {
      out.push({ kind: 'moon', phase: 'full', mjd: vertex(ts[i], STEP_MOON, es[i - 1], es[i], es[i + 1]) })
    }
    if (es[i - 1] < 90 && es[i] >= 90) {
      out.push({ kind: 'moon', phase: 'firstQuarter', mjd: crossing(ts[i - 1], ts[i], es[i - 1], es[i], 90) })
    } else if (es[i - 1] > 90 && es[i] <= 90) {
      out.push({ kind: 'moon', phase: 'lastQuarter', mjd: crossing(ts[i - 1], ts[i], es[i - 1], es[i], 90) })
    }
  }
}

/*
 * 행성이 태양에서 가장 멀어지는 자리.
 *
 * 바깥 행성은 이각이 180 도에 닿는 때가 **충**이다. 그날 행성은 해가 질
 * 때 떠서 밤새 보이고 한 해 중 가장 밝고 크다. 안쪽 행성은 180 도까지
 * 가지 못하고 되돌아오는데, 그 되돌아오는 자리가 **최대이각**이다.
 * 수성과 금성을 볼 수 있는 날이 그때다.
 */
function planetEvents (stel, obs, from, to, out) {
  const sun = stel.getObj('NAME Sun')
  if (!sun) return
  for (const p of PLANETS) {
    const obj = stel.getObj(p.id)
    if (!obj) continue
    const ts = []
    const es = []
    for (let t = from; t <= to; t += STEP_PLANET) {
      ts.push(t)
      es.push(sep(radec(obj, obs, t), radec(sun, obs, t)))
    }
    for (let i = 1; i < es.length - 1; i++) {
      if (!(es[i] > es[i - 1] && es[i] >= es[i + 1])) continue
      const mjd = vertex(ts[i], STEP_PLANET, es[i - 1], es[i], es[i + 1])
      if (p.inner) {
        out.push({ kind: 'elongation', planet: p.key, mjd: mjd, sep: es[i], east: eastOfSun(stel, obj, sun, obs, ts[i]) })
      } else if (es[i] > 170) {
        out.push({ kind: 'opposition', planet: p.key, mjd: mjd })
      }
    }
  }
}

// 해의 동쪽이면 해가 진 뒤 서쪽 하늘에 남고, 서쪽이면 해 뜨기 전
// 동쪽 하늘에 뜬다. 언제 나가야 하는지가 여기서 갈린다.
function eastOfSun (stel, obj, sun, obs, mjd) {
  const a = stel.c2s(radec(obj, obs, mjd))[0]
  const b = stel.c2s(radec(sun, obs, mjd))[0]
  return stel.anpm(a - b) > 0
}

/*
 * 서로 가까워지는 것들. 달과 행성, 그리고 행성끼리.
 *
 * 화면에서 배우는 것이 아니라 밖에서 알아보는 것이라 값진 항목이다.
 * 밤하늘에서 밝은 점 둘이 나란히 붙어 있으면 누구든 알아본다.
 */
function conjunctions (stel, obs, from, to, out) {
  const bodies = [{ id: 'NAME Moon', key: 'moon' }].concat(PLANETS)
  const objs = bodies.map(b => ({ key: b.key, obj: stel.getObj(b.id) })).filter(o => o.obj)

  const ts = []
  const pos = []
  for (let t = from; t <= to; t += STEP_MOON) {
    ts.push(t)
    pos.push(objs.map(o => radec(o.obj, obs, t)))
  }
  for (let a = 0; a < objs.length; a++) {
    for (let b = a + 1; b < objs.length; b++) {
      const ds = pos.map(p => sep(p[a], p[b]))
      for (let i = 1; i < ds.length - 1; i++) {
        if (!(ds[i] < ds[i - 1] && ds[i] <= ds[i + 1])) continue
        if (ds[i] > CONJ_MAX) continue
        out.push({
          kind: 'conjunction',
          a: objs[a].key,
          b: objs[b].key,
          sep: ds[i],
          mjd: vertex(ts[i], STEP_MOON, ds[i - 1], ds[i], ds[i + 1])
        })
      }
    }
  }
}

/*
 * 유성우. 이것만 계산이 아니라 자료에서 온다 (skydata/meteor-showers.json).
 * 극대일은 해마다 거의 같은 날이라 계산할 것이 없다.
 *
 * 달의 조명 비율을 함께 낸다. 유성우는 달이 밝으면 반이 지워진다.
 * "8월 13일 페르세우스" 만 적고 그날이 보름이라는 것을 안 적으면
 * 나가서 헛걸음한다.
 */
function showerEvents (stel, obs, from, to, showers, out) {
  if (!showers || !showers.length) return
  const moon = stel.getObj('NAME Moon')
  const sun = stel.getObj('NAME Sun')
  const fromDate = mjdToDate(stel, from)
  const toDate = mjdToDate(stel, to)

  for (const s of showers) {
    if (!s.peak) continue
    const [mm, dd] = s.peak.split('-').map(Number)
    // 극대일이 걸치는 해가 둘일 수 있다. 두 해를 다 놓고 창 안에 드는
    // 것만 남긴다 (연말 유성우가 이듬해 초에 오는 경우).
    for (const y of [fromDate.getFullYear(), fromDate.getFullYear() + 1]) {
      const d = new Date(y, mm - 1, dd, 12, 0, 0)
      if (d < fromDate || d > toDate) continue
      const mjd = stel.date2MJD(d)
      let illum = null
      if (moon && sun) {
        obs.utc = mjd
        const ph = moon.getInfo('phase', obs)
        illum = typeof ph === 'number' ? ph : null
      }
      out.push({ kind: 'shower', code: s.iau_code, zhr: s.zhr, moonIllum: illum, mjd: mjd })
    }
  }
}

/*
 * 앞으로 days 일 사이의 볼거리를 날짜순으로 돌려준다.
 *
 * 관측지는 앱이 아는 곳을 쓴다. 관측지에 따라 달라지는 항목이 있다 —
 * 달과 행성이 얼마나 가까워 보이는지는 시차 때문에 보는 자리마다 다르다.
 */
export function compute (stel, showers, days) {
  if (!stel) return []
  const obs = stel.observer.clone()
  const out = []
  try {
    const from = stel.core.observer.utc
    const to = from + (days || 60)
    moonPhases(stel, obs, from, to, out)
    planetEvents(stel, obs, from, to, out)
    conjunctions(stel, obs, from, to, out)
    showerEvents(stel, obs, from, to, showers, out)
  } finally {
    obs.destroy && obs.destroy()
  }
  out.sort((a, b) => a.mjd - b.mjd)
  for (const e of out) e.date = mjdToDate(stel, e.mjd)
  return out
}

export default { compute, CONJ_MAX }
