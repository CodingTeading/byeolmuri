// 레슨 목록(index.json) 굽기
//
// 포털은 레슨 본문을 열지 않고 목록만 보고 판단한다. 계절, 갈래, 단계 수가
// 전부 목록에 있어야 첫 화면이 가벼워지기 때문이다. 그런데 목록을 손으로
// 적으면 본문과 어긋난다. 어긋나면 겨울 레슨이 여름에 첫 화면으로 올라온다.
// 그래서 목록은 본문에서 굽는다.
//
//   node tools/make-lesson-index.mjs          모든 언어
//   node tools/make-lesson-index.mjs ko       한 언어만
//
// 새 레슨을 추가하려면 content/<lang>/<id>.json 을 쓰고 이것을 돌리면 된다.
// 순서는 index.json 에 이미 있는 순서를 지키고, 새 레슨은 뒤에 붙는다.
// 갱신일(updated)도 이미 있으면 그대로 두므로, 고친 레슨만 직접 날짜를
// 바꾸거나 --touch <id> 로 오늘 날짜를 찍는다.

import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('src/plugins/learn/content')
const SEARCH_INDEX = path.resolve('public/search-index.json')
const FIELDS = ['id', 'title', 'subtitle', 'minutes', 'level', 'track', 'tags']
const TRACKS = ['principle', 'target', 'measure']
const LEVELS = ['intro', 'basic', 'deep']

const args = process.argv.slice(2)
const touch = []
const langs = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--touch') touch.push(args[++i])
  else langs.push(args[i])
}
const today = new Date().toISOString().slice(0, 10)

function read (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/*
 * 레슨이 짚는 천체 이름을 검사한다.
 *
 * 두 가지를 본다. 색인에 없는 이름과, **여러 천체가 함께 주장하는 이름**이다.
 * 뒤엣것이 특히 고약하다. 엔진은 둘 중 아무거나 내주는데, 화면에는 조용히
 * 엉뚱한 별에 동그라미가 그려진다. 실제로 '* eta UMa' 가 알카이드가 아니라
 * 3.16등급짜리 다른 별로 잡혀 북두칠성 국자 모양이 무너져 있었다.
 * 이럴 때는 고유명('Alkaid')이나 플램스티드 번호('* 85 UMa')로 짚는다.
 */
function checkObjects (lang, lessons) {
  if (!fs.existsSync(SEARCH_INDEX)) {
    console.warn('search-index.json 이 없어 천체 이름 검사를 건너뜁니다')
    return
  }
  const claims = new Map()
  for (const o of read(SEARCH_INDEX).objects) {
    for (const n of o.n) {
      const k = n.toLowerCase()
      if (!claims.has(k)) claims.set(k, [])
      claims.get(k).push(o)
    }
  }
  // 행성과 달, 태양은 엔진이 직접 만든다. 색인에는 없다.
  const fromEngine = /^NAME (Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)$/
  const problems = []
  for (const { id, names } of lessons) {
    for (const n of names) {
      if (fromEngine.test(n)) continue
      const c = claims.get(n.toLowerCase())
      if (!c) problems.push(`${lang}/${id}: 색인에 없는 천체 '${n}'`)
      else if (c.length > 1) {
        problems.push(`${lang}/${id}: '${n}' 을 ${c.length}개 천체가 주장합니다 ` +
          `(${c.map(o => o.n[0] + ' ' + o.v).join(', ')}). 고유명이나 번호로 짚으세요`)
      }
    }
  }
  if (problems.length) throw new Error(['', ...problems].join(String.fromCharCode(10)))
}

function namesIn (lesson) {
  const out = new Set()
  for (const s of lesson.steps) {
    for (const k of ['lookAt', 'select']) if (s[k]) out.add(s[k])
    for (const h of s.highlight || []) {
      if (typeof h === 'string') out.add(h)
      else if (h.target) out.add(h.target)
    }
    for (const c of s.connect || []) {
      if (typeof c === 'string') out.add(c)
      else for (const n of c) out.add(n)
    }
  }
  return [...out]
}

function build (lang) {
  const dir = path.join(ROOT, lang)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json')

  let old = { lessons: [] }
  const indexPath = path.join(dir, 'index.json')
  if (fs.existsSync(indexPath)) old = read(indexPath)
  const order = old.lessons.map(l => l.id)
  const prev = {}
  for (const l of old.lessons) prev[l.id] = l

  const used = []
  const lessons = files.map(f => {
    const d = read(path.join(dir, f))
    used.push({ id: d.id, names: namesIn(d) })
    const id = f.replace(/\.json$/, '')
    if (d.id !== id) throw new Error(`${lang}/${f}: id 가 파일 이름과 다릅니다 (${d.id})`)
    for (const k of FIELDS) {
      if (d[k] === undefined) throw new Error(`${lang}/${f}: ${k} 가 없습니다`)
    }
    if (TRACKS.indexOf(d.track) === -1) throw new Error(`${lang}/${f}: 알 수 없는 갈래 ${d.track}`)
    if (LEVELS.indexOf(d.level) === -1) throw new Error(`${lang}/${f}: 알 수 없는 수준 ${d.level}`)
    if (!d.steps || !d.steps.length) throw new Error(`${lang}/${f}: 단계가 없습니다`)

    const e = {}
    for (const k of FIELDS) e[k] = d[k]
    e.steps = d.steps.length
    e.updated = (touch.indexOf(id) === -1 && prev[id] && prev[id].updated) || today
    if (d.months && d.months.length) e.months = d.months
    return e
  })

  lessons.sort((a, b) => {
    const ia = order.indexOf(a.id)
    const ib = order.indexOf(b.id)
    return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib)
  })

  checkObjects(lang, used)

  fs.writeFileSync(indexPath, JSON.stringify({ version: 2, lessons }, null, 1) + '\n')
  const objs = new Set(used.flatMap(u => u.names)).size
  console.log(`${lang}: 레슨 ${lessons.length}편, 짚는 천체 ${objs}개`)
}

const targets = langs.length ? langs
  : fs.readdirSync(ROOT).filter(f => fs.statSync(path.join(ROOT, f)).isDirectory())
for (const lang of targets) build(lang)
