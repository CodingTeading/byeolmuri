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
 * 레슨 목록.
 *
 * 기본 언어의 목록이 뼈대다. 그 위에 해당 언어로 옮겨진 레슨만 덮어쓴다.
 * 통째로 갈아끼우지 않는 이유는 **번역이 한 편씩 들어오기 때문**이다.
 * 옮긴 것만 있는 목록을 그대로 쓰면 아직 안 옮긴 레슨이 목록에서 아예
 * 사라진다. 한국어로 보이는 것도 아니고 없어진다. 그러면 열 편을 옮기는
 * 동안 포털은 아홉 편이 없는 앱이 된다.
 *
 * 순서도 뼈대에서 온다. 기본 언어의 순서는 손으로 고른 학습 순서이고,
 * 새 언어 폴더의 목록은 파일 이름 순서라 그것을 물려받아야 한다.
 *
 * 항목마다 translated 를 달아 둔다. 목록 화면이 아직 옮기지 않은 레슨을
 * 표시할 수 있어야 한다. 조용히 기본 언어를 보여주지 않는 것이 이 층의
 * 규칙이다.
 */
export function loadIndex (lang) {
  const base = get(DEFAULT_LANG, 'index')
  const spine = base ? base.lessons : []
  const own = get(lang, 'index')
  if (!own || lang === DEFAULT_LANG) {
    return {
      lessons: spine.map(l => Object.assign({}, l, { translated: lang === DEFAULT_LANG })),
      translated: lang === DEFAULT_LANG
    }
  }

  const mine = {}
  for (const l of own.lessons) mine[l.id] = l
  const lessons = spine.map(l => Object.assign({}, mine[l.id] || l, { translated: !!mine[l.id] }))

  // 뼈대에 없고 그 언어에만 있는 레슨. 지금은 없지만 생기면 뒤에 붙인다.
  const known = {}
  for (const l of spine) known[l.id] = true
  for (const l of own.lessons) {
    if (!known[l.id]) lessons.push(Object.assign({}, l, { translated: true }))
  }

  return { lessons, translated: lessons.every(l => l.translated) }
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
