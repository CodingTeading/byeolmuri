// 옮긴 레슨을 기준 언어와 대조하기
//
//   node tools/check-lesson-parity.mjs en                 영어판 전체
//   node tools/check-lesson-parity.mjs en big-dipper      한 편만
//   node tools/check-lesson-parity.mjs                    ko 를 뺀 모든 언어
//
// make-lesson-index.mjs 는 **그 언어 안에서** 앞뒤가 맞는지만 본다. 천체
// 이름이 색인에 있는지, 갈래 값이 정해진 것인지 같은 것들이다. 그것으로는
// 번역에서 실제로 나는 사고를 못 잡는다. 사고는 늘 **원문과 어긋나는 방식**
// 으로 난다.
//
//   - 단계를 하나 통째로 빠뜨린다
//   - "약 123광년" 을 "about 120 light years" 로 어림한다
//   - <p> 를 닫지 않아 그 단계 화면이 통째로 무너진다
//   - opts 순서를 바꾸고 right 를 안 고쳐 정답이 오답이 된다
//   - sky.fov 를 건드려 글은 "국자가 가득 찹니다" 인데 화면은 다르다
//   - 한 문단을 옮기는 것을 잊어 한국어가 그대로 남는다
//
// 여섯 가지 다 원문과 나란히 놓고 봐야 보인다. 그래서 이 도구가 따로 있다.
//
// 오류(✗)는 고쳐야 하고, 경고(!)는 사람이 판단할 몫이다. 경고를 0 으로
// 만들 필요는 없지만 **하나하나 이유를 댈 수 있어야 한다.**

import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('src/plugins/learn/content')
const BASE = 'ko'

// 옮기지 않는 것. 원문과 한 글자도 달라선 안 된다.
// sky·show 는 화면을 만드는 값이고, select·highlight·connect 안의 문자열은
// 사람 말이 아니라 성표 식별자다. months·level·track 은 목록이 쓰는 분류다.
const FROZEN_TOP = ['id', 'minutes', 'level', 'track', 'months']
const FROZEN_STEP = ['sky', 'show', 'select', 'lookAt', 'highlight', 'connect', 'clearSelection']

// 문단 구조를 만드는 태그. 원문과 순서까지 같아야 한다.
const BLOCK = ['p', 'ul', 'ol', 'li']
// 강조. 언어에 따라 붙는 자리가 달라질 수 있어 개수만 본다.
const INLINE = ['b', 'i', 'em', 'strong', 'code', 'br']

const HANGUL = /[가-힣]/

function read (f) {
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}

// 태그는 빈 자리가 아니라 **빈칸**으로 지운다. 그냥 지우면 태그를 사이에 둔
// 두 글자가 붙어 버린다. '1,000</b></li>' 뒤에 문단이 오면 '1,000Note' 가
// 되고, 그러면 아래 자릿수 쉼표 처리가 걸리지 않아 숫자가 1 과 000 으로
// 쪼개진다. 한국어는 뒤에 '개' 가 붙어 우연히 걸리지 않던 자리다.
function strip (html) {
  return String(html || '').replace(/<[^>]*>/g, ' ')
}

function tags (html) {
  const out = []
  for (const m of String(html || '').matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g)) {
    out.push({ close: m[1] === '/', name: m[2].toLowerCase() })
  }
  return out
}

/*
 * 숫자를 뽑는다.
 *
 * 본문의 고도·방위·시각·각거리는 화면 엔진에서 재서 넣은 실측값이다.
 * 읽는 사람이 화면에서 바로 대조하므로 옮길 때 반올림하면 안 된다.
 * 그런데 반올림은 눈으로 절대 안 잡힌다. 123 과 120 은 나란히 놓아야
 * 보인다.
 *
 * 소수점과 콜론(시각)은 숫자의 일부로 본다. 쉼표는 자릿수 구분이므로 뗀다.
 */
function numbers (text) {
  const out = []
  for (const m of strip(text).replace(/(\d),(?=\d{3}(?!\d))/g, '$1').matchAll(/\d+(?:[.:]\d+)*/g)) {
    out.push(m[0])
  }
  return out
}

