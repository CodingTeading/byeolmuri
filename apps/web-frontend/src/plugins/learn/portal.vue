<template>
<div class="portal">
  <!-- 하늘 배경. 엔진이 아니라 CSS 로 그린다. 포털은 WASM 을 띄우지 않는다. -->
  <div class="sky" aria-hidden="true">
    <div class="glow glow-a"></div>
    <div class="glow glow-b"></div>
    <div class="band"></div>
    <div class="layer layer-far" :style="{ boxShadow: starsFar }"></div>
    <div class="layer layer-mid" :style="{ boxShadow: starsMid }"></div>
    <div class="layer layer-near" :style="{ boxShadow: starsNear }"></div>
  </div>

  <header class="nav">
    <div class="wrap nav-inner">
      <router-link :to="$lpath('/')" class="brand">
        <img src="@/assets/images/logo.svg" width="30" height="30" alt="" />
        <span>{{ $t('portal.brand') }}</span>
      </router-link>
      <nav class="nav-links">
        <router-link :to="$lpath('/sky')" class="nav-link">{{ $t('portal.openSky') }}</router-link>
        <router-link :to="$lpath('/p/tonight')" class="nav-link hide-narrow">{{ $t('planner.tab') }}</router-link>
        <label class="lang">
          <span class="sr-only">{{ $t('portal.language') }}</span>
          <select :value="$i18n.locale" @change="switchLang($event.target.value)">
            <option v-for="l in langs" :key="l" :value="l">{{ langNames[l] }}</option>
          </select>
        </label>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="wrap">
      <p class="badge">{{ $t('portal.badge') }}</p>
      <h1>{{ $t('portal.headline') }}</h1>
      <p class="lead">{{ $t('portal.lead') }}</p>
      <div class="cta">
        <a href="#lessons" class="btn btn-primary" @click.prevent="scrollToLessons">
          {{ $t('portal.startLearning') }}
        </a>
        <router-link :to="$lpath('/sky')" class="btn btn-ghost">
          {{ $t('portal.openSky') }} <span aria-hidden="true">→</span>
        </router-link>
      </div>
      <dl class="stats">
        <div><dt>{{ lessons.length }}</dt><dd>{{ $t('portal.statLessons') }}</dd></div>
        <div><dt>{{ totalSteps }}</dt><dd>{{ $t('portal.statSteps') }}</dd></div>
        <div><dt>{{ langs.length }}</dt><dd>{{ $t('portal.statLangs') }}</dd></div>
      </dl>
    </div>
  </section>

  <!-- 지금 나가서 확인할 수 있는 것부터. 철 지난 레슨을 첫 화면에 띄우면
       "밖에 나가 보라"는 마무리가 공허해진다. -->
  <section v-if="tonight.length" class="tonight">
    <div class="wrap">
      <h2 class="sec-title">
        <span class="dot-live"></span>{{ $t('portal.tonight') }}
        <span class="sec-sub">{{ monthName }}</span>
      </h2>
      <p class="sec-lead">{{ $t('portal.tonightLead') }}</p>
      <ul class="cards cards-tonight">
        <li v-for="l in tonight" :key="l.id">
          <router-link :to="lessonPath(l)" class="card card-hi" :class="'t-' + l.track">
            <span class="track">{{ $t('learn.track.' + l.track) }}</span>
            <h3>{{ l.title }}</h3>
            <p>{{ l.subtitle }}</p>
            <span class="meta">
              <span>{{ $t('learn.level.' + l.level) }}</span>
              <span>{{ $t('learn.minutes', { n: l.minutes }) }}</span>
              <span>{{ $t('portal.steps', { n: l.steps }) }}</span>
              <span class="season now">{{ $t('portal.seasonNow') }}</span>
            </span>
          </router-link>
        </li>
      </ul>
    </div>
  </section>

  <main class="wrap" id="lessons" ref="lessons">
    <h2 class="sec-title">{{ $t('portal.lessons') }}</h2>

    <div class="controls">
      <div class="search">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input type="search" v-model="q" :placeholder="$t('portal.search')" :aria-label="$t('portal.search')" />
      </div>
      <div class="chips" role="group" :aria-label="$t('portal.lessons')">
        <button v-for="t in trackFilters" :key="t"
                class="chip" :class="['t-' + t, { on: track === t }]"
                :aria-pressed="String(track === t)" @click="track = t">
          {{ t === 'all' ? $t('portal.all') : $t('learn.track.' + t) }}
        </button>
        <button class="chip chip-season" :class="{ on: seasonOnly }"
                :aria-pressed="String(seasonOnly)" @click="seasonOnly = !seasonOnly">
          {{ $t('portal.inSeasonOnly') }}
        </button>
      </div>
    </div>

    <!-- 조건이 없을 때는 갈래별로 묶어서 보여준다. 레슨을 나누는 축이
         난이도가 아니라 '어떤 질문에 답하는가' 라는 것이 한눈에 보이도록. -->
    <template v-if="grouping">
      <section v-for="t in tracks" :key="t" class="group">
        <h3 class="group-title" :class="'t-' + t">
          {{ $t('learn.track.' + t) }}
          <span class="group-count">{{ byTrack(t).length }}</span>
        </h3>
        <p class="group-desc">{{ $t('learn.trackDesc.' + t) }}</p>
        <ul class="cards">
          <li v-for="l in byTrack(t)" :key="l.id">
            <router-link :to="lessonPath(l)" class="card" :class="['t-' + l.track, { off: !inSeason(l) }]">
              <span class="track">{{ $t('learn.track.' + l.track) }}</span>
              <h3>{{ l.title }}</h3>
              <p>{{ l.subtitle }}</p>
              <span class="tags">{{ l.tags.join(' · ') }}</span>
              <span class="meta">
                <span>{{ $t('learn.level.' + l.level) }}</span>
                <span>{{ $t('learn.minutes', { n: l.minutes }) }}</span>
                <span>{{ $t('portal.steps', { n: l.steps }) }}</span>
                <span class="season" :class="{ now: inSeason(l) }">{{ seasonLabel(l) }}</span>
              </span>
            </router-link>
          </li>
        </ul>
      </section>
    </template>

    <template v-else>
      <p class="count">{{ $t('portal.results', { n: filtered.length }) }}</p>
      <ul class="cards">
        <li v-for="l in filtered" :key="l.id">
          <router-link :to="lessonPath(l)" class="card" :class="['t-' + l.track, { off: !inSeason(l) }]">
            <span class="track">{{ $t('learn.track.' + l.track) }}</span>
            <h3>{{ l.title }}</h3>
            <p>{{ l.subtitle }}</p>
            <span class="tags">{{ l.tags.join(' · ') }}</span>
            <span class="meta">
              <span>{{ $t('learn.level.' + l.level) }}</span>
              <span>{{ $t('learn.minutes', { n: l.minutes }) }}</span>
              <span>{{ $t('portal.steps', { n: l.steps }) }}</span>
              <span class="season" :class="{ now: inSeason(l) }">{{ seasonLabel(l) }}</span>
            </span>
          </router-link>
        </li>
      </ul>
      <p v-if="!filtered.length" class="empty">
        {{ $t('portal.noResults') }}
        <button class="linkish" @click="clearFilters">{{ $t('portal.reset') }}</button>
      </p>
    </template>

    <section class="how">
      <h2 class="sec-title">{{ $t('portal.how') }}</h2>
      <ol class="how-list">
        <li v-for="n in 3" :key="n">
          <span class="how-n">{{ n }}</span>
          <h3>{{ $t('portal.how' + n + 'Title') }}</h3>
          <p>{{ $t('portal.how' + n + 'Body') }}</p>
        </li>
      </ol>
    </section>
  </main>

  <footer class="foot">
    <div class="wrap">
      <p class="foot-brand">
        <img src="@/assets/images/logo.svg" width="22" height="22" alt="" />
        {{ $t('portal.brand') }}
      </p>
      <p>{{ $t('portal.footNonprofit') }}</p>
      <p>
        <a href="https://github.com/CodingTeading/byeolmuri" target="_blank" rel="noopener">
          github.com/CodingTeading/byeolmuri</a>
        · AGPL-3.0
      </p>
      <p class="disclaimer">{{ $t('portal.footDisclaimer') }}</p>
    </div>
  </footer>
