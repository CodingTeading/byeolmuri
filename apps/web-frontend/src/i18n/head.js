// 언어에 따라 문서 머리말을 갱신한다.
//
// SPA 라 서버가 언어별 HTML 을 따로 굽지 않는다. 대신 주소에 언어가
// 들어가므로 각 주소를 크롤러가 따로 수집하고, 그때 여기서 넣는 제목과
// 설명을 읽는다. hreflang 으로 서로가 같은 문서의 다른 언어판임을 알린다.

import meta from './meta.json'
import { LANGS, withLang } from './langs'

const SITE = 'https://byeolmuri.codingteading.com'

// 페이지마다 다른 제목을 대 주는 함수들. 플러그인이 pageMeta 를 내보내면
// main.js 가 여기 등록한다.
//
// 왜 필요한가. 이것이 없으면 라우터가 어느 주소에서나 사이트 전체의
// 제목을 덮어쓴다. tools/make-lang-html.mjs 가 레슨 76개의 제목을 정적
// HTML 에 구워 두는데, 앱이 뜨자마자 그것을 지워 버리는 셈이 된다.
const resolvers = []

export function addPageResolver (fn) {
  if (typeof fn === 'function') resolvers.push(fn)
}

function resolvePage (lang, path) {
  for (const fn of resolvers) {
    const page = fn(lang, path)
    if (page && page.title) return page
  }
  return null
}

/*
 * 정규 주소의 모양을 하나로 맞춘다.
 *
 * 첫 화면은 끝에 빗금이 있고(/ko/), 레슨은 없다(/ko/p/learn/big-dipper).
 * tools/make-lang-html.mjs 와 sitemap 이 그렇게 적으므로 여기도 같아야
 * 한다. 어긋나면 hreflang 이 정규 주소가 아닌 곳을 가리키게 된다.
 */
function canonicalPath (path, lang) {
  const p = withLang(path, lang)
  return p === '/' + lang ? p + '/' : p.replace(/\/$/, '')
}

function upsert (selector, create) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  return el
}

function setMeta (attr, name, content) {
  const el = upsert(`meta[${attr}="${name}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute(attr, name)
    return m
  })
  el.setAttribute('content', content)
}

export function applyHead (lang, path) {
  const m = meta[lang] || meta.ko
  const page = resolvePage(lang, path)
  // 레슨 제목 뒤에 브랜드명만 붙인다. meta.title 을 통째로 붙이면
  // "북두칠성은 어디일까? – 별무리 – 밤하늘 배우기와 …" 가 된다.
  const title = page ? page.title + ' – ' + m.title.split(' – ')[0] : m.title
  const description = page ? page.description : m.description
  document.title = title
  document.documentElement.lang = lang
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:type', page ? 'article' : 'website')
  setMeta('property', 'og:locale', lang === 'ko' ? 'ko_KR' : lang)
  setMeta('property', 'og:url', SITE + canonicalPath(path, lang))
  setMeta('property', 'og:image', SITE + '/og/' + lang + '.png')

  // 정규 주소는 언어 접두어가 붙은 쪽이다.
  const canonical = upsert('link[rel="canonical"]', () => {
    const l = document.createElement('link')
    l.setAttribute('rel', 'canonical')
    return l
  })
  canonical.setAttribute('href', SITE + canonicalPath(path, lang))

  // 언어판 상호 링크. 기존 것을 지우고 다시 넣는다.
  for (const old of document.head.querySelectorAll('link[rel="alternate"][hreflang]')) {
    old.remove()
  }
  for (const l of LANGS.concat(['x-default'])) {
    const link = document.createElement('link')
    link.setAttribute('rel', 'alternate')
    link.setAttribute('hreflang', l)
    link.setAttribute('href', SITE + canonicalPath(path, l === 'x-default' ? 'ko' : l))
    document.head.appendChild(link)
  }
}

export default { applyHead, addPageResolver }
