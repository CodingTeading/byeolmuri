<template>
<div class="lesson">
  <div v-if="!lesson" class="pa-4 grey--text">레슨을 불러오는 중…</div>

  <template v-else>
    <!-- 진행 표시 -->
    <div class="pa-3 pb-2 head">
      <div class="d-flex align-center mb-2">
        <v-btn icon x-small to="/p/learn" title="목록으로"><v-icon small>mdi-arrow-left</v-icon></v-btn>
        <span class="text-caption grey--text ml-1">{{ lesson.title }}</span>
        <v-spacer></v-spacer>
        <span class="text-caption grey--text">{{ index + 1 }} / {{ lesson.steps.length }}</span>
      </div>
      <div class="progress"><div class="progress-fill" :style="{ width: progress + '%' }"></div></div>
    </div>

    <!-- 본문 -->
    <div class="body pa-3" ref="body">
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
            {{ answered === step.quiz.right ? '맞았습니다' : '다시 생각해 봅시다' }}
          </b>
          <div class="mt-1 grey--text">{{ step.quiz.explain }}</div>
        </div>
      </div>
    </div>

    <!-- 이동 -->
    <div class="nav pa-2 d-flex">
      <v-btn small text :disabled="index === 0" @click="go(index - 1)">이전</v-btn>
      <v-spacer></v-spacer>
      <v-btn v-if="index < lesson.steps.length - 1" small color="primary" @click="go(index + 1)">다음</v-btn>
      <v-btn v-else small text to="/p/learn">마침</v-btn>
    </div>
  </template>
</div>
</template>

<script>
import director from './director'

export default {
  data: function () {
    return { lesson: null, index: 0, answered: null }
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
      // 레슨은 필요할 때만 받는다. 레슨이 늘어나도 첫 로딩이 무거워지지 않는다.
      // (매직 코멘트와 템플릿 리터럴을 같이 쓰면 이 프로젝트의 낡은 eslint 가
      //  파싱 중 죽는다. 문자열 연결로 둔다.)
      const that = this
      import('./content/' + id + '.json')
        .then(m => {
          that.lesson = m.default || m
          that.index = 0
          that.answered = null
          that.waitForLocation().then(() => that.applyStep())
        })
        .catch(() => { that.lesson = null })
    }
  },
  watch: {
    '$route.params.id': function (id) { if (id) this.load(id) }
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