</div>
</template>

<script>
import loader from './content/loader'
import langsMod from '@/i18n/langs'

// 배경 별. 한 겹에 점 하나만 두고 box-shadow 로 복제한다.
// 요소를 수백 개 만들지 않으면서 깊이가 다른 세 겹을 얻는다.
function starfield (count, seed, spread, maxAlpha) {
  // 씨앗을 고정해 매번 같은 하늘이 나오게 한다.
  let s = seed
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const out = []
  for (let i = 0; i < count; i++) {
    const x = (rnd() * spread).toFixed(0)
    const y = (rnd() * 100).toFixed(0)
    const a = (0.25 + rnd() * maxAlpha).toFixed(2)
    out.push(x + 'vw ' + y + 'vh 0 rgba(255,255,255,' + a + ')')
  }
  return out.join(',')
}

export default {
  data: function () {
    return {
      lessons: [],
      q: '',
      track: 'all',
      seasonOnly: false,
      tracks: ['principle', 'target', 'measure'],
      langs: langsMod.LANGS,
      langNames: langsMod.LANG_NAMES,
      starsFar: '',
      starsMid: '',
      starsNear: ''
    }
  },
  computed: {
    trackFilters: function () { return ['all'].concat(this.tracks) },
    totalSteps: function () {
      return this.lessons.reduce((n, l) => n + (l.steps || 0), 0)
    },
    monthName: function () {
      try {
        return new Intl.DateTimeFormat(this.$i18n.locale, { month: 'long' }).format(new Date())
      } catch (e) { return '' }
    },
    // 계절 레슨을 앞에 세우되, 연중 레슨으로 빈자리를 채운다.
    tonight: function () {
      const seasonal = this.lessons.filter(l => l.months && loader.inSeason(l))
      const evergreen = this.lessons.filter(l => !l.months)
      return seasonal.concat(evergreen).slice(0, 3)
    },
    filtered: function () {
      const q = this.q.trim().toLowerCase()
      const list = this.lessons.filter(l => {
        if (this.track !== 'all' && l.track !== this.track) return false
        if (this.seasonOnly && !loader.inSeason(l)) return false
        if (!q) return true
        const hay = [l.title, l.subtitle, l.tags.join(' ')].join(' ').toLowerCase()
        return hay.indexOf(q) !== -1
      })
      return loader.sortBySeason(list)
    },
    grouping: function () {
      return !this.q.trim() && this.track === 'all' && !this.seasonOnly
    }
  },
  methods: {
    byTrack: function (t) {
      return this.filtered.filter(l => l.track === t)
    },
    lessonPath: function (l) { return this.$lpath('/p/learn/' + l.id) },
    inSeason: function (l) { return loader.inSeason(l) },
    monthShort: function (m) {
      try {
        return new Intl.DateTimeFormat(this.$i18n.locale, { month: 'short' })
          .format(new Date(2001, m - 1, 1))
      } catch (e) { return String(m) }
    },
    // 철이 아닌 레슨에는 언제 보기 좋은지를 적어 준다. 목록에서 빼지는 않는다.
    seasonLabel: function (l) {
      if (this.inSeason(l)) return this.$t('portal.seasonNow')
      const m = l.months
      if (!m || !m.length) return this.$t('portal.allYear')
      return this.monthShort(m[0]) + '–' + this.monthShort(m[m.length - 1])
    },
    clearFilters: function () {
      this.q = ''
      this.track = 'all'
      this.seasonOnly = false
    },
    scrollToLessons: function () {
      const el = this.$refs.lessons
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    switchLang: function (lang) {
      if (lang === this.$i18n.locale) return
      langsMod.remember(lang)
      this.$router.push({ path: langsMod.withLang(this.$route.path, lang) })
    },
    reload: function () {
      this.lessons = loader.loadIndex(this.$i18n.locale).lessons
    }
  },
  watch: { '$i18n.locale': 'reload' },
  created: function () {
    this.reload()
    this.starsFar = starfield(140, 20260820, 100, 0.35)
    this.starsMid = starfield(70, 77777, 100, 0.5)
    this.starsNear = starfield(28, 424242, 100, 0.55)
  }
}
</script>

<style scoped>
/* 포털은 엔진을 띄우지 않는다. 목록만 보러 온 사람에게 3MB 짜리 WASM 을
   내려받게 할 이유가 없고, 검색엔진에도 이 쪽이 가볍게 읽힌다.
   그래서 배경 하늘도 CSS 로 그린다. */
.portal {
  --bg: #05070f;
  --bg-2: #0a0e1c;
  --ink: #eaf0f8;
  --muted: #93a1bb;
  --dim: #64748b;
  --line: rgba(255, 255, 255, 0.08);
  --card: rgba(255, 255, 255, 0.035);
  --card-hi: rgba(255, 255, 255, 0.06);
  --principle: #a78bfa;
  --target: #5eead4;
  --measure: #fbbf24;
  /* 앱 껍데기(#app)는 화면에 붙박인 상자다. min-height 로 두면 포털이 그
     상자보다 길어졌을 때 넘친 부분에 손이 닿지 않는다. 상자에 맞춰 두고
     안에서 스크롤한다. */
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  overflow-y: auto;
  background: var(--bg);
  color: var(--ink);
  font-family: Roboto, -apple-system, 'Malgun Gothic', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 1060px; margin: 0 auto; padding: 0 22px; }
.sr-only {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap;
}

/* ---- 배경 하늘 ---- */
.sky { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
.glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .5; }
.glow-a {
  top: -14vh; left: 52%; width: 62vw; height: 62vw;
  background: radial-gradient(circle, rgba(88, 62, 190, .5), transparent 62%);
}
.glow-b {
  top: 22vh; left: -18vw; width: 52vw; height: 52vw;
  background: radial-gradient(circle, rgba(14, 96, 130, .38), transparent 64%);
}
/* 은하수 한 자락 */
.band {
  position: absolute; top: -30vh; left: -10vw; width: 130vw; height: 70vh;
  transform: rotate(-14deg);
  background: linear-gradient(90deg, transparent, rgba(150, 170, 255, .07) 35%, rgba(190, 200, 255, .05) 60%, transparent);
  filter: blur(28px);
}
.layer {
  position: absolute; top: 0; left: 0; width: 1px; height: 1px;
  border-radius: 50%; background: transparent;
}
.layer-far { animation: drift 240s linear infinite; }
.layer-mid { width: 1.5px; height: 1.5px; animation: drift 160s linear infinite; }
.layer-near { width: 2px; height: 2px; animation: drift 100s linear infinite; }
@keyframes drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-6vw, 3vh, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .layer-far, .layer-mid, .layer-near { animation: none; }
}

