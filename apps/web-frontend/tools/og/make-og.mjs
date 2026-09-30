#!/usr/bin/env node
/**
 * 별무리 공유 카드(og:image) 생성기 — 1200×630, 네이버 썸네일과 공유 카드를 한 장으로.
 *
 *   npm run og            바뀐 카드만 굽는다 (해시 캐시 .cache/og.json)
 *   npm run og:force      전부 다시
 *   npm run og:preview    몇 장만 preview/ 에 굽고, 네이버가 잘라 쓰는 모습을 한 장에 모은다
 *
 * 출력  ../../public/og/v2/{lang}.png              언어별 첫 화면
 *       ../../public/og/v2/{lang}/learn/{id}.png   레슨마다 한 장 (19편 × 4언어)
 *
 * ## 왜 이 모양인가
 *
 * **네이버는 og:image 를 우선 쓰고, 가로 그림은 가운데를 정사각으로 잘라 썸네일로 쓴다.**
 * 1200×630 이면 x 285~915 만 남는다. 옛 카드는 제목이 왼쪽 정렬이라 "별무리" 가 "무리" 로,
 * "밤하늘을 읽는 법을 배웁니다" 가 "늘을 읽는 법을 배웁니" 로 잘렸다(2026-09-30 실측).
 * 그래서 **무엇에 대한 카드인지는 전부 가운데 630 안에** 두고, 양옆에는 잘려도 되는 것만 둔다.
 *
 * 규격은 zzxxccvv 생태계의 og 카드 규격을 따르되 **"주인공 숫자" 칸은 뺐다**(사용자 결정
 * 2026-09-30, "우리 식으로 고쳐 쓰기"). 그쪽은 병원·회사처럼 숫자가 주인공인 데이터 카드고,
 * 여기는 레슨이라 주인공이 제목이다. 레슨 수 같은 숫자를 억지로 키우지 않는다.
 * 바탕도 그쪽 규격(밝게)과 달리 **밤하늘 색을 그대로 쓴다** — 별무리의 얼굴이 그것이다.
 *
 * ## 왜 앱 빌드와 따로 두나
 *
 * 앱은 Vue CLI 4(웹팩 4) 옛 빌드라 satori·resvg·sharp 같은 네이티브 의존성을 넣으면
 * CF Pages 빌드가 깨질 위험이 있다. 그래서 이 디렉터리는 자기 package.json 을 갖고,
 * 카드는 **로컬에서 구워 커밋한다.** 레슨 제목이 바뀌면 이것을 다시 돌린다 —
 * 해시 캐시가 바뀐 카드만 다시 쓰므로 git 이 쓸데없이 불지 않는다.
 * (같은 생태계의 tools.ailearn.space 는 Astro 라 빌드 때 굽고 커밋하지 않는다. 그쪽이 표준이고
 * 여기는 빌드 사정 때문에 갈린 것이다.)
 *
 * 글꼴은 PretendardJP 한 벌로 한·영·일·서를 다 그린다 — 처음 실행 때 jsDelivr 에서
 * 받아 .cache/fonts 에 둔다. satori 는 woff2 를 못 읽어 OTF 를 쓴다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP = join(HERE, '..', '..')
// 카드 모양이 바뀌면 경로의 버전을 올린다 — 네이버·카카오가 옛 카드를 몇 주씩 들고 있다.
const OG_VERSION = 'v2'
const OUT = join(APP, 'public', 'og', OG_VERSION)
const CACHE_DIR = join(HERE, '.cache')
const CACHE = join(CACHE_DIR, 'og.json')
const FONT_DIR = join(CACHE_DIR, 'fonts')
const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const PREVIEW = args.includes('--preview')

const LANGS = ['ko', 'en', 'ja', 'es']
const DOMAIN = 'byeolmuri.codingteading.com'
const W = 1200
const H = 630
// 네이버가 남기는 가운데 정사각. 가장자리에서 30 을 더 띄운 것이 실제로 쓰는 칸이다.
const CX = 285
const CW = 630
const SAFE = 30

const C = {
  bg: '#0b1020',
  bg2: '#131c3d',
  gold: '#ffe3a0',
  cream: '#fff1c9',
  ink: '#f4f1e8',
  muted: '#a3adc8',
  faint: '#6f7a99',
  chip: 'rgba(255, 227, 160, 0.14)',
  side: 'rgba(255, 255, 255, 0.05)',
  sideLine: 'rgba(255, 255, 255, 0.08)',
}

// ---------- 문구 ----------
// 갈래·단계·분량 이름표는 앱이 쓰는 것과 같은 파일에서 읽는다 — 카드와 화면이 다르게 부르면 안 된다.
const learnLocale = Object.fromEntries(LANGS.map((l) => [l,
  JSON.parse(readFileSync(join(APP, 'src/plugins/learn/locales', `${l}.json`), 'utf8')).learn]))
const siteMeta = JSON.parse(readFileSync(join(APP, 'src/i18n/meta.json'), 'utf8'))

// 앱 로캘에 없는 것만 여기 둔다.
const T = {
  ko: { steps: '{n}단계', lessons: '레슨 {n}편', langs: '4개 언어', months: '잘 보이는 달', topic: '주제', tagline: '밤하늘을 읽는 법을 배웁니다', tracks: '갈래', levels: '단계' },
  en: { steps: '{n} steps', lessons: '{n} lessons', langs: '4 languages', months: 'Best months', topic: 'Topics', tagline: 'Learn to read the night sky', tracks: 'Tracks', levels: 'Levels' },
  ja: { steps: '{n}ステップ', lessons: 'レッスン{n}本', langs: '4言語', months: '見やすい月', topic: 'トピック', tagline: '夜空の読み方をまなぶ', tracks: '分野', levels: 'レベル' },
  es: { steps: '{n} pasos', lessons: '{n} lecciones', langs: '4 idiomas', months: 'Mejores meses', topic: 'Temas', tagline: 'Aprende a leer el cielo nocturno', tracks: 'Áreas', levels: 'Niveles' },
}
const fmt = (s, n) => s.replace('{n}', n)
const brandName = (l) => siteMeta[l].title.split(' – ')[0]

const lessons = Object.fromEntries(LANGS.map((l) => {
  const x = JSON.parse(readFileSync(join(APP, 'src/plugins/learn/content', l, 'index.json'), 'utf8'))
  return [l, x.lessons ?? []]
}))

// ---------- 글꼴 ----------
const FONTS = [
  { weight: 400, file: 'PretendardJP-Regular.otf' },
  { weight: 700, file: 'PretendardJP-Bold.otf' },
  { weight: 800, file: 'PretendardJP-ExtraBold.otf' },
]
const FONT_URL = (f) => `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard-jp/dist/public/static/${f}`
async function loadFonts () {
  mkdirSync(FONT_DIR, { recursive: true })
  const out = []
  for (const f of FONTS) {
    const p = join(FONT_DIR, f.file)
    if (!existsSync(p)) {
      process.stdout.write(`글꼴 받기 ${f.file} … `)
      const r = await fetch(FONT_URL(f.file))
      if (!r.ok) throw new Error(`글꼴 받기 실패 ${r.status} ${f.file}`)
      writeFileSync(p, Buffer.from(await r.arrayBuffer()))
      console.log('완료')
    }
    out.push({ name: 'PretendardJP', weight: f.weight, style: 'normal', data: readFileSync(p) })
  }
  return out
}

// ---------- 그리기 도구 ----------
// satori 는 JSX 대신 이 모양의 객체를 받는다. **자식이 둘 이상인 노드는 display:flex 가 필요하다.**
const h = (type, style, ...children) => {
  const kids = children.flat().filter((c) => c !== null && c !== undefined && c !== false)
  return { type, props: { style: kids.length > 1 ? { display: 'flex', ...style } : { display: 'flex', ...style }, children: kids.length === 1 ? kids[0] : kids } }
}

// 파비콘의 별 두 개. 브랜드 마크를 새로 그리지 않고 그대로 쓴다.
const SPARKLE = 'data:image/svg+xml;base64,' + Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<path d="M26 11Q33.5 28.5 51 36Q33.5 43.5 26 61Q18.5 43.5 1 36Q18.5 28.5 26 11Z" fill="#fff1c9"/>' +
  '<path d="M48 5Q51.3 12.7 59 16Q51.3 19.3 48 27Q44.7 19.3 37 16Q44.7 12.7 48 5Z" fill="#ffe3a0"/></svg>',
).toString('base64')
const sparkle = (size) => ({ type: 'img', props: { src: SPARKLE, width: size, height: size, style: { width: size, height: size } } })

/**
 * 별 무늬. **씨앗을 카드 id 로 고정한다** — 매번 다르게 뿌리면 해시 캐시가 소용없고
 * 다시 구울 때마다 모든 PNG 가 바뀌어 git 이 분다.
 * 가운데 칸에는 거의 뿌리지 않는다 — 글자 뒤의 점은 썸네일에서 잡음이다.
 */
