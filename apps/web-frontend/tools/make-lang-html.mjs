// 언어별 정적 HTML 굽기
//
// SPA 라 제목과 설명을 JS 가 바꾼다. 그런데 크롤러가 처음 받는 HTML 에는
// 그 값이 아직 없어서, /ja/ 로 들어와도 한국어 제목이 박힌 문서를 본다.
// 언어 수만큼 index.html 을 미리 구워 그 문제를 없앤다.
//
// dist/
//   index.html          (접두어 없는 예전 링크용. 감지 후 이동한다)
//   _i18n/ko/index.html 제목·설명·canonical 이 한국어
//   _i18n/ja/index.html ...
//   _redirects          /ja/* 를 /_i18n/ja/ 로 넘김
//
// 대상을 이런 모양으로 두는 데는 이유가 두 가지 있다.
//
// 1. 대상에 .html 을 쓰면 안 된다. Cloudflare Pages 는 주소에서 .html 을
//    떼는 정규화를 하는데, _redirects 의 대상에도 그게 걸려서 200 재작성이
//    308 이동으로 바뀐다. 주소창이 /_i18n/ja 로 바뀌어 버린다.
// 2. 대상이 규칙 자신에 다시 걸리면 안 된다. /ja/* -> /ja/ 로 두면
//    대상이 또 /ja/* 에 걸려 규칙이 통째로 무시된다.
//
// 자산 경로는 절대경로(/js/app.xxx.js)라 어느 깊이에서도 그대로 열린다.

import fs from 'fs'
import path from 'path'

const DIST = path.resolve('dist')
const SITE = 'https://byeolmuri.codingteading.com'

const meta = JSON.parse(fs.readFileSync('src/i18n/meta.json', 'utf8'))
const LANGS = Object.keys(meta)

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function localize (html, lang) {
  const m = meta[lang]
  let out = html

  out = out.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
  out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(m.description)}$2`)
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(m.title)}$2`)
  out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(m.description)}$2`)
  out = out.replace(/(<meta property="og:locale" content=")[^"]*(")/,
    `$1${lang === 'ko' ? 'ko_KR' : lang}$2`)
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}/${lang}/$2`)
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}/${lang}/$2`)

  // 언어판 상호 링크
  const alts = LANGS.map(l =>
    `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/">`)
    .concat([`<link rel="alternate" hreflang="x-default" href="${SITE}/ko/">`])
    .join('\n    ')
  out = out.replace('</head>', `  ${alts}\n  </head>`)
  return out
}

const src = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
for (const lang of LANGS) {
  const dir = path.join(DIST, '_i18n', lang)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), localize(src, lang))
}

// 언어 접두어가 붙은 모든 주소가 그 언어의 HTML 을 받도록 한다.
// /ko 와 /ko/ 도 따로 적는다. splat 이 빈 문자열을 받는지에 기대지 않는다.
const rules = []
for (const l of LANGS) {
  rules.push(`/${l} /_i18n/${l}/ 200`)
  rules.push(`/${l}/ /_i18n/${l}/ 200`)
  rules.push(`/${l}/* /_i18n/${l}/ 200`)
}
// 접두어 없는 주소는 기존 SPA 폴백을 탄다. 라우터가 언어를 감지해 옮긴다.
rules.push('/* /index.html 200')
fs.writeFileSync(path.join(DIST, '_redirects'), rules.join(String.fromCharCode(10)) + String.fromCharCode(10))

console.log(`언어별 HTML ${LANGS.length}개와 _redirects 생성: ${LANGS.join(', ')}`)
