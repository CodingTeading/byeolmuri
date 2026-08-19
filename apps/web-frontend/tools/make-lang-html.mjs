// 언어별 정적 HTML 굽기
//
// SPA 라 제목과 설명을 JS 가 바꾼다. 그런데 크롤러가 처음 받는 HTML 에는
// 그 값이 아직 없어서, /ja/ 로 들어와도 한국어 제목이 박힌 문서를 본다.
// 언어 수만큼 index.html 을 미리 구워 그 문제를 없앤다.
//
// dist/
//   index.html        (감지 후 이동. 접두어 없는 예전 링크용)
//   ko/index.html     제목·설명·canonical 이 한국어
//   ja/index.html     ...
//   _redirects        /ja/* 를 ja/index.html 로 넘김
//
// 자산 경로는 절대경로(/js/app.xxx.js)라 하위 폴더에서도 그대로 열린다.

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
  const dir = path.join(DIST, lang)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), localize(src, lang))
}

// 언어 폴더 안의 모든 깊은 주소가 그 언어의 HTML 을 받도록 한다.
// 마지막 줄은 접두어 없는 주소를 위한 기존 SPA 폴백이다.
const redirects = LANGS.map(l => `/${l}/* /${l}/index.html 200`)
  .concat(['/* /index.html 200']).join('\n') + '\n'
fs.writeFileSync(path.join(DIST, '_redirects'), redirects)

console.log(`언어별 HTML ${LANGS.length}개와 _redirects 생성: ${LANGS.join(', ')}`)