function stars (seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261)
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const out = []
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W
    const y = 20 + rnd() * (H - 40)
    if (x > CX + 20 && x < CX + CW - 20 && rnd() < 0.85) continue
    // 양옆 상자는 반투명이라 뒤의 별이 글자 위로 비친다. 그 자리에는 뿌리지 않는다.
    if (y > 80 && y < 400 && ((x > 50 && x < 265) || (x > 935 && x < 1150))) continue
    const r = rnd() < 0.12 ? 3 : rnd() < 0.5 ? 2 : 1.4
    out.push(h('div', {
      position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: r,
      background: rnd() < 0.2 ? C.gold : '#ffffff', opacity: 0.35 + rnd() * 0.5,
    }))
  }
  return out
}

/** 글자 폭 추정 — CJK 는 1em, 라틴은 0.56em. 제목 크기를 고르는 데만 쓴다. */
const em = (t) => [...t].reduce((a, c) => a + (/[　-鿿가-힯＀-￯]/.test(c) ? 1 : c === ' ' ? 0.3 : 0.56), 0)

/**
 * 제목 크기. 가운데 칸(570)에 **두 줄 안**으로 들어가는 가장 큰 값을 고른다.
 * 규격의 하한(44)보다 작게 만들지 않는다 — 썸네일은 작게 보인다.
 */