function bag (list) {
  const m = new Map()
  for (const x of list) m.set(x, (m.get(x) || 0) + 1)
  return m
}

function bagDiff (a, b) {
  const A = bag(a)
  const B = bag(b)
  const only = []
  for (const [k, n] of A) {
    const d = n - (B.get(k) || 0)
    for (let i = 0; i < d; i++) only.push(k)
  }
  return only
}

/*
 * 태그가 제대로 닫혔는가. 닫히지 않으면 그 단계 화면이 통째로 무너진다.
 */
function unbalanced (html) {
  const stack = []
  for (const t of tags(html)) {
    if (t.name === 'br') continue
    if (!t.close) stack.push(t.name)
    else if (stack.pop() !== t.name) return t.name
  }
  return stack.length ? stack[stack.length - 1] : null
}

function eq (a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function checkLesson (lang, id, out) {
  const basePath = path.join(ROOT, BASE, id + '.json')
  const langPath = path.join(ROOT, lang, id + '.json')
  const err = m => out.errors.push(`${lang}/${id}: ${m}`)
  const warn = m => out.warns.push(`${lang}/${id}: ${m}`)

  const a = read(basePath)
  const b = read(langPath)

  // 1. 옮기지 않는 최상위 값
  for (const k of FROZEN_TOP) {
    if (!eq(a[k], b[k])) err(`${k} 가 원문과 다릅니다 (${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}). 옮기는 값이 아닙니다`)
  }

  // 2. 옮겨야 하는데 비어 있는 것
  for (const k of ['title', 'subtitle', 'intro']) {
    if (!b[k]) err(`${k} 가 비어 있습니다`)
    else if (HANGUL.test(b[k])) err(`${k} 에 한국어가 남아 있습니다`)
  }
  if (a.credits && !b.credits) warn('credits 가 빠졌습니다')
  if (b.credits && HANGUL.test(b.credits)) err('credits 에 한국어가 남아 있습니다')
  if (!Array.isArray(b.tags) || !b.tags.length) err('tags 가 비어 있습니다')
  else {
    if (b.tags.length !== a.tags.length) warn(`태그 개수가 다릅니다 (${a.tags.length} → ${b.tags.length})`)
    for (const t of b.tags) if (HANGUL.test(t)) err(`태그 '${t}' 에 한국어가 남아 있습니다`)
  }

  // 3. 단계
  if (!Array.isArray(b.steps) || a.steps.length !== b.steps.length) {
    err(`단계 수가 다릅니다 (${a.steps.length} → ${b.steps ? b.steps.length : 0}). 여기서 멈춥니다`)
    return
  }

  for (let i = 0; i < a.steps.length; i++) {
    const sa = a.steps[i]
    const sb = b.steps[i]
    const at = m => err(`${i + 1}단계: ${m}`)
    const aw = m => warn(`${i + 1}단계: ${m}`)

    // 3-1. 화면을 만드는 값은 그대로여야 한다
    for (const k of FROZEN_STEP) {
      if (!eq(sa[k], sb[k])) {
        at(`${k} 가 원문과 다릅니다. 옮기는 값이 아닙니다\n      원문: ${JSON.stringify(sa[k])}\n      번역: ${JSON.stringify(sb[k])}`)
      }
    }

    // 3-2. 글
    if (!sb.title) at('title 이 비어 있습니다')
    else if (HANGUL.test(sb.title)) at('title 에 한국어가 남아 있습니다')
    if (!sb.text) at('text 가 비어 있습니다')
    else if (HANGUL.test(strip(sb.text))) at('text 에 한국어가 남아 있습니다')

    // 3-3. HTML
    const open = unbalanced(sb.text)
    if (open) at(`<${open}> 태그가 닫히지 않았습니다. 이 단계 화면이 무너집니다`)
    const blockA = tags(sa.text).filter(t => BLOCK.indexOf(t.name) !== -1).map(t => (t.close ? '/' : '') + t.name)
    const blockB = tags(sb.text).filter(t => BLOCK.indexOf(t.name) !== -1).map(t => (t.close ? '/' : '') + t.name)
    if (!eq(blockA, blockB)) at(`문단 구조가 다릅니다\n      원문: ${blockA.join(' ')}\n      번역: ${blockB.join(' ')}`)
    for (const n of INLINE) {
      const ca = tags(sa.text).filter(t => t.name === n && !t.close).length
      const cb = tags(sb.text).filter(t => t.name === n && !t.close).length
      if (ca !== cb) aw(`<${n}> 개수가 다릅니다 (${ca} → ${cb})`)
    }

    // 3-4. 숫자
    const miss = bagDiff(numbers(sa.text), numbers(sb.text))
    const extra = bagDiff(numbers(sb.text), numbers(sa.text))
    if (miss.length || extra.length) {
      aw(`본문 숫자가 다릅니다 — 빠짐 [${miss.join(', ')}] 늘어남 [${extra.join(', ')}]. ` +
         '실측값이라 어림하면 안 됩니다')
    }

    // 3-5. 퀴즈
    if (!!sa.quiz !== !!sb.quiz) {
      at(sa.quiz ? '퀴즈가 빠졌습니다' : '원문에 없는 퀴즈가 있습니다')
    } else if (sa.quiz) {
      const qa = sa.quiz
      const qb = sb.quiz
      for (const k of ['q', 'explain']) {
        if (!qb[k]) at(`퀴즈 ${k} 가 비어 있습니다`)
        else if (HANGUL.test(strip(qb[k]))) at(`퀴즈 ${k} 에 한국어가 남아 있습니다`)
      }
      if (!Array.isArray(qb.opts) || qb.opts.length !== qa.opts.length) {
        at(`퀴즈 보기 개수가 다릅니다 (${qa.opts.length} → ${qb.opts ? qb.opts.length : 0})`)
      } else {
        qb.opts.forEach((o, j) => {
          if (!o) at(`퀴즈 보기 ${j + 1} 이 비어 있습니다`)
          else if (HANGUL.test(o)) at(`퀴즈 보기 ${j + 1} 에 한국어가 남아 있습니다`)
        })
      }
      if (typeof qb.right !== 'number' || qb.right < 0 || qb.right >= (qb.opts || []).length) {
        at(`퀴즈 right 가 보기 범위 밖입니다 (${qb.right})`)
      } else if (qb.right !== qa.right) {
        aw(`퀴즈 정답 번호가 원문과 다릅니다 (${qa.right} → ${qb.right}). ` +
           `보기 순서를 바꿨다면 맞습니다. 원문 정답은 "${qa.opts[qa.right]}" 였습니다`)
      }
    }
  }
}

function run (lang, only) {
  const dir = path.join(ROOT, lang)
  if (!fs.existsSync(dir)) throw new Error(`${lang} 폴더가 없습니다`)
  const have = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .map(f => f.replace(/\.json$/, ''))
  const ids = only ? [only] : have
  if (only && have.indexOf(only) === -1) throw new Error(`${lang}/${only}.json 이 없습니다`)

  const out = { errors: [], warns: [] }
  for (const id of ids) {
    if (!fs.existsSync(path.join(ROOT, BASE, id + '.json'))) {
      out.errors.push(`${lang}/${id}: 원문(${BASE})에 없는 레슨입니다`)
      continue
    }
    checkLesson(lang, id, out)
  }

  const total = fs.readdirSync(path.join(ROOT, BASE))
    .filter(f => f.endsWith('.json') && f !== 'index.json').length
  for (const m of out.errors) console.log('  ✗ ' + m)
  for (const m of out.warns) console.log('  ! ' + m)
  console.log(`${lang}: ${have.length}/${total}편 옮김, 검사 ${ids.length}편 — ` +
    `오류 ${out.errors.length}, 경고 ${out.warns.length}`)
  return out.errors.length
}

const args = process.argv.slice(2)
const langs = args.length ? [args[0]]
  : fs.readdirSync(ROOT).filter(f => f !== BASE && fs.statSync(path.join(ROOT, f)).isDirectory())
let bad = 0
for (const l of langs) bad += run(l, args[1])
if (bad) process.exit(1)
