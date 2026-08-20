// 별무리 학습 - 하늘에 표시 그리기
//
// 레슨에서 "이 별을 보세요" 라고 말할 때 실제로 그 별을 짚어준다.
// 엔진은 GeoJSON 레이어로 폴리곤을 그릴 수 있고 좌표계는 ICRF(적경/적위, 도)다.
// 선(linestring)은 지원하지 않으므로 가느다란 띠 모양 폴리곤으로 그린다.
//
// 화면에 그리는 방법이 이것뿐이다. 엔진이 투영 함수를 밖으로 내주지 않아
// DOM 위에 겹쳐 그리는 방법은 쓸 수 없다.

import { findObj } from './director'

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

// 강조 색. 별빛과 섞이지 않도록 하늘에 없는 색을 쓴다.
const MARK_FILL = [0.35, 0.75, 1.0, 0.10]
const MARK_STROKE = [0.45, 0.82, 1.0, 0.95]

function radec2vec (raDeg, deDeg) {
  const ra = raDeg * D2R
  const de = deDeg * D2R
  const c = Math.cos(de)
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(de)]
}

function vec2radec (v) {
  const r = Math.hypot(v[0], v[1], v[2])
  const ra = Math.atan2(v[1], v[0]) * R2D
  return [(ra + 360) % 360, Math.asin(v[2] / r) * R2D]
}

function norm (v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}

function cross (a, b) {
  return [a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]]
}

/*
 * 천체의 적경/적위(도)를 얻는다. 엔진이 모르는 이름이면 null.
 *
 * 엔진은 누가 요구하기 전까지 천체를 목록에 올리지 않는다. HiPS 타일이
 * 도착하고 처리될 때까지 기다려야 하므로 director 와 같은 재시도를 쓴다.
 * 한 번만 물어보면 레슨을 여는 순간에는 거의 항상 실패한다.
 */
export async function radecOf (stel, name) {
  const obj = await findObj(stel, name)
  if (!obj) return null
  const v = obj.getInfo('RADEC', stel.core.observer)
  const s = stel.c2s(v)
  return [((s[0] * R2D) % 360 + 360) % 360, stel.anpm(s[1]) * R2D]
}

/*
 * 천체를 감싸는 원. 반지름은 도 단위.
 */
function circleRing (raDeg, deDeg, radiusDeg, steps) {
  steps = steps || 64
  const center = radec2vec(raDeg, deDeg)
  // 중심과 수직인 두 축을 잡아 원을 3차원에서 그린다.
  // 적경/적위 평면에서 그리면 천구 극 근처에서 찌그러진다.
  const ref = Math.abs(center[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]
  const u = norm(cross(center, ref))
  const w = norm(cross(center, u))
  const r = radiusDeg * D2R
  const cr = Math.cos(r)
  const sr = Math.sin(r)
  const ring = []
  for (let i = 0; i <= steps; i++) {
    const a = i / steps * 2 * Math.PI
    const p = [
      center[0] * cr + (u[0] * Math.cos(a) + w[0] * Math.sin(a)) * sr,
      center[1] * cr + (u[1] * Math.cos(a) + w[1] * Math.sin(a)) * sr,
      center[2] * cr + (u[2] * Math.cos(a) + w[2] * Math.sin(a)) * sr
    ]
    ring.push(vec2radec(p))
  }
  return ring
}

/*
 * 여러 점을 잇는 띠. 엔진이 선을 그리지 못하므로 폭이 있는 폴리곤으로 만든다.
 */
function pathRibbon (points, widthDeg, stepsPerLeg) {
  stepsPerLeg = stepsPerLeg || 24
  const w = widthDeg * D2R / 2
  const path = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = radec2vec(points[i][0], points[i][1])
    const b = radec2vec(points[i + 1][0], points[i + 1][1])
    const omega = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
    const n = Math.max(2, Math.round(stepsPerLeg))
    for (let k = 0; k <= n; k++) {
      if (i > 0 && k === 0) continue
      const t = k / n
      let p
      if (omega < 1e-6) {
        p = a
      } else {
        const s0 = Math.sin((1 - t) * omega) / Math.sin(omega)
        const s1 = Math.sin(t * omega) / Math.sin(omega)
        p = [a[0] * s0 + b[0] * s1, a[1] * s0 + b[1] * s1, a[2] * s0 + b[2] * s1]
      }
      path.push(norm(p))
    }
  }
  // 각 점에서 경로에 수직인 방향으로 벌려 띠를 만든다.
  const left = []
  const right = []
  for (let i = 0; i < path.length; i++) {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const tan = norm([next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]])
    const nrm = norm(cross(path[i], tan))
    const cw = Math.cos(w)
    const sw = Math.sin(w)
    left.push(vec2radec([path[i][0] * cw + nrm[0] * sw,
      path[i][1] * cw + nrm[1] * sw,
      path[i][2] * cw + nrm[2] * sw]))
    right.push(vec2radec([path[i][0] * cw - nrm[0] * sw,
      path[i][1] * cw - nrm[1] * sw,
      path[i][2] * cw - nrm[2] * sw]))
  }
  right.reverse()
  const ring = left.concat(right)
  ring.push(ring[0])
  return ring
}

