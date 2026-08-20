<template>
<div class="portal">
  <header class="hero">
    <div class="wrap">
      <router-link :to="$lpath('/')" class="brand">
        <img src="@/assets/images/logo.svg" width="34" height="34" alt="" />
        <span>{{ $t('portal.brand') }}</span>
      </router-link>
      <h1>{{ $t('portal.headline') }}</h1>
      <p class="lead">{{ $t('portal.lead') }}</p>
      <router-link :to="$lpath('/')" class="sky-link">
        {{ $t('portal.openSky') }} →
      </router-link>
    </div>
  </header>

  <main class="wrap">
    <h2>{{ $t('portal.lessons') }}</h2>

    <div v-if="!lessons.length" class="empty">{{ $t('learn.empty') }}</div>

    <ul class="cards">
      <li v-for="l in lessons" :key="l.id">
        <router-link :to="$lpath('/p/learn/' + l.id)" class="card">
          <div class="card-tags">
            <span class="badge">{{ l.level }}</span>
            <span class="mins">{{ $t('learn.minutes', { n: l.minutes }) }}</span>
          </div>
          <h3>{{ l.title }}</h3>
          <p>{{ l.subtitle }}</p>
          <div class="tags">{{ l.tags.join(' · ') }}</div>
        </router-link>
      </li>
    </ul>
  </main>

  <footer class="wrap foot">
    <p>{{ $t('portal.footNonprofit') }}</p>
    <p>
      <a href="https://github.com/CodingTeading/byeolmuri" target="_blank" rel="noopener">
        github.com/CodingTeading/byeolmuri</a>
      · AGPL-3.0
    </p>
    <p class="disclaimer">{{ $t('portal.footDisclaimer') }}</p>
  </footer>
</div>
</template>

<script>
import loader from './content/loader'

export default {
  data: function () {
    return { lessons: [] }
  },
  methods: {
    reload: function () {
      this.lessons = loader.loadIndex(this.$i18n.locale).lessons
    }
  },
  watch: { '$i18n.locale': 'reload' },
  created: function () { this.reload() }
}
</script>

<style scoped>
/* 포털은 엔진을 띄우지 않는다. 목록만 보러 온 사람에게 3MB 짜리 WASM 을
   내려받게 할 이유가 없고, 검색엔진에도 이 쪽이 가볍게 읽힌다. */
.portal {
  min-height: 100%;
  background: #0b1020;
  color: #e6edf3;
  font-family: Roboto, -apple-system, 'Malgun Gothic', sans-serif;
  overflow-y: auto;
}
.wrap { max-width: 880px; margin: 0 auto; padding: 0 24px; }
.hero {
  padding: 40px 0 48px;
  background: linear-gradient(180deg, #131a33 0%, #0b1020 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.brand {
  display: inline-flex; align-items: center; gap: 10px;
  color: #fff; text-decoration: none; font-size: 20px; font-weight: 600;
}
.brand img { color: #fff; }
h1 { font-size: 32px; font-weight: 600; margin: 24px 0 10px; line-height: 1.3; }
.lead { color: #9fb0c8; font-size: 16px; line-height: 1.7; margin-bottom: 20px; }
.sky-link {
  display: inline-block; color: #90caf9; text-decoration: none; font-size: 15px;
  border: 1px solid rgba(144, 202, 249, 0.4); border-radius: 6px; padding: 8px 16px;
}
.sky-link:hover { background: rgba(144, 202, 249, 0.1); }
h2 { font-size: 15px; color: #8b98ad; font-weight: 500; margin: 36px 0 16px; letter-spacing: .04em; }
.cards { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
@media (min-width: 700px) { .cards { grid-template-columns: 1fr 1fr; } }
.card {
  display: block; text-decoration: none; color: inherit;
  background: #141a2e; border: 1px solid #232b45; border-radius: 10px;
  padding: 18px 20px; height: 100%;
}
.card:hover { border-color: #3d4a6b; background: #171e36; }
.card-tags { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.badge {
  background: rgba(100, 181, 246, 0.18); color: #90caf9;
  padding: 2px 8px; border-radius: 4px; font-size: 12px;
}
.mins { color: #8b98ad; font-size: 12px; }
.card h3 { font-size: 18px; font-weight: 600; margin: 0 0 6px; color: #fff; }
.card p { color: #9fb0c8; font-size: 14px; line-height: 1.6; margin: 0 0 10px; }
.tags { color: #6b7a92; font-size: 12px; }
.empty { color: #8b98ad; font-size: 14px; }
.foot {
  margin-top: 56px; padding-top: 20px; padding-bottom: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: #6b7a92; font-size: 13px; line-height: 1.8;
}
.foot a { color: #90caf9; }
.disclaimer { margin-top: 8px; font-size: 12px; }
</style>
