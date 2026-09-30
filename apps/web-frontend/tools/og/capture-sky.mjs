#!/usr/bin/env node
/**
 * 레슨마다 "그 레슨이 실제로 보여 주는 하늘" 을 엔진으로 그려 캡처한다 — 공유 카드의 그림.
 *
 *   node capture-sky.mjs                 전부 (첫 로딩에 30초, 그 뒤 레슨당 몇 초)
 *   node capture-sky.mjs big-dipper      한 레슨만
 *   node capture-sky.mjs --base=http://localhost:8793   로컬 빌드로
 *
 * 출력  sky/<레슨 id>.jpg   (1200×SKY_H, 언어와 무관 — 하늘은 언어가 없다)
 *       sky/_home.jpg        첫 화면 카드용
 *
 * ## 왜 이렇게 하나
 *
 * 사용자 지적(2026-09-30): 공유 카드는 이미지가 주인공이어야 한다. 처음 판 별무리 카드는 별 모양 + 제목 +
 * 칩뿐인 **글자 카드**였다. 별무리에서 가장 정직한 그림은 **레슨이 실제로 띄우는 하늘**이다 — 레슨 원고의
 * 단계마다 날짜·방위·고도·시야각과 별을 잇는 선(connect)이 들어 있고, 앱이 그것을 엔진으로 그린다.
 * 그래서 새로 그리지 않고 **앱이 그리는 그 화면을 그대로** 찍는다.
 *
 * 레슨 화면의 `go(i)` 로 대표 단계로 간다(선이 그려지는 단계가 대개 "여기 있다" 를 보여 준다).
 * UI 는 CSS 로 가리고 캔버스만 남긴다.
 *
 * ## 외부 의존성이 없는 이유
 *
 * puppeteer 없이 크롬 원격 디버깅(CDP)을 직접 쓴다 — aiteading/web/shot.mjs 와 같은 방식이다.
 * 이 PC 는 헤드리스일 때 디버깅 포트가 안 열려 창을 띄운다. 화면 크기는 Emulation 으로 정확히 잡는다.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const APP = path.join(HERE, '..', '..')
const OUT = path.join(HERE, 'sky')
const args = process.argv.slice(2)
const BASE = (args.find((a) => a.startsWith('--base='))?.split('=')[1] ?? 'https://byeolmuri.codingteading.com').replace(/\/$/, '')
const ONLY = args.filter((a) => !a.startsWith('--'))

// 카드 위쪽 하늘 칸의 크기. 가운데 630 의 3/4 을 하늘이 차지한다 — 아래 1/4 은 제목 띠.
export const SKY_W = 1200
export const SKY_H = 470

/*
 * 레슨마다 카드에 쓸 단계. 기본은 "선(connect)이나 강조(highlight)가 처음 나오는 단계" 다.
 * 그 규칙으로 부족한 곳만 손으로 고른다(1부터 센다 — 화면의 단계 번호와 같게).
 */
const OVERRIDE = {
  // 1단계는 국자 손잡이 세 별뿐이라 썸네일에서 점 셋이다. 4단계가 곡선 전체(알카이드 → 아르크투루스 → 스피카)다.
  'spring-arc': 4,
}

const lessons = JSON.parse(fs.readFileSync(path.join(APP, 'src/plugins/learn/content/ko/index.json'), 'utf8')).lessons
function pickStep (id) {
  if (OVERRIDE[id]) return OVERRIDE[id] - 1
  const L = JSON.parse(fs.readFileSync(path.join(APP, 'src/plugins/learn/content/ko', `${id}.json`), 'utf8'))
  const i = L.steps.findIndex((s) => (s.connect && s.connect.length) || s.highlight)
  return i < 0 ? 0 : i
}