function fitTitle (text) {
  const width = CW - SAFE * 2
  for (const size of [64, 58, 52, 48, 44]) {
    if (em(text) * size <= width * 2 * 0.94) return size
  }
  return 44
}

/** "안드로메다은하 — 맨눈으로 보는 가장 먼 것" → 큰 줄 / 작은 줄 */
const splitTitle = (t) => {
  const i = t.indexOf(' — ')
  return i < 0 ? [t, null] : [t.slice(0, i), t.slice(i + 3)]
}

const chip = (text, { size = 24, bg = C.chip, color = C.gold } = {}) =>
  h('div', { fontSize: size, fontWeight: 700, color, background: bg, padding: '8px 18px', borderRadius: 999 }, text)

// ---------- 카드 틀 ----------
function frame (lang, seed, { left, center, right }) {
  return h('div', {
    width: W, height: H, position: 'relative', fontFamily: 'PretendardJP',
    backgroundImage: `radial-gradient(circle at 50% 38%, ${C.bg2} 0%, ${C.bg} 62%)`,
  },
  stars(seed),
  // 위쪽 브랜드 띠
  h('div', { position: 'absolute', left: 0, top: 0, width: W, height: 12, background: C.gold }),
  // 왼쪽 보조 — 네이버 썸네일에서는 잘려도 되는 것만
  h('div', { position: 'absolute', left: 60, top: 96, width: 195, flexDirection: 'column' }, left),
  // 가운데 630 — 이 안만 봐도 무엇에 대한 카드인지 읽혀야 한다
  h('div', {
    position: 'absolute', left: CX + SAFE, top: 40, width: CW - SAFE * 2, height: H - 150,
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  }, center),
  // 오른쪽 보조
  h('div', { position: 'absolute', left: 945, top: 96, width: 195, flexDirection: 'column' }, right),
  // 아래 줄 — 출처(도메인만)와 로고. 공유 카드용이라 가운데 칸 밖이어도 된다.
  h('div', { position: 'absolute', left: 60, bottom: 40, fontSize: 21, fontWeight: 400, color: C.faint }, DOMAIN),
  h('div', { position: 'absolute', right: 60, bottom: 34, alignItems: 'center' },
    sparkle(34),
    h('div', { marginLeft: 10, fontSize: 25, fontWeight: 800, color: C.cream }, brandName(lang))),
  )
}

