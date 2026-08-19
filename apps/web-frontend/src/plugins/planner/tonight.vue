<template>
<div class="planner">
  <div v-if="!ready" class="pa-4 grey--text">오늘 밤 하늘을 계산하는 중…</div>

  <div v-else-if="!night" class="pa-4 grey--text">
    이 위치에서는 오늘 밤 해가 지지 않습니다.
  </div>

  <div v-else>
    <!-- 밤 요약 -->
    <div class="pa-3 summary">
      <div class="d-flex align-center mb-1">
        <span class="text-h6" :class="verdictClass">오늘 밤 {{ verdict.text }}</span>
        <v-spacer></v-spacer>
        <span v-if="weather" class="text-caption grey--text">{{ weather.text }}</span>
        <span v-else-if="weatherPending" class="text-caption grey--text">예보 확인 중…</span>
      </div>
      <div class="text-caption grey--text mb-2">{{ darkHoursText }}</div>
      <div class="text-caption grey--text mb-2">{{ locationText }}</div>
      <div class="times">
        <div v-for="t in nightTimes" :key="t.label" class="time-cell">
          <div class="text-caption grey--text">{{ t.label }}</div>
          <div class="white--text">{{ t.value }}</div>
        </div>
      </div>
    </div>

    <!-- 달 방해도 -->
    <div class="pa-3 moon" v-if="moon">
      <div class="d-flex align-center">
        <v-icon small class="mr-2">mdi-moon-waning-crescent</v-icon>
        <span class="white--text">달 {{ Math.round(moon.illumination * 100) }}%</span>
        <v-spacer></v-spacer>
        <span :class="moonClass">{{ moonText }}</span>
      </div>
    </div>

    <!-- 시간대별 하늘 상태 -->
    <div class="pa-3 sky-timeline" v-if="weather && weather.timeline.length">
      <div class="text-caption grey--text mb-1">시간대별 하늘</div>
      <div class="d-flex">
        <div v-for="h in weather.timeline" :key="h.hour" class="sky-cell"
             :title="h.hour + '시 ' + h.label">
          <div class="sky-bar" :style="{ background: skyColor(h) }"></div>
          <div class="sky-hour">{{ h.hour }}</div>
        </div>
      </div>
    </div>

    <!-- 추천 대상 -->
    <div class="pa-3 pb-1 text-caption grey--text">오늘 밤 볼 만한 것</div>
    <v-list dense class="transparent">
      <v-list-item v-for="t in targets" :key="t.names[0]" @click="select(t)">
        <v-list-item-content>
          <v-list-item-title class="white--text">{{ title(t) }}</v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            최고 {{ deg(t.maxAlt) }}° · {{ time(t.bestTime) }}
            <span v-if="t.vmag !== null"> · {{ t.vmag.toFixed(1) }}등급</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
    <div v-if="!targets.length" class="pa-3 text-caption grey--text">
      조건을 만족하는 대상이 없습니다.
    </div>
  </div>
</div>
</template>

<script>
import astro from './astro'
import targets from './targets'
import weather from './weather'
import swh from '@/assets/sw_helpers'
import Moment from 'moment'

