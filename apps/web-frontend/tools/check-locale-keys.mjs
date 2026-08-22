// 화면이 부르는 번역 키가 네 언어에 다 있는지 본다.
//
//   node tools/check-locale-keys.mjs
//
// 왜 필요한가. main.js 가 formatFallbackMessages 를 켜 두어서, 없는 키를
// 부르면 **키 문자열이 그대로 화면에 찍힌다.** 오류도 경고도 나지 않고
// 한국어 화면에 영어가 뜬다.
//
// 2026-08-22 에 이 검사로 여섯 개를 찾았다. 그중 light years 는 레슨
// 여러 편이 "정보창의 거리를 보세요"라고 시키는 바로 그 줄이었고,
// 용어집은 그 키가 있다고 적고 있었다.
//
// **이 검사가 못 잡는 것**: 아예 하드코딩된 영어. $t() 를 거치지 않으니
// 여기 걸리지 않는다(같은 날 대화상자 두 곳의 "Close" 가 그랬다).
// 새 화면은 네 언어로 한 번씩 열어 봐야 한다.

import fs from 'fs'
import path from 'path'

const LANGS = ['ko', 'en', 'ja', 'es']
const ROOT = path.resolve('src')

function readJson (p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

// 플러그인 로케일도 같은 네임스페이스로 합쳐진다 (main.js 참고).
function localeFor (lang) {
  const out = readJson(path.join(ROOT, 'locales', lang + '.json'))
  const plugins = path.join(ROOT, 'plugins')
  for (const name of fs.readdirSync(plugins)) {
    const p = path.join(plugins, name, 'locales', lang + '.json')
    if (fs.existsSync(p)) Object.assign(out, readJson(p))
  }
  return out
}

function has (obj, key) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) return true
  let cur = obj
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur, part)) cur = cur[part]
    else return false
  }
  return true
}

function walk (dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(vue|js)$/.test(name)) out.push(p)
  }
  return out
}

const locales = {}
for (const l of LANGS) locales[l] = localeFor(l)

const used = new Map()
for (const file of walk(ROOT, [])) {
  const src = fs.readFileSync(file, 'utf8')
  for (const m of src.matchAll(/\$t\(\s*'([^']+)'/g)) {
    const key = m[1]
    // $t('learn.level.' + x) 처럼 이어 붙이는 것은 검사할 수 없다.
    if (key.endsWith('.')) continue
    if (!used.has(key)) used.set(key, new Set())
    used.get(key).add(path.relative(ROOT, file))
  }
}

let bad = 0
for (const [key, files] of [...used].sort()) {
  const missing = LANGS.filter(l => !has(locales[l], key))
  if (!missing.length) continue
  bad++
  console.log(`✗ ${JSON.stringify(key)} — ${missing.join(', ')} 에 없음  (${[...files].join(', ')})`)
}

console.log(`키 ${used.size}개 검사, 빠진 것 ${bad}개`)
if (bad) process.exit(1)