/*
 * 한 단계의 표시를 만든다.
 *
 * step.highlight  ["* alf UMa", { target: "...", radius: 2 }, { ra: 279, de: 38 }]
 * step.connect    ["* bet UMa", "* alf UMa", "Polaris"]  — 순서대로 잇는다
 *                 또는 [[a, b], [c, d]] 처럼 구간 목록
 *
 * fovDeg 는 현재 시야각. 원 크기를 화면에 맞춰 정한다. 고정 크기로 두면
 * 넓게 볼 때는 안 보이고 확대하면 화면을 덮는다.
 */
export async function buildFeatures (stel, step, fovDeg) {
  const features = []
  const autoRadius = Math.min(8, Math.max(0.25, fovDeg / 14))
  const lineWidth = Math.min(1.2, Math.max(0.05, fovDeg / 260))

  const resolve = (item) => {
    if (typeof item === 'string') return radecOf(stel, item)
    if (item && item.ra !== undefined && item.de !== undefined) {
      return Promise.resolve([item.ra, item.de])
    }
    if (item && item.target) return radecOf(stel, item.target)
    return Promise.resolve(null)
  }

  const legs = []
  const conn = step.connect || []
  if (conn.length && Array.isArray(conn[0])) {
    for (const pair of conn) legs.push(pair)
  } else if (conn.length >= 2) {
    legs.push(conn)
  }

  // 대상을 한꺼번에 찾는다. 하나씩 기다리면 못 찾는 천체가 여럿일 때
  // 재시도 시간이 그 수만큼 곱해진다. 일곱 별짜리 단계에서 40초 넘게
  // 멈추는 일이 실제로 있었다.
  const highlights = step.highlight || []
  const [hlPos, legPos] = await Promise.all([
    Promise.all(highlights.map(resolve)),
    Promise.all(legs.map(leg => Promise.all(leg.map(resolve))))
  ])

  highlights.forEach((item, i) => {
    const pos = hlPos[i]
    if (!pos) {
      console.warn('[learn] 표시할 천체를 찾지 못했습니다:', item)
      return
    }
    const radius = (item && item.radius) || autoRadius
    features.push({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [circleRing(pos[0], pos[1], radius)] }
    })
  })

  legs.forEach((leg, i) => {
    const pts = legPos[i].filter(Boolean)
    if (pts.length < 2) {
      console.warn('[learn] 이을 천체가 부족합니다:', leg)
      return
    }
    features.push({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [pathRibbon(pts, lineWidth)] }
    })
  })
  return features
}

/*
 * 표시 레이어를 만들고 관리한다. 레이어는 하나만 두고 내용만 갈아끼운다.
 */
export function createMarks (stel) {
  let layer = null
  return {
    async set (step, fovDeg) {
      const features = await buildFeatures(stel, step, fovDeg)
      if (!features.length) {
        this.clear()
        return 0
      }
      const data = { type: 'FeatureCollection', features: features }
      if (!layer) {
        layer = stel.core.add('geojson', { data: data })
      } else {
        layer.setData(data)
      }
      layer.filterAll(() => ({ fill: MARK_FILL, stroke: MARK_STROKE, visible: true }))
      return features.length
    },
    clear () {
      if (layer) layer.setData({ type: 'FeatureCollection', features: [] })
    },
    destroy () {
      this.clear()
      layer = null
    }
  }
}

export default { createMarks, buildFeatures, radecOf }
