<template>
<div class="learn">
  <div class="pa-3 pb-1">
    <div class="text-h6 white--text">{{ $t('learn.title') }}</div>
    <div class="text-caption grey--text">
      {{ $t('learn.lead') }}
    </div>
  </div>

  <v-list dense class="transparent">
    <v-list-item v-for="l in lessons" :key="l.id" :to="$lpath('/p/learn/' + l.id)" class="lesson-item">
      <v-list-item-content>
        <v-list-item-title class="white--text">{{ l.title }}</v-list-item-title>
        <v-list-item-subtitle class="text-caption">{{ l.subtitle }}</v-list-item-subtitle>
        <div class="text-caption grey--text mt-1">
          <span class="badge" :class="'t-' + l.track">{{ $t('learn.track.' + l.track) }}</span>
          <span class="ml-2">{{ $t('learn.level.' + l.level) }}</span>
          <span class="ml-2">{{ $t('learn.minutes', { n: l.minutes }) }}</span>
          <span class="ml-2">{{ l.tags.join(' · ') }}</span>
          <span v-if="!inSeason(l)" class="ml-2 offseason">{{ $t('learn.offSeason') }}</span>
        </div>
      </v-list-item-content>
    </v-list-item>
  </v-list>

  <div v-if="!lessons.length" class="pa-3 text-caption grey--text">
    {{ $t('learn.empty') }}
  </div>

  <!-- 하늘을 보다가 목록 전체를 훑고 싶을 때. 포털(첫 화면)은 엔진 없이 뜬다. -->
  <div class="pa-3">
    <router-link :to="$lpath('/')" class="text-caption portal-link">
      {{ $t('learn.allLessons') }} →
    </router-link>
  </div>
</div>
</template>

<script>
import loader from './content/loader'

export default {
  data: function () {
    return { lessons: [] }
  },
  methods: {
    inSeason: function (l) { return loader.inSeason(l) },
    reload: function () {
      this.lessons = loader.sortBySeason(loader.loadIndex(this.$i18n.locale).lessons)
    }
  },
  watch: {
    '$i18n.locale': 'reload'
  },
  created: function () {
    this.reload()
  }
}
</script>

<style scoped>
.learn { height: 100%; overflow-y: auto; }
.lesson-item { border-bottom: 1px solid rgba(255,255,255,0.06); }
.offseason { color: #8d6e63; }
.portal-link { color: #90caf9; text-decoration: none; }
.portal-link:hover { text-decoration: underline; }
.badge {
  background: rgba(255,255,255,0.08); color: #b0bec5;
  padding: 1px 6px; border-radius: 3px; font-size: 11px;
}
/* 갈래 색은 포털과 같게 쓴다. */
.badge.t-principle { background: rgba(167,139,250,0.18); color: #c4b5fd; }
.badge.t-target { background: rgba(94,234,212,0.16); color: #5eead4; }
.badge.t-measure { background: rgba(251,191,36,0.16); color: #fcd34d; }
</style>
