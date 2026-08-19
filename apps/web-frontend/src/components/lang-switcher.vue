<template>
<v-menu offset-y>
  <template v-slot:activator="{ on }">
    <v-btn text small class="lang-btn" v-on="on" :title="$t('learn.title')">
      <v-icon small class="mr-1">mdi-translate</v-icon>
      <span class="hidden-xs-only">{{ names[current] }}</span>
    </v-btn>
  </template>
  <v-list dense dark>
    <v-list-item v-for="l in langs" :key="l" @click="pick(l)"
                 :class="{ 'v-list-item--active': l === current }">
      <v-list-item-title>{{ names[l] }}</v-list-item-title>
    </v-list-item>
  </v-list>
</v-menu>
</template>

<script>
import langsMod from '@/i18n/langs'

export default {
  data: function () {
    return { langs: langsMod.LANGS, names: langsMod.LANG_NAMES }
  },
  computed: {
    current: function () { return this.$i18n.locale }
  },
  methods: {
    pick: function (lang) {
      if (lang === this.current) return
      langsMod.remember(lang)
      // 보고 있던 화면을 그대로 두고 언어만 바꾼다.
      // 주소의 접두어를 갈아끼우면 라우터 가드가 나머지를 처리한다.
      this.$router.push({
        path: langsMod.withLang(this.$route.path, lang),
        query: this.$route.query,
        hash: this.$route.hash
      })
    }
  }
}
</script>

<style scoped>
.lang-btn { min-width: 0; }
</style>
