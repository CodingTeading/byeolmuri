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
          <span class="badge">{{ l.level }}</span>
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

  <!-- 하늘을 보다가 목록 전체를 훑고 싶을 때. 포털은 엔진 없이 뜬다. -->
  <div class="pa-3">
    <router-link :to="$lpath('/learn')" class="text-caption portal-link">
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
  background: rgba(100,181,246,0.2); color: #90caf9;
  padding: 1px 6px; border-radius: 3px; font-size: 11px;
}
</style>
