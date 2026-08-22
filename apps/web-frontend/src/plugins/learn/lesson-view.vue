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

      <!-- 마지막 단계는 밖에서 할 일로 끝난다. 돌아왔을 때 적을 곳을
           바로 옆에 둔다. 그러지 않으면 "기록을 남기세요"가 빈말이 된다. -->
      <div v-if="isLast" class="logcta mt-4 pa-3">
        <div class="text-body-2 mb-2">{{ $t('learn.logCta') }}</div>
        <v-btn small color="primary" @click="openLog">
          <v-icon left small>mdi-notebook-outline</v-icon>{{ $t('learn.logOpen') }}
        </v-btn>
      </div>

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
import { createMarks } from './marks'
import loader from './content/loader'

export default {
  data: function () {
    return { lesson: null, index: 0, answered: null, translated: true, marks: null, markTimer: null }
  },
  computed: {
    step: function () {
      return this.lesson ? this.lesson.steps[this.index] : null
    },
    progress: function () {
      if (!this.lesson) return 0
      return (this.index + 1) / this.lesson.steps.length * 100
    },
    isLast: function () {
      return !!this.lesson && this.index === this.lesson.steps.length - 1
    }
  },
  methods: {
    // 관측 기록 창을 레슨 이름을 달고 연다. 어느 레슨을 읽고 나가서
    // 본 것인지가 나중에 자료를 볼 때 가장 아쉬운 정보다.
    openLog: function () {
      this.$store.commit('setValue', {
        varName: 'logDraft',
        newValue: { from: this.lesson ? this.lesson.title : '' }
      })
      this.$store.commit('setValue', { varName: 'showObservationLogDialog', newValue: true })
    },
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
      const that = this
      // 하늘을 옮긴 뒤에 표시를 그려야 한다. 표시 크기를 시야각으로 정하는데
      // 시야가 아직 이전 단계 값이면 크기가 어긋난다.
      director.apply(this.$stel, this.step, this.$store.state.currentLocation)
        .then(() => that.drawMarks())
    },
    drawMarks: function () {
      const stel = this.$stel
      if (!stel || !this.step) return
      if (!this.marks) this.marks = createMarks(stel)
      const stepAtCall = this.step
      this.marks.set(stepAtCall, stel.core.fov * 180 / Math.PI).then(() => {
        // 그리는 사이에 사용자가 단계를 넘겼으면 방금 그린 것은 버린다.
        if (this.step !== stepAtCall) this.drawMarks()
      })
    },
    // 사용자가 직접 확대·축소하면 원 크기도 따라가야 한다.
    // 고정 크기로 두면 넓게 볼 때 안 보이고 확대하면 화면을 덮는다.
    scheduleMarks: function () {
      if (this.markTimer) clearTimeout(this.markTimer)
      this.markTimer = setTimeout(this.drawMarks, 250)
    },
    // 앱은 뜨면서 관측지를 정하고, 그다음 "해가 진 직후"로 시각을 옮긴다.
    // 그 전에 레슨을 적용하면 레슨이 지정한 위치도 시각도 덮어쓰인다.
    // currentLocation 만 기다리면 부족하다. 시각을 옮기는 것은 그 뒤이기 때문이다.
    // 앱은 두 가지를 다 마친 뒤에야 initComplete 를 올린다. 그것을 기다린다.
    waitForApp: function (timeoutMs) {
      const store = this.$store
      if (store.state.initComplete) return Promise.resolve()
      return new Promise(resolve => {
        const deadline = Date.now() + (timeoutMs || 8000)
        const check = () => {
          if (store.state.initComplete || Date.now() > deadline) { resolve(); return }
          setTimeout(check, 100)
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
        this.waitForApp().then(() => this.applyStep())
      }
    }
  },
  watch: {
    '$route.params.id': function (id) { if (id) this.load(id) },
    '$i18n.locale': function () { if (this.$route.params.id) this.load(this.$route.params.id) },
    '$store.state.stel.fov': function () { this.scheduleMarks() }
  },
  mounted: function () {
    // 사이드 패널을 열어 둔 채로 하늘이 보여야 한다.
    this.$store.commit('setValue', { varName: 'showSidePanel', newValue: true })
    this.load(this.$route.params.id)
  },
  beforeDestroy: function () {
    // 레슨이 바꿔 놓은 하늘을 평소 상태로 되돌린다.
    // 관측지는 앱이 아는 값으로 되돌린다. 자세한 것은 director.reset 참고.
    director.reset(this.$stel, this.$store.state.currentLocation)
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
.logcta { background: rgba(255,255,255,0.04); border-radius: 6px; color: #e0e0e0; }
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
