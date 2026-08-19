// 언어에 따라 문서 머리말을 갱신한다.
//
// SPA 라 서버가 언어별 HTML 을 따로 굽지 않는다. 대신 주소에 언어가
// 들어가므로 각 주소를 크롤러가 따로 수집하고, 그때 여기서 넣는 제목과
// 설명을 읽는다. hreflang 으로 서로가 같은 문서의 다른 언어판임을 알린다.

import meta from './meta.json'
import { LANGS, withLang } from './langs'

const SITE = 'https://byeolmuri.codingteading.com'

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
  document.title = m.title
  document.documentElement.lang = lang
  setMeta('name', 'description', m.description)
  setMeta('property', 'og:title', m.title)
  setMeta('property', 'og:description', m.description)
  setMeta('property', 'og:locale', lang === 'ko' ? 'ko_KR' : lang)
  setMeta('property', 'og:url', SITE + path)

  // 정규 주소는 언어 접두어가 붙은 쪽이다.
  const canonical = upsert('link[rel="canonical"]', () => {
    const l = document.createElement('link')
    l.setAttribute('rel', 'canonical')
    return l
  })
  canonical.setAttribute('href', SITE + path)

  // 언어판 상호 링크. 기존 것을 지우고 다시 넣는다.
  for (const old of document.head.querySelectorAll('link[rel="alternate"][hreflang]')) {
    old.remove()
  }
  for (const l of LANGS.concat(['x-default'])) {
    const link = document.createElement('link')
    link.setAttribute('rel', 'alternate')
    link.setAttribute('hreflang', l)
    link.setAttribute('href', SITE + withLang(path, l === 'x-default' ? 'ko' : l))
    document.head.appendChild(link)
  }
}

export default { applyHead }