/* ---- 상단 ---- */
.nav {
  position: sticky; top: 0; z-index: 5;
  background: rgba(5, 7, 15, .72);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.nav-inner { display: flex; align-items: center; gap: 16px; height: 58px; }
.brand {
  display: inline-flex; align-items: center; gap: 9px;
  color: #fff; text-decoration: none; font-size: 18px; font-weight: 700;
  letter-spacing: -.01em;
}
.nav-links { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.nav-link {
  color: var(--muted); text-decoration: none; font-size: 14px;
  padding: 7px 12px; border-radius: 8px;
}
.nav-link:hover { color: #fff; background: rgba(255, 255, 255, .07); }
.lang select {
  appearance: none; -webkit-appearance: none;
  background: rgba(255, 255, 255, .06); color: var(--ink);
  border: 1px solid var(--line); border-radius: 8px;
  padding: 6px 10px; font-size: 13px; cursor: pointer;
  font-family: inherit;
}
.lang select option { background: #0d1223; color: var(--ink); }

/* ---- 히어로 ---- */
.hero { position: relative; z-index: 1; padding: 82px 0 56px; }
.badge {
  display: inline-block; font-size: 12px; letter-spacing: .1em;
  color: #b9c6dd; text-transform: uppercase;
  border: 1px solid var(--line); border-radius: 999px;
  padding: 5px 13px; margin-bottom: 22px;
  background: rgba(255, 255, 255, .03);
}
h1 {
  font-size: 54px; line-height: 1.14; font-weight: 800; margin: 0 0 18px;
  letter-spacing: -.03em; max-width: 15em;
  background: linear-gradient(180deg, #ffffff 30%, #a9bcdd);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: #fff;
}
.lead { color: var(--muted); font-size: 17px; line-height: 1.75; max-width: 34em; margin: 0 0 30px; }
.cta { display: flex; flex-wrap: wrap; gap: 11px; }
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  text-decoration: none; font-size: 15px; font-weight: 600;
  padding: 12px 22px; border-radius: 10px; border: 1px solid transparent;
  cursor: pointer;
}
.btn-primary {
  background: linear-gradient(135deg, #7c8cf8, #4f6ef7);
  color: #fff; box-shadow: 0 8px 26px -10px rgba(99, 128, 255, .8);
}
.btn-primary:hover { filter: brightness(1.08); }
.btn-ghost { color: var(--ink); border-color: rgba(255, 255, 255, .18); }
.btn-ghost:hover { background: rgba(255, 255, 255, .07); }
.stats { display: flex; gap: 34px; margin: 40px 0 0; }
.stats div { margin: 0; }
.stats dt { font-size: 26px; font-weight: 700; color: #fff; }
.stats dd { margin: 2px 0 0; font-size: 13px; color: var(--dim); }

/* ---- 구역 제목 ---- */
.sec-title {
  display: flex; align-items: center; gap: 9px;
  font-size: 15px; font-weight: 600; color: #c7d3e6;
  letter-spacing: .06em; text-transform: uppercase;
  margin: 0 0 8px;
}
.sec-sub { color: var(--dim); font-weight: 400; text-transform: none; letter-spacing: 0; }
.sec-lead { color: var(--muted); font-size: 14px; margin: 0 0 18px; }
.dot-live {
  width: 7px; height: 7px; border-radius: 50%; background: #5eead4;
  box-shadow: 0 0 0 4px rgba(94, 234, 212, .18);
}

/* ---- 카드 ---- */
.tonight { position: relative; z-index: 1; padding: 30px 0 10px; }
main { position: relative; z-index: 1; padding-bottom: 40px; }
.cards { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
@media (min-width: 720px) { .cards { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .cards-tonight { grid-template-columns: repeat(3, 1fr); } }
.cards li { display: flex; }
.card {
  position: relative; display: flex; flex-direction: column; width: 100%;
  text-decoration: none; color: inherit;
  background: var(--card); border: 1px solid var(--line);
  border-radius: 14px; padding: 20px 20px 17px;
  transition: transform .16s ease, border-color .16s ease, background .16s ease;
}
.card:hover {
  transform: translateY(-2px);
  background: var(--card-hi);
  border-color: rgba(255, 255, 255, .2);
}
.card::before {
  content: ''; position: absolute; left: 20px; top: 0; width: 34px; height: 2px;
  background: var(--accent, #8899bb); border-radius: 0 0 2px 2px; opacity: .9;
}
.card.off { opacity: .62; }
.card.off:hover { opacity: 1; }
.t-principle { --accent: var(--principle); }
.t-target { --accent: var(--target); }
.t-measure { --accent: var(--measure); }
.track {
  font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 9px;
}
.card h3 { font-size: 19px; font-weight: 700; margin: 0 0 7px; color: #fff; line-height: 1.35; letter-spacing: -.01em; }
.card p { color: var(--muted); font-size: 14px; line-height: 1.65; margin: 0 0 12px; }
.tags { color: var(--dim); font-size: 12px; margin-bottom: 12px; }
.meta {
  margin-top: auto; display: flex; flex-wrap: wrap; gap: 10px;
  font-size: 12px; color: var(--dim);
  border-top: 1px solid var(--line); padding-top: 11px;
}
.season { margin-left: auto; }
.season.now { color: #5eead4; }
.card-hi { background: rgba(255, 255, 255, .06); }

/* ---- 조작 ---- */
.controls {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  margin: 14px 0 26px;
}
.search { position: relative; flex: 1 1 240px; max-width: 340px; }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--dim); font-size: 16px;
}
.search input {
  width: 100%; box-sizing: border-box;
  background: rgba(255, 255, 255, .05); border: 1px solid var(--line);
  border-radius: 10px; color: var(--ink);
  padding: 10px 12px 10px 32px; font-size: 14px; font-family: inherit;
}
.search input:focus { outline: none; border-color: rgba(140, 165, 255, .6); }
.chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip {
  background: rgba(255, 255, 255, .04); border: 1px solid var(--line);
  color: var(--muted); border-radius: 999px; padding: 8px 15px;
  font-size: 13px; cursor: pointer; font-family: inherit;
}
.chip:hover { color: #fff; }
.chip.on {
  color: #08111f; font-weight: 700;
  background: var(--accent, #cbd5e1); border-color: transparent;
}
.chip-season.on { background: #5eead4; }
.count { color: var(--dim); font-size: 13px; margin: 0 0 12px; }
.empty { color: var(--muted); font-size: 14px; margin-top: 18px; }
.linkish {
  background: none; border: 0; color: #8ab4ff; cursor: pointer;
  font-size: 14px; font-family: inherit; text-decoration: underline;
}

/* ---- 갈래별 묶음 ---- */
.group { margin-bottom: 40px; }
.group-title {
  display: flex; align-items: baseline; gap: 9px;
  font-size: 21px; font-weight: 700; margin: 0 0 4px; color: #fff;
}
.group-title::before {
  content: ''; width: 9px; height: 9px; border-radius: 50%;
  background: var(--accent); transform: translateY(-2px);
}
.group-count { font-size: 13px; color: var(--dim); font-weight: 400; }
.group-desc { color: var(--muted); font-size: 14px; margin: 0 0 16px; max-width: 44em; }

/* ---- 어떻게 배우나 ---- */
.how { margin: 56px 0 20px; }
.how-list {
  list-style: none; padding: 0; margin: 0;
  display: grid; gap: 16px;
}
@media (min-width: 760px) { .how-list { grid-template-columns: repeat(3, 1fr); } }
.how-list li {
  border: 1px solid var(--line); border-radius: 14px; padding: 20px;
  background: rgba(255, 255, 255, .025);
}
.how-n {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(124, 140, 248, .18); color: #b9c3ff;
  font-size: 13px; font-weight: 700; margin-bottom: 12px;
}
.how-list h3 { font-size: 16px; margin: 0 0 6px; color: #fff; }
.how-list p { color: var(--muted); font-size: 14px; line-height: 1.7; margin: 0; }

/* ---- 바닥 ---- */
.foot {
  position: relative; z-index: 1; margin-top: 40px;
  border-top: 1px solid var(--line);
  background: linear-gradient(180deg, transparent, rgba(10, 14, 28, .8));
  padding: 34px 0 46px;
  color: var(--dim); font-size: 13px; line-height: 1.9;
}
.foot-brand {
  display: flex; align-items: center; gap: 8px;
  color: #cfd9ea; font-weight: 600; margin: 0 0 8px;
}
.foot p { margin: 0; }
.foot a { color: #8ab4ff; }
.disclaimer { margin-top: 10px !important; font-size: 12px; opacity: .8; }

@media (max-width: 700px) {
  .hero { padding: 54px 0 40px; }
  h1 { font-size: 36px; }
  .lead { font-size: 16px; }
  .stats { gap: 24px; }
  .hide-narrow { display: none; }
}
</style>
