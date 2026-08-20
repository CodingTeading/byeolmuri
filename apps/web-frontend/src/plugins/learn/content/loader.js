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

/*
 * 이 레슨을 지금 볼 만한가.
 *
 * 레슨의 months 는 그 주제가 초저녁 하늘에 잘 놓이는 달이다.
 * 8월에 오리온 레슨을 첫 화면에 띄우면 "밖에 나가 확인하라"는 마무리가
 * 공허해진다. months 가 없으면 연중 아무 때나 볼 수 있다는 뜻이다.
 *
 * 남반구는 계절이 반대지만 지금은 다루지 않는다. 다루게 되면 관측지의
 * 위도 부호를 보고 6개월을 밀면 된다.
 */
export function inSeason (lesson, date) {
  const months = lesson && lesson.months
  if (!months || !months.length) return true
  const m = (date || new Date()).getMonth() + 1
  return months.indexOf(m) !== -1
}

/*
 * 지금 볼 수 있는 것을 앞으로 보낸다. 목록에서 빼지는 않는다.
 * 겨울 레슨을 여름에 읽는 것을 막을 이유는 없다.
 */
export function sortBySeason (lessons, date) {
  const d = date || new Date()
  return lessons.slice().sort((a, b) => {
    const ia = inSeason(a, d) ? 0 : 1
    const ib = inSeason(b, d) ? 0 : 1
    return ia - ib
  })
}

export default { loadIndex, loadLesson, inSeason, sortBySeason }
