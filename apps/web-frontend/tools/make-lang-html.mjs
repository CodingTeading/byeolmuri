// 언어별 정적 HTML 굽기
//
// SPA 라 제목과 설명을 JS 가 바꾼다. 그런데 크롤러가 처음 받는 HTML 에는
// 그 값이 아직 없어서, /ja/ 로 들어와도 한국어 제목이 박힌 문서를 본다.
// 언어 수만큼 index.html 을 미리 구워 그 문제를 없앤다.
//
// dist/
//   index.html          (접두어 없는 예전 링크용. 감지 후 이동한다)
//   _i18n/ko.html       제목·설명·canonical 이 한국어
//   _i18n/ja.html       ...
//   _redirects          /ja/* 를 /_i18n/ja.html 로 넘김
//
// 대상 파일을 _i18n/ 에 두는 이유가 있다. dist/ja/index.html 로 두면
// 규칙이 "/ja/* -> /ja/index.html" 이 되어 대상이 다시 자기 규칙에
// 걸린다. Cloudflare Pages 는 그런 규칙을 적용하지 않아서 /ja/ 만 열리고
// /ja/p/learn/... 같은 깊은 주소는 전부 기본 index.html 로 떨어졌다.
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
const outDir = path.join(DIST, '_i18n')
fs.mkdirSync(outDir, { recursive: true })
for (const lang of LANGS) {
  fs.writeFileSync(path.join(outDir, lang + '.html'), localize(src, lang))
}

// 언어 접두어가 붙은 모든 주소가 그 언어의 HTML 을 받도록 한다.
// /ko 와 /ko/ 도 따로 적는다. splat 이 빈 문자열을 받는지에 기대지 않는다.
const rules = []
for (const l of LANGS) {
  rules.push(`/${l} /_i18n/${l}.html 200`)
  rules.push(`/${l}/ /_i18n/${l}.html 200`)
  rules.push(`/${l}/* /_i18n/${l}.html 200`)
}
// 접두어 없는 주소는 기존 SPA 폴백을 탄다. 라우터가 언어를 감지해 옮긴다.
rules.push('/* /index.html 200')
fs.writeFileSync(path.join(DIST, '_redirects'), rules.join(String.fromCharCode(10)) + String.fromCharCode(10))

console.log(`언어별 HTML ${LANGS.length}개와 _redirects 생성: ${LANGS.join(', ')}`)
