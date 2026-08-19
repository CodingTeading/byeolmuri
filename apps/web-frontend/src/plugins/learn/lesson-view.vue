<template>
<div class="lesson">
  <div v-if="!lesson" class="pa-4 grey--text">{{ $t('learn.loading') }}</div>

  <template v-else>
    <!-- 진행 표시 -->
    <div class="pa-3 pb-2 head">
      <div class="d-flex align-center mb-2">
        <v-btn icon x-small :to="$lpath('/p/learn')" :title="$t('learn.toList')"><v-icon small>mdi-arrow-left</v-icon></v-btn>
        <span class="text-caption grey--text ml-1">{{ lesson.title }}</span>
        <v-spacer></v-spacer>
        <span class="text-caption grey--text">{{ index + 1 }} / {{ lesson.steps.length }}</span>
      </div>
      <div class="progress"><div class="progress-fill" :style="{ width: progress + '%' }"></div></div>
    </div>

    <!-- 본문 -->
    <div class="body pa-3" ref="body">
      <div v-if="!translated" class="notice text-caption mb-3 pa-2">
        {{ $t('learn.notTranslated') }}
      </div>
      <div class="text-h6 white--text mb-2">{{ step.title }}</div>
      <div class="prose" v-html="step.text"></div>

      <!-- 퀴즈 -->
      <div v-if="step.quiz" class="quiz mt-4 pa-3">
        <div class="white--text mb-2">{{ step.quiz.q }}</div>
        <div v-for="(o, i) in step.quiz.opts" :key="i"
             class="opt" :class="optClass(i)" @click="answer(i)">
          {{ o }}
        </div>
        <div v-if="answered !== null" class="explain mt-3 text-caption">
          <b :class="answered === step.quiz.right ? 'green--text' : 'amber--text'">
            {{ answered === step.quiz.right ? $t('learn.correct') : $t('learn.wrong') }}
          </b>
          <div class="mt-1 grey--text">{{ step.quiz.explain }}</div>
        </div>
      </div>
    </div>

    <!-- 이동 -->
    <div class="nav pa-2 d-flex">
      <v-btn small text :disabled="index === 0" @click="go(index - 1)">{{ $t('learn.prev') }}</v-btn>
      <v-spacer></v-spacer>
      <v-btn v-if="index < lesson.steps.length - 1" small color="primary" @click="go(index + 1)">{{ $t('learn.next') }}</v-btn>
      <v-btn v-else small text :to="$lpath('/p/learn')">{{ $t('learn.finish') }}</v-btn>
    </div>
  </template>
</div>
</template>

<script>
import director from './director'
import loader from './content/loader'

export default {
  data: function () {
    return { lesson: null, index: 0, answered: null, translated: true }
  },
  computed: {
    step: function () {
      return this.lesson ? this.lesson.steps[this.index] : null
    },
    progress: function () {
      if (!this.lesson) return 0
      return (this.index + 1) / this.lesson.steps.length * 100
    }
  },
  methods: {
    optClass: function (i) {
      if (this.answered === null) return ''
      if (i === this.step.quiz.right) return 'opt-right'
      if (i === this.answered) return 'opt-wrong'
      return 'opt-dim'
    },
    answer: function (i) {
      if (this.answered !== null) return
      this.answered = i
    },
    go: function (i) {
      this.index = i
      this.answered = null
      if (this.$refs.body) this.$refs.body.scrollTop = 0
      this.applyStep()
    },
    applyStep: function () {
      if (!this.step) return
      director.apply(this.$stel, this.step)
    },
    // 앱이 뜨자마자 위치를 감지해 관측지를 덮어쓴다. 그 전에 레슨을 적용하면
    // 레슨이 지정한 위치가 지워진다. 위치가 정해질 때까지 잠깐 기다린다.
    waitForLocation: function (timeoutMs) {
      const store = this.$store
      if (store.state.currentLocation) return Promise.resolve()
      return new Promise(resolve => {
        const deadline = Date.now() + (timeoutMs || 5000)
        const check = () => {
          if (store.state.currentLocation || Date.now() > deadline) { resolve(); return }
          setTimeout(check, 150)
        }
        check()
      })
    },
    load: function (id) {
      const res = loader.loadLesson(this.$i18n.locale, id)
      this.lesson = res.lesson
      this.translated = res.translated
      this.index = 0
      this.answered = null
      if (this.lesson) {
        this.waitForLocation().then(() => this.applyStep())
      }
    }
  },
  watch: {
    '$route.params.id': function (id) { if (id) this.load(id) },
    '$i18n.locale': function () { if (this.$route.params.id) this.load(this.$route.params.id) }
  },
  mounted: function () {
    // 사이드 패널을 열어 둔 채로 하늘이 보여야 한다.
    this.$store.commit('setValue', { varName: 'showSidePanel', newValue: true })
    this.load(this.$route.params.id)
  },
  beforeDestroy: function () {
    // 레슨이 바꿔 놓은 하늘을 평소 상태로 되돌린다.
    director.reset(this.$stel)
  }
}
</script>

<style scoped>
.lesson { height: 100%; display: flex; flex-direction: column; }
.head { border-bottom: 1px solid rgba(255,255,255,0.08); }
.progress { height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; }
.progress-fill { height: 100%; background: #64b5f6; border-radius: 2px; transition: width .25s; }
.body { flex: 1; overflow-y: auto; }
.nav { border-top: 1px solid rgba(255,255,255,0.08); }
.quiz { background: rgba(255,255,255,0.04); border-radius: 6px; }
.notice { background: rgba(255,193,7,0.12); color: #ffca28; border-radius: 4px; }
.opt {
  padding: 8px 10px; margin-bottom: 6px; border-radius: 4px; cursor: pointer;
  background: rgba(255,255,255,0.05); font-size: 13px; color: #e0e0e0;
}
.opt:hover { background: rgba(255,255,255,0.1); }
.opt-right { background: rgba(76,175,80,0.25); color: #fff; }
.opt-wrong { background: rgba(244,67,54,0.25); color: #fff; }
.opt-dim { opacity: 0.4; cursor: default; }
</style>

<style>
/* v-html 로 넣는 본문이라 scoped 밖에 둔다. */
.lesson .prose { color: #cfd8dc; font-size: 14px; line-height: 1.75; }
.lesson .prose p { margin-bottom: 12px; }
.lesson .prose b { color: #fff; font-weight: 600; }
.lesson .prose ul { padding-left: 18px; margin-bottom: 12px; }
.lesson .prose li { margin-bottom: 5px; }
</style>