// ---------- 크롬 ----------
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!CHROME) { console.error('크롬을 찾지 못했다'); process.exit(1) }
const PORT = 9400 + Math.floor(Math.random() * 300)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const proc = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${path.join(os.tmpdir(), 'byeolmuri-og-' + PORT)}`,
  '--window-size=1300,800', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--lang=ko-KR', '--disable-features=Translate', 'about:blank',
], { stdio: 'ignore' })

let ws
for (let i = 0; i < 100 && !ws; i++) {
  try {
    const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
    const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
    if (page) {
      ws = new WebSocket(page.webSocketDebuggerUrl)
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
    }
  } catch { }
  if (!ws) await sleep(400)
}
if (!ws) { console.error('크롬 접속 실패'); proc.kill(); process.exit(1) }

let seq = 0
const waiting = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(typeof e.data === 'string' ? e.data : Buffer.from(e.data).toString())
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) }
}
// 응답이 안 오면 영영 기다리지 않는다 — 첫 판이 여기서 소리 없이 멈췄다.
const send = (method, params = {}) => Promise.race([
  new Promise((res) => {
    const i = ++seq; waiting.set(i, res)
    ws.send(JSON.stringify({ id: i, method, params }))
  }),
  sleep(20_000).then(() => ({ error: { message: `${method} 응답 없음` } })),
])
/** 페이지 안에서 식을 돌린다. 약속을 기다리고 값을 돌려준다. */
async function run (expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
  if (r.error) throw new Error(r.error.message)
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? '평가 실패')
  return r.result?.result?.value
}
/** 조건이 참이 될 때까지 기다린다. 엔진 자료가 늦게 온다(CLAUDE.md: 20초 이상). */
async function until (expr, ms, what) {
  const end = Date.now() + ms
  let last = ''
  while (Date.now() < end) {
    try { if (await run(expr)) return true } catch (e) { last = e.message }
    await sleep(500)
  }
  if (last) console.error(`  (마지막 오류: ${last.split(String.fromCharCode(10))[0]})`)
  throw new Error(`기다렸지만 안 됨: ${what}`)
}

// 레슨 화면의 Vue 인스턴스. `go(i)` 와 `lesson` 을 가진 것.
const VM = `(() => { for (const el of document.querySelectorAll('*')) { const v = el.__vue__; if (v && typeof v.go === 'function' && 'lesson' in v) return v } return null })()`
// UI 를 가리고 캔버스만 남긴다. visibility 는 자식이 되살릴 수 있어서 이 방식이 된다.
const HIDE_UI = `(() => { if (document.getElementById('og-hide')) return true
  const s = document.createElement('style'); s.id = 'og-hide'
  s.textContent = 'body * { visibility: hidden !important } canvas { visibility: visible !important }'
  document.head.appendChild(s); return true })()`

// 캔버스가 차지하는 자리. 넓은 화면에서는 레슨 패널이 오른쪽을 차지해 캔버스가 좁아진다 —
// 첫 판이 800px 짜리 하늘에 오른쪽 400px 이 흰 채로 찍혔다. 뷰포트를 넓혀 캔버스를 SKY_W 로 맞추고 그 자리만 자른다.
let CLIP = { x: 0, y: 0, width: SKY_W, height: SKY_H, scale: 1 }
const CANVAS_RECT = `(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height] })()`
async function fitCanvas () {
  let vw = SKY_W + 400
  for (let i = 0; i < 4; i++) {
    await send('Emulation.setDeviceMetricsOverride', { width: vw, height: SKY_H, deviceScaleFactor: 1, mobile: false })
    await sleep(1500)
    const [x, y, w, h] = await run(CANVAS_RECT)
    if (Math.round(w) === SKY_W && Math.round(h) >= SKY_H - 2) {
      CLIP = { x: Math.round(x), y: Math.round(y), width: SKY_W, height: Math.min(SKY_H, Math.round(h)), scale: 1 }
      return
    }
    vw += SKY_W - Math.round(w)
  }
  throw new Error('캔버스를 ' + SKY_W + 'px 로 맞추지 못했다')
}

/*
 * 레슨의 시야각은 큰 화면에서 둘러보라고 잡은 것이라, 1200px 카드를 썸네일로 줄이면 대상이 점이 된다
 * (북두칠성이 fov 80° 에서 가로 110px). 화면 중심은 그대로 두고 시야만 좁힌다 — 가운데를 크게 잘라 보는 것과 같다.
 */
const ZOOM = 0.6
// 확대하면 대상이 화면 밖으로 나가는 레슨. 봄의 대곡선은 국자 손잡이 → 아르크투루스 → 스피카가
// 60° 넘게 이어져, 0.6 배로 좁히니 선이 전부 밖으로 나가 빈 하늘이 찍혔다.
const ZOOM_BY = { 'spring-arc': 1.0 }

/*
 * 카드용 모양 — 썸네일로 줄여도 보이게. 하늘의 내용(위치·시각·무엇을 잇는가)은 레슨 그대로다.
 *
 * - 잇는 선·동그라미를 굵게: marks.set 은 시야각으로 굵기를 정하므로(fov/260) 시야각을 부풀려 넘긴다.
 *   레슨 화면의 1~2px 선은 630px 썸네일에서 사라진다.
 * - 엔진 이름표를 끈다: 하늘 이름표는 번역이 보류된 상태라 한국어·일본어 카드에 "Arcturus" 가 박힌다.
 * - 별을 조금 키운다: 점 같은 별은 썸네일에서 잡음이 된다.
 */
const MARK_BOOST = 1.9
const CARD_LOOK = `(async () => {
  const v = ${VM}; const s = v.$stel; const c = s.core
  for (const m of ['stars', 'planets', 'dsos', 'comets', 'minor_planets', 'satellites']) {
    try { if (c[m] && 'hints_visible' in c[m]) c[m].hints_visible = false } catch (e) {}
  }
  try { c.star_linear_scale = 1.05; c.star_relative_scale = 1.25 } catch (e) {}
  // 별자리 이름표(GEMINI · ORION …)와 방위 글자(E · S)도 영어라 끈다. 별자리 선은 레슨이 켠 대로 둔다.
  try { if (c.constellations) c.constellations.labels_visible = false } catch (e) {}
  try { if (c.cardinals) c.cardinals.visible = false } catch (e) {}
  // 선택한 천체에는 영어 이름표와 표시 눈금이 붙는다("Moon", "Sirius"). 선택만 푼다 — 시야는 그대로다.
  try { c.selection = 0 } catch (e) {}
  /*
   * 잇는 선 없이 강조(동그라미)만 있는 단계는 강조 대상이 화면 구석에 있을 수 있다 — 달의 위상 레슨은
   * 달이 오른쪽 끝이라 네이버가 가운데를 자르면 달이 잘려 나갔다. 그런 단계만 첫 강조 대상을 가운데로 옮긴다.
   * 선이 있는 단계는 레슨이 잡은 구도가 곧 그 모양이라 건드리지 않는다.
   */
  const st = v.step
  if (st && st.highlight && st.highlight.length && !(st.connect && st.connect.length)) {
    const t = st.highlight[0]
    const name = typeof t === 'string' ? t : (t && t.target)
    if (name) {
      const o = s.getObj(name)
      if (o) { s.pointAndLock(o, 0); await new Promise((r) => setTimeout(r, 1500)) }
    }
  }
  // 표시 레이어는 lesson-view 의 marks 안에 숨어 있다. 엔진의 add 를 감싸 새로 만드는 레이어를 붙잡는다.
  // 첫 레슨에서 한 번만: marks 를 비우고 다시 만들게 해 그 레이어를 잡는다. 그 뒤로는 같은 레이어를 쓴다.
  if (!window.__ogLayer) {
    if (!c.__ogWrapped) {
      const orig = c.add.bind(c)
      c.add = (t, o) => { const r = orig(t, o); if (t === 'geojson') window.__ogLayer = r; return r }
      c.__ogWrapped = true
    }
    if (v.marks) v.marks.clear()
    v.marks = null
    v.drawMarks()
    await new Promise((r) => setTimeout(r, 1500))
  }
  if (v.marks && v.step) await v.marks.set(v.step, c.fov * 180 / Math.PI * ${MARK_BOOST})
  // 강조 원이 먼저, 잇는 선이 나중에 쌓인다(marks.js buildFeatures). 원은 속을 비우고 선만 채운다 —
  // 원까지 채우면 그 안의 별을 덮는다. 선은 채워야 굵어진다(리본의 테두리만 그리면 두 가닥 실선이 된다).
  const nHl = (v.step && v.step.highlight ? v.step.highlight.length : 0)
  const L = window.__ogLayer
  if (L) L.filterAll((i) => i < nHl
    ? { fill: [0.35, 0.75, 1.0, 0.06], stroke: [0.55, 0.85, 1.0, 1.0], visible: true }
    : { fill: [0.55, 0.85, 1.0, 0.9], stroke: [0.55, 0.85, 1.0, 0.9], visible: true })
  return !!L
})()`

async function shoot (file) {
  const r = await send('Page.captureScreenshot', { format: 'png', clip: CLIP })
  const png = Buffer.from(r.result.data, 'base64')
  await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(file)
  return Math.round(fs.statSync(file).size / 1024)
}

try {
  fs.mkdirSync(OUT, { recursive: true })
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: SKY_W, height: SKY_H, deviceScaleFactor: 1, mobile: false })
  // 저장된 언어 선택이 남아 있으면 다른 언어로 튄다(2026-09-29 에 한 번 속았다). 한국어로 고정한다.
  const first = ONLY[0] ?? lessons[0].id
  await send('Page.navigate', { url: `${BASE}/ko/p/learn/${first}` })
  process.stdout.write('엔진 준비 … ')
  await until(`(() => { const a = document.querySelector('#app'); return !!(a && a.__vue__ && a.__vue__.$store.state.initComplete) })()`, 90_000, '앱 준비')
  await until(`!!${VM} && !!${VM}.lesson`, 30_000, '레슨 화면')
  // 별 자료가 다 올 때까지 조금 더 — 이름표·흐린 별이 늦게 뜬다.
  await sleep(12_000)
  await fitCanvas()
  console.log(`완료 · 캔버스 ${CLIP.width}×${CLIP.height} @${CLIP.x},${CLIP.y}`)

  const targets = ONLY.length ? lessons.filter((l) => ONLY.includes(l.id)) : lessons
  for (const l of targets) {
    await run(`(() => { const r = document.querySelector('#app').__vue__.$router; const p = '/ko/p/learn/${l.id}'; if (r.currentRoute.path !== p) r.push(p); return true })()`)
    await until(`(() => { const v = ${VM}; return !!(v && v.lesson && v.lesson.id === '${l.id}') })()`, 20_000, `레슨 ${l.id}`)
    const step = pickStep(l.id)
    await run(`(() => { ${VM}.go(${step}); return true })()`)
    // 하늘을 옮기는 움직임과 표시(원·선)가 끝나기를 기다린다.
    await sleep(5_000)
    await run(`(() => { const s = ${VM}.$stel; s.core.fov = s.core.fov * ${ZOOM_BY[l.id] ?? ZOOM}; return true })()`)
    // 표시 크기는 시야각을 따라 250ms 뒤 다시 그려진다(lesson-view 의 scheduleMarks).
    await sleep(2_000)
    await run(CARD_LOOK)
    await sleep(1_800)
    await run(HIDE_UI)
    await sleep(600)
    const kb = await shoot(path.join(OUT, `${l.id}.jpg`))
    // 다음 레슨의 UI 를 기다릴 수 있게 가림을 푼다.
    await run(`(() => { const s = document.getElementById('og-hide'); if (s) s.remove(); return true })()`)
    console.log(`  ${l.id.padEnd(18)} 단계 ${step + 1} · ${kb}KB`)
  }
} catch (e) {
  console.error('\n⛔', e.message)
  process.exitCode = 1
} finally {
  ws.close()
  proc.kill()
}