export default {
  data: function () {
    return {
      ready: false,
      night: null,
      moon: null,
      targets: [],
      timer: null,
      weather: null,
      weatherPending: false
    }
  },
  computed: {
    darkHoursText: function () {
      if (!this.night) return ''
      const h = this.night.darkHours
      if (!h) return '천문박명이 끝나지 않는 밤'
      return '어두운 시간 ' + Math.floor(h) + '시간 ' +
        Math.round((h % 1) * 60) + '분'
    },
    // 엔진 객체는 Vue 반응형이 아니므로 반드시 스토어를 통해 읽어야 한다.
    // 스토어의 stel 트리는 엔진 값이 바뀔 때마다 갱신된다
    // (sw_helpers 의 initStelWebEngine 에서 onValueChanged 로 연결).
    observer: function () {
      return this.$store.state.stel.observer || {}
    },
    locationText: function () {
      const o = this.observer
      const name = this.$store.state.currentLocation
        ? this.$store.state.currentLocation.short_name : ''
      const coords = (o.latitude * 180 / Math.PI).toFixed(2) + '°, ' +
        (o.longitude * 180 / Math.PI).toFixed(2) + '°'
      return name ? name + ' · ' + coords : coords
    },
    // 위치가 바뀌거나 날짜가 넘어가면 다시 계산해야 한다.
    // utc 는 시간이 흐르며 계속 변하므로 일 단위로 잘라서 본다.
    computeKey: function () {
      const o = this.observer
      return [Math.floor(o.utc), o.latitude, o.longitude].join(',')
    },
    nightTimes: function () {
      if (!this.night) return []
      return [
        { label: '일몰', value: this.time(this.night.sunset) },
        { label: '박명 끝', value: this.time(this.night.duskEnd) },
        { label: '박명 시작', value: this.time(this.night.dawnStart) },
        { label: '일출', value: this.time(this.night.sunrise) }
      ]
    },
    verdict: function () {
      return weather.observingScore(this.night, this.moon, this.weather)
    },
    verdictClass: function () {
      const s = this.verdict.score
      if (s >= 0.7) return 'green--text'
      if (s >= 0.45) return 'amber--text'
      return 'red--text'
    },
    moonText: function () {
      if (!this.moon) return ''
      const i = this.moon.interference
      if (i < 0.1) return '방해 거의 없음'
      if (i < 0.3) return '약간 방해'
      if (i < 0.6) return '보통 방해'
      return '관측 방해 큼'
    },
    moonClass: function () {
      if (!this.moon) return ''
      const i = this.moon.interference
      if (i < 0.1) return 'text-caption green--text'
      if (i < 0.6) return 'text-caption amber--text'
      return 'text-caption red--text'
    }
  },
  methods: {
    deg: function (rad) { return Math.round(rad * 180 / Math.PI) },
    time: function (mjd) {
      if (mjd === null || mjd === undefined) return '—'
      const d = new Date()
      d.setMJD(mjd)
      return new Moment(d).format('HH:mm')
    },
    title: function (t) {
      if (t.koreanNames && t.koreanNames.length) return t.koreanNames[0]
      return swh.cleanupOneSkySourceName(t.names[0])
    },
    select: function (t) {
      const obj = this.$stel.getObj(t.names[0])
      if (obj) swh.setSweObjAsSelection(obj)
    },
    // 위치를 옮기는 중에는 값이 연달아 바뀌므로 잠깐 모아서 한 번만 계산한다.
    scheduleCompute: function () {
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(this.compute, 300)
    },
    skyColor: function (h) {
      if (h.pty) return '#4a6fa5'
      if (h.sky === 1) return '#2e7d32'
      if (h.sky === 3) return '#b58900'
      return '#5a5a5a'
    },
    loadWeather: function () {
      const that = this
      const o = this.observer
      if (!o || o.latitude === undefined) return
      this.weatherPending = true
      weather.fetchForecast(o.latitude * 180 / Math.PI, o.longitude * 180 / Math.PI)
        .then(f => {
          that.weather = weather.summarize(f, that.night)
          that.weatherPending = false
        })
        .catch(() => {
          // 예보는 부가 정보다. 실패해도 나머지 계획은 그대로 보여준다.
          that.weather = null
          that.weatherPending = false
        })
    },
    compute: function () {
      const stel = this.$stel
      if (!stel) return
      this.night = astro.findNight(stel)
      if (this.night) {
        this.moon = astro.moonInfo(stel, this.night)
        this.targets = targets.recommend(stel, this.night, 12)
        this.loadWeather()
      }
      this.ready = true
    }
  },
  watch: {
    // 앱 시작 직후에는 엔진이 기본 위치(타이베이)에 있다가 잠시 뒤
    // 지오코딩 결과로 바뀐다. 그래서 마운트 시점에 한 번만 계산하면
    // 엉뚱한 위치의 계획을 보여주게 된다.
    computeKey: function () {
      this.scheduleCompute()
    }
  },
  mounted: function () {
    // 색인이 있어야 한글 이름이 붙는다. 실패해도 계산은 진행한다.
    const that = this
    require('@/assets/search-index').default.load()
      .then(() => that.scheduleCompute(), () => that.scheduleCompute())
  },
  beforeDestroy: function () {
    if (this.timer) clearTimeout(this.timer)
  }
}
</script>

<style scoped>
.planner { height: 100%; overflow-y: auto; }
.summary { background: rgba(255, 255, 255, 0.04); }
.moon { border-top: 1px solid rgba(255, 255, 255, 0.08); }
.times { display: flex; justify-content: space-between; }
.sky-timeline { border-top: 1px solid rgba(255, 255, 255, 0.08); }
.sky-cell { flex: 1; text-align: center; min-width: 0; }
.sky-bar { height: 18px; border-radius: 2px; margin: 0 1px; }
.sky-hour { font-size: 9px; color: #9e9e9e; }
.time-cell { text-align: center; flex: 1; }
</style>