const sideTitle = (text) => h('div', { fontSize: 20, fontWeight: 700, color: C.faint, marginBottom: 14, letterSpacing: 1 }, text)
const sidePill = (text) => h('div', {
  fontSize: 21, fontWeight: 700, color: C.ink, background: C.side, border: `1px solid ${C.sideLine}`,
  padding: '10px 14px', borderRadius: 12, marginBottom: 10,
}, text)

/** 잘 보이는 달 — 1~12 를 4줄 3칸으로. 숫자라 언어가 바뀌어도 그대로 읽힌다. */
function monthGrid (months) {
  const on = new Set(months ?? [])
  const rows = []
  for (let r = 0; r < 4; r++) {
    rows.push(h('div', { marginBottom: 8 }, [0, 1, 2].map((c) => {
      const m = r * 3 + c + 1
      return h('div', {
        width: 56, height: 40, marginRight: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 700,
        background: on.has(m) ? C.gold : C.side, color: on.has(m) ? C.bg : C.faint,
      }, String(m))
    })))
  }
  return h('div', { flexDirection: 'column' }, rows)
}

// ---------- 카드 두 종류 ----------
function homeCard (lang) {
  const t = T[lang]
  const L = learnLocale[lang]
  return frame(lang, `home-${lang}`, {
    left: [sideTitle(t.tracks), ...Object.values(L.track).map(sidePill)],
    center: [
      sparkle(92),
      h('div', { fontSize: 58, fontWeight: 800, color: C.cream, marginTop: 14 }, brandName(lang)),
      h('div', { fontSize: fitTitle(t.tagline) > 46 ? 40 : 34, fontWeight: 700, color: C.ink, marginTop: 18, lineHeight: 1.3, textAlign: 'center' }, t.tagline),
      h('div', { marginTop: 30, gap: 12 }, chip(fmt(t.lessons, lessons[lang].length)), chip(t.langs)),
    ],
    right: [sideTitle(t.levels), ...Object.values(L.level).map(sidePill)],
  })
}

function lessonCard (lang, l) {
  const t = T[lang]
  const L = learnLocale[lang]
  const [main, sub] = splitTitle(l.title)
  const size = fitTitle(main)
  return frame(lang, `${lang}-${l.id}`, {
    left: [sideTitle(t.topic), ...(l.tags ?? []).slice(0, 4).map(sidePill)],
    center: [
      chip(`${L.track[l.track] ?? l.track} · ${L.level[l.level] ?? l.level}`, { size: 25 }),
      h('div', { fontSize: size, fontWeight: 800, color: C.cream, marginTop: 24, lineHeight: 1.18, textAlign: 'center' }, main),
      sub && h('div', { fontSize: 29, fontWeight: 400, color: C.muted, marginTop: 14, lineHeight: 1.3, textAlign: 'center' }, sub),
      h('div', { marginTop: 28, gap: 12 },
        chip(fmt(L.minutes, l.minutes), { bg: C.side, color: C.ink }),
        l.steps ? chip(fmt(t.steps, l.steps), { bg: C.side, color: C.ink }) : null),
    ],
    right: l.months?.length ? [sideTitle(t.months), monthGrid(l.months)] : [],
  })
}

