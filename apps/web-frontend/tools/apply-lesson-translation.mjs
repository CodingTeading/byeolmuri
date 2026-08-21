// 옮긴 글을 원문에 끼워 레슨 파일 만들기
//
//   node tools/apply-lesson-translation.mjs ja big-dipper ~/work/ja/big-dipper.mjs
//
// 레슨 파일을 처음부터 손으로 쓰면 옮기지 않는 값까지 같이 옮겨 적게 된다.
// sky·show 와 성표 식별자가 그것인데, 한 글자만 달라져도 글은 "국자가 가득
// 찹니다" 인데 화면은 다른 상태가 된다. check-lesson-parity.mjs 가 잡아주긴
// 하지만 잡고 고치기를 19편 × 언어 수만큼 되풀이하게 된다.
//
// 그래서 반대로 한다. **원문을 읽어 옮기는 필드만 갈아끼운다.** 그러면
// 옮기지 않는 값은 건드릴 방법이 아예 없다.
//
// 세 번째 인자는 옮긴 글만 담은 파일이다. 이것은 **작업용 파일이라 저장소에
// 두지 않는다.** 저장소에 남는 것은 구워진 content/<lang>/<id>.json 하나뿐이다.
// 둘 다 두면 어느 쪽이 진짜인지 알 수 없게 되고, JSON 을 고친 뒤 이 도구를
// 다시 돌리면 그 수정이 조용히 날아간다.
//
// 파일 모양은 이렇다. 단계 수와 퀴즈 보기 개수는 원문과 같아야 한다.
//
//   export default {
//     title: '…', subtitle: '…', tags: ['…'], intro: '…', credits: '…',
//     steps: [
//       { title: '…', text: '<p>…</p>' },
//       { title: '…', text: '<p>…</p>',
//         quiz: { q: '…', opts: ['…','…','…','…'], right: 1, explain: '…' } }
//     ]
//   }

import fs from 'fs'
import path from 'path'
import url from 'url'

const ROOT = path.resolve('src/plugins/learn/content')
const BASE = 'ko'

const [lang, id, src] = process.argv.slice(2)
if (!lang || !id || !src) {
  throw new Error('사용법: node tools/apply-lesson-translation.mjs <lang> <id> <옮긴-글-파일>')
}
if (lang === BASE) throw new Error(`${BASE} 는 원문입니다. 이 도구로 덮어쓰지 마세요`)

const basePath = path.join(ROOT, BASE, id + '.json')
if (!fs.existsSync(basePath)) throw new Error(`원문이 없습니다: ${basePath}`)

const t = (await import(url.pathToFileURL(path.resolve(src)).href)).default
const d = JSON.parse(fs.readFileSync(basePath, 'utf8'))

for (const k of ['title', 'subtitle', 'intro']) {
  if (!t[k]) throw new Error(`${id}: ${k} 가 없습니다`)
  d[k] = t[k]
}
if (!Array.isArray(t.tags) || !t.tags.length) throw new Error(`${id}: tags 가 없습니다`)
if (t.tags.length !== d.tags.length) {
  console.warn(`${id}: 태그 개수가 원문과 다릅니다 (${d.tags.length} → ${t.tags.length})`)
}
d.tags = t.tags

// 원문에 credits 가 있으면 번역에도 있어야 한다. 출처를 조용히 떨어뜨리지 않는다.
if (d.credits) {
  if (!t.credits) throw new Error(`${id}: credits 가 없습니다`)
  d.credits = t.credits
}

if (!Array.isArray(t.steps) || t.steps.length !== d.steps.length) {
  throw new Error(`${id}: 단계 수가 다릅니다 (원문 ${d.steps.length}, 번역 ${t.steps ? t.steps.length : 0})`)
}

d.steps.forEach((s, i) => {
  const n = t.steps[i]
  if (!n || !n.title || !n.text) throw new Error(`${id} ${i + 1}단계: title/text 가 없습니다`)
  s.title = n.title
  s.text = n.text
  if (!!s.quiz !== !!n.quiz) throw new Error(`${id} ${i + 1}단계: 퀴즈 유무가 원문과 다릅니다`)
  if (s.quiz) {
    if (!Array.isArray(n.quiz.opts) || s.quiz.opts.length !== n.quiz.opts.length) {
      throw new Error(`${id} ${i + 1}단계: 보기 개수가 다릅니다 ` +
        `(${s.quiz.opts.length} → ${n.quiz.opts ? n.quiz.opts.length : 0})`)
    }
    if (typeof n.quiz.right !== 'number' || n.quiz.right < 0 || n.quiz.right >= n.quiz.opts.length) {
      throw new Error(`${id} ${i + 1}단계: 퀴즈 right 가 보기 범위 밖입니다 (${n.quiz.right})`)
    }
    s.quiz.q = n.quiz.q
    s.quiz.opts = n.quiz.opts
    s.quiz.right = n.quiz.right
    s.quiz.explain = n.quiz.explain
  }
})

const dir = path.join(ROOT, lang)
fs.mkdirSync(dir, { recursive: true })
const out = path.join(dir, id + '.json')
fs.writeFileSync(out, JSON.stringify(d, null, 1) + '\n')
console.log(`${lang}/${id}.json — ${d.steps.length}단계. 이어서 check-lesson-parity.mjs 로 대조하세요`)
