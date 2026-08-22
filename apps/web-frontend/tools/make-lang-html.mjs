// 언어별 · 레슨별 정적 HTML, sitemap, robots 굽기
//
// SPA 라 제목과 설명을 JS 가 바꾼다. 그런데 크롤러가 처음 받는 HTML 에는
// 그 값이 아직 없어서, /ja/ 로 들어와도 한국어 제목이 박힌 문서를 본다.
// 언어 수만큼 index.html 을 미리 구워 그 문제를 없앤다.
//
// **레슨도 따로 굽는다.** 굽지 않으면 76개 주소(19편 × 4언어)가 전부
// 같은 제목과 설명을 내놓아 크롤러에게는 한 페이지의 복사본으로 보인다.
// 더 아픈 것은 카카오톡 · 슬랙 · 트위터의 미리보기다. 그것들은 JS 를
// 돌리지 않으므로, 레슨 링크를 공유하면 무엇을 공유했는지가 카드에
// 나오지 않는다. applyHead 로는 이 문제를 풀 수 없다.
//
// dist/
//   index.html                        (접두어 없는 예전 링크용)
//   _i18n/ko/index.html               제목·설명·canonical 이 한국어
//   _i18n/ko/p/learn/big-dipper/…     레슨의 제목과 도입부
//   sitemap.xml                       포털 4 + 레슨 76
//   robots.txt
//   _redirects
//
// 대상을 이런 모양으로 두는 데는 이유가 두 가지 있다.
//
// 1. 대상에 .html 을 쓰면 안 된다. Cloudflare Pages 는 주소에서 .html 을
//    떼는 정규화를 하는데, _redirects 의 대상에도 그게 걸려서 200 재작성이
//    308 이동으로 바뀐다. 주소창이 /_i18n/ja 로 바뀌어 버린다.
// 2. 대상이 규칙 자신에 다시 걸리면 안 된다. /ja/* -> /ja/ 로 두면
//    대상이 또 /ja/* 에 걸려 규칙이 통째로 무시된다.
//
// _redirects 는 **첫 일치가 이긴다.** 그래서 레슨 규칙을 언어 전체 규칙
// 보다 먼저 적어야 한다. 순서를 뒤집으면 레슨 HTML 이 영영 안 쓰인다.
//
// 자산 경로는 절대경로(/js/app.xxx.js)라 어느 깊이에서도 그대로 열린다.

import fs from 'fs'
import path from 'path'

const DIST = path.resolve('dist')
const CONTENT = path.resolve('src/plugins/learn/content')
const SITE = 'https://byeolmuri.codingteading.com'

const meta = JSON.parse(fs.readFileSync('src/i18n/meta.json', 'utf8'))
const LANGS = Object.keys(meta)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 설명은 검색 결과에서 잘린다. 문장 중간에 끊기지 않도록 마지막 문장
// 경계에서 자른다.
function clip (text, max) {
  const s = String(text).replace(/\s+/g, ' ').trim()
  if (s.length <= max) return s
  const cut = s.slice(0, max)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('다. '))
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.trimEnd() + '…')
}

function lessonsFor (lang) {
  const idx = path.join(CONTENT, lang, 'index.json')
  if (!fs.existsSync(idx)) return []
  const list = JSON.parse(fs.readFileSync(idx, 'utf8')).lessons || []
  return list.map(l => {
    const file = path.join(CONTENT, lang, l.id + '.json')
    let intro = l.subtitle || ''
    if (fs.existsSync(file)) {
      const body = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (body.intro) intro = body.intro
    }
    return { id: l.id, title: l.title, description: clip(intro, 200) }
  })
}

/*
 * 머리말을 갈아끼운다. page 를 주면 그 페이지의 제목과 설명을 쓴다.
 * 주지 않으면 사이트 전체의 것을 쓴다.
 */
