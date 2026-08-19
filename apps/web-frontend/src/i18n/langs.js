// 별무리 다국어 - 언어 결정과 URL 규칙
//
// URL 에 언어를 경로로 담는다. /ko/p/learn, /ja/skysource/Vega 처럼.
// 검색엔진이 언어별로 따로 수집할 수 있고 캐시도 언어별로 갈린다.
//
// 접두어가 없는 주소(/skysource/직녀성 같은 예전 공유 링크)도 살려둔다.
// 그런 요청은 감지한 언어의 주소로 옮겨 준다. 링크를 깨지 않으면서
// 정규 주소는 접두어가 붙은 쪽으로 모은다.

export const LANGS = ['ko', 'en', 'ja', 'es']

export const LANG_NAMES = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  es: 'Español'
}

// 우리는 한국의 밤하늘에서 출발한 프로젝트라 기본값이 한국어다.
export const DEFAULT_LANG = 'ko'

const STORAGE_KEY = 'byeolmuri.lang'

export function isLang (v) {
  return LANGS.indexOf(v) !== -1
}

/*
 * 주소에서 언어 접두어를 떼어낸다.
 *   '/ko/p/learn' -> { lang: 'ko', rest: '/p/learn' }
 *   '/p/learn'    -> { lang: null, rest: '/p/learn' }
 */
export function splitPath (path) {
  const m = /^\/([A-Za-z-]+)(\/.*)?$/.exec(path || '/')
  if (m && isLang(m[1])) {
    return { lang: m[1], rest: m[2] || '/' }
  }
  return { lang: null, rest: path || '/' }
}

export function withLang (path, lang) {
  const rest = splitPath(path).rest
  return '/' + lang + (rest === '/' ? '' : rest)
}

/*
 * 쓸 언어를 정한다. 앞의 것이 이긴다.
 *   1. 주소의 접두어      — 공유된 링크는 보낸 사람의 언어를 지켜야 한다
 *   2. 저장된 선택        — 사용자가 직접 고른 적이 있으면 그게 우선
 *   3. 브라우저 언어
 *   4. 기본값
 */
export function detect (path) {
  const fromPath = splitPath(path).lang
  if (fromPath) return fromPath

  let saved = null
  try { saved = window.localStorage.getItem(STORAGE_KEY) } catch (e) { saved = null }
  if (isLang(saved)) return saved

  const nav = (navigator.languages && navigator.languages.length)
    ? navigator.languages : [navigator.language || navigator.userLanguage || '']
  for (const l of nav) {
    const base = String(l).toLowerCase().split('-')[0]
    if (isLang(base)) return base
  }
  return DEFAULT_LANG
}

export function remember (lang) {
  if (!isLang(lang)) return
  try { window.localStorage.setItem(STORAGE_KEY, lang) } catch (e) {}
}

// moment 는 언어 코드가 우리와 같지만 ko/ja/es 로케일 파일을 따로 불러와야 한다.
export function momentLocale (lang) {
  return isLang(lang) ? lang : 'en'
}

export default { LANGS, LANG_NAMES, DEFAULT_LANG, isLang, splitPath, withLang, detect, remember, momentLocale }