/** og:image:alt — 카드에 쓴 것을 그대로 말로. 페이지 언어로 쓴다. */
export const altFor = (lang, l) => l
  ? `${brandName(lang)} – ${l.title} (${learnLocale[lang].track[l.track] ?? ''} · ${fmt(learnLocale[lang].minutes, l.minutes)})`
  : `${brandName(lang)} – ${T[lang].tagline}`

// ---------- 굽기 ----------
async function render (tree, fonts) {
  const svg = await satori(tree, { width: W, height: H, fonts })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng()
  // 팔레트 PNG 로 줄인다 — 밤하늘은 색이 적어 200KB 한도 안으로 넉넉히 들어간다.
  // dither 를 끈다 — 켜 두면 둥근 그러데이션에 점무늬가 생겨 별과 구별이 안 된다.
  return sharp(png).png({ palette: true, quality: 90, dither: 0, compressionLevel: 9, effort: 8 }).toBuffer()
}

const GEN_HASH = createHash('md5').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex').slice(0, 10)
const keyOf = (obj) => createHash('md5').update(GEN_HASH + OG_VERSION + JSON.stringify(obj)).digest('hex')

async function main () {
  const fonts = await loadFonts()
  const cache = existsSync(CACHE) && !FORCE ? JSON.parse(readFileSync(CACHE, 'utf8')) : {}

  const jobs = []
  for (const lang of LANGS) {
    jobs.push({ path: `${lang}.png`, key: keyOf({ lang, home: true, n: lessons[lang].length, T: T[lang], L: learnLocale[lang].track }), tree: () => homeCard(lang) })
    for (const l of lessons[lang]) {
      jobs.push({ path: `${lang}/learn/${l.id}.png`, key: keyOf({ lang, l, L: [learnLocale[lang].track, learnLocale[lang].level, learnLocale[lang].minutes] }), tree: () => lessonCard(lang, l) })
    }
  }

  if (PREVIEW) {
    // 유형마다 대표 한 장 + 가장 긴 제목(깨지기 쉬운 쪽)을 언어마다 본다.
    const dir = join(HERE, 'preview')
    mkdirSync(dir, { recursive: true })
    const pick = []
    for (const lang of LANGS) {
      pick.push({ name: `${lang}-home`, tree: homeCard(lang) })
      const longest = lessons[lang].reduce((a, b) => (em(b.title) > em(a.title) ? b : a))
      pick.push({ name: `${lang}-lesson-longest`, tree: lessonCard(lang, longest) })
    }
    pick.push({ name: 'ko-lesson-big-dipper', tree: lessonCard('ko', lessons.ko.find((l) => l.id === 'big-dipper')) })
    for (const p of pick) {
      const buf = await render(p.tree, fonts)
      writeFileSync(join(dir, `${p.name}.png`), buf)
      console.log(`  ${p.name.padEnd(26)} ${Math.round(buf.length / 1024)}KB`)
    }
    console.log(`\n시안 ${pick.length}장 — ${dir}`)
    return
  }

  let made = 0; let kept = 0; let maxKB = 0
  for (const j of jobs) {
    const out = join(OUT, j.path)
    if (cache[j.path] === j.key && existsSync(out)) { kept++; continue }
    mkdirSync(dirname(out), { recursive: true })
    const buf = await render(j.tree(), fonts)
    writeFileSync(out, buf)
    cache[j.path] = j.key
    maxKB = Math.max(maxKB, Math.round(buf.length / 1024))
    made++
  }
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(CACHE, JSON.stringify(cache, null, 1))
  console.log(`카드 ${jobs.length}장 — 새로 ${made} · 그대로 ${kept}${made ? ` · 가장 큰 것 ${maxKB}KB` : ''}`)
  if (maxKB > 200) { console.error('⛔ 200KB 를 넘는 카드가 있다 — 규격 한도'); process.exitCode = 1 }
}

main().catch((e) => { console.error(e); process.exitCode = 1 })