function localize (html, lang, page) {
  const m = meta[lang]
  const title = page ? `${page.title} – ${m.title.split(' – ')[0]}` : m.title
  const description = page ? page.description : m.description
  const urlPath = page ? `/${lang}/p/learn/${page.id}` : `/${lang}/`
  let out = html

  out = out.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
  out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
  out = out.replace(/(<meta property="og:locale" content=")[^"]*(")/,
    `$1${lang === 'ko' ? 'ko_KR' : lang}$2`)
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}${urlPath}$2`)
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}${urlPath}$2`)
  out = out.replace(/(<meta property="og:image" content=")[^"]*(")/,
    `$1${SITE}/og/${lang}.png$2`)
  // 레슨은 og:type 이 article 이다. 사이트 첫 화면만 website 다.
  if (page) {
    out = out.replace(/(<meta property="og:type" content=")[^"]*(")/, '$1article$2')
  }

  // 언어판 상호 링크. 레슨은 같은 레슨의 다른 언어판을 가리킨다.
  const alt = l => page ? `${SITE}/${l}/p/learn/${page.id}` : `${SITE}/${l}/`
  const alts = LANGS.map(l =>
    `<link rel="alternate" hreflang="${l}" href="${alt(l)}">`)
    .concat([`<link rel="alternate" hreflang="x-default" href="${alt('ko')}">`])
    .join('\n    ')
  out = out.replace('</head>', `  ${alts}\n  </head>`)
  return out
}

const src = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
const rules = []
const urls = []
let lessonPages = 0

for (const lang of LANGS) {
  const dir = path.join(DIST, '_i18n', lang)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), localize(src, lang))
  urls.push({ loc: `${SITE}/${lang}/`, alt: l => `${SITE}/${l}/` })

  for (const lesson of lessonsFor(lang)) {
    const ldir = path.join(dir, 'p', 'learn', lesson.id)
    fs.mkdirSync(ldir, { recursive: true })
    fs.writeFileSync(path.join(ldir, 'index.html'), localize(src, lang, lesson))
    lessonPages++
    // 레슨 규칙이 먼저 와야 한다. _redirects 는 첫 일치가 이긴다.
    const from = `/${lang}/p/learn/${lesson.id}`
    const to = `/_i18n/${lang}/p/learn/${lesson.id}/`
    rules.push(`${from} ${to} 200`)
    rules.push(`${from}/ ${to} 200`)
    urls.push({
      loc: `${SITE}/${lang}/p/learn/${lesson.id}`,
      alt: l => `${SITE}/${l}/p/learn/${lesson.id}`
    })
  }
}

// 언어 접두어가 붙은 나머지 주소는 그 언어의 첫 화면 HTML 을 받는다.
// /ko 와 /ko/ 도 따로 적는다. splat 이 빈 문자열을 받는지에 기대지 않는다.
for (const l of LANGS) {
  rules.push(`/${l} /_i18n/${l}/ 200`)
  rules.push(`/${l}/ /_i18n/${l}/ 200`)
  rules.push(`/${l}/* /_i18n/${l}/ 200`)
}
// 접두어 없는 주소는 기존 SPA 폴백을 탄다. 라우터가 언어를 감지해 옮긴다.
rules.push('/* /index.html 200')
fs.writeFileSync(path.join(DIST, '_redirects'), rules.join('\n') + '\n')

// sitemap. 언어판을 xhtml:link 로 서로 묶어 준다. 그러지 않으면 네 언어가
// 서로의 중복 문서로 보인다.
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">'
]
for (const u of urls) {
  sitemap.push('  <url>')
  sitemap.push(`    <loc>${esc(u.loc)}</loc>`)
  for (const l of LANGS) {
    sitemap.push(`    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(u.alt(l))}"/>`)
  }
  sitemap.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(u.alt('ko'))}"/>`)
  sitemap.push('  </url>')
}
sitemap.push('</urlset>')
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap.join('\n') + '\n')

// robots. 막을 것은 없다. sitemap 을 가리키는 것이 요점이다.
// _i18n 은 재작성의 대상일 뿐 정규 주소가 아니라 수집을 막는다.
fs.writeFileSync(path.join(DIST, 'robots.txt'), [
  'User-agent: *',
  'Allow: /',
  'Disallow: /_i18n/',
  '',
  `Sitemap: ${SITE}/sitemap.xml`,
  ''
].join('\n'))

console.log(`언어별 HTML ${LANGS.length}개 · 레슨 HTML ${lessonPages}개 · ` +
  `sitemap ${urls.length}개 주소 · robots.txt · _redirects ${rules.length}줄`)
