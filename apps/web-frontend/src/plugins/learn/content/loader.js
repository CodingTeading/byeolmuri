// 레슨 콘텐츠 로더
//
// 언어층이 UI 문구와 다르게 움직인다. UI 는 네 언어가 다 채워져 있지만
// 레슨 본문은 한국어에서 출발해 하나씩 옮겨간다. 그래서 없는 언어는
// 한국어로 떨어뜨리되, 그 사실을 화면에 알린다. 조용히 다른 언어를
// 보여주면 사용자는 번역이 끝난 줄 안다.

import { DEFAULT_LANG } from '@/i18n/langs'

// webpack 이 content 아래 json 을 모두 묶어 두고 필요할 때 꺼내 쓴다.
const ctx = require.context('./', true, /\.\/[a-z]{2}\/[\w-]+\.json$/)

function get (lang, name) {
  const key = './' + lang + '/' + name + '.json'
  return ctx.keys().indexOf(key) !== -1 ? ctx(key) : null
}

/*
 * 레슨 목록. 해당 언어에 목록이 없으면 기본 언어의 목록을 쓴다.
 */
export function loadIndex (lang) {
  const own = get(lang, 'index')
  if (own) return { lessons: own.lessons, translated: true }
  const base = get(DEFAULT_LANG, 'index')
  return { lessons: base ? base.lessons : [], translated: false }
}

/*
 * 레슨 하나. { lesson, translated } 를 돌려준다.
 * translated 가 false 면 화면에 "아직 번역되지 않았다"고 알려야 한다.
 */
export function loadLesson (lang, id) {
  const own = get(lang, id)
  if (own) return { lesson: own, translated: true }
  const base = get(DEFAULT_LANG, id)
  return { lesson: base || null, translated: false }
}

export default { loadIndex, loadLesson }
