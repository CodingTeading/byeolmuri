// 별무리 - 이번 달 볼거리
//
// 이 프로젝트가 더한 화면이다. 상류(Stellarium Web)에는 없다.

<template>
<v-dialog scrollable max-width='620' v-model="$store.state.showSkyEventsDialog">
<v-card v-if="$store.state.showSkyEventsDialog" class="secondary white--text">
  <v-card-title><div class="text-h5">{{ $t('events.title') }}</div></v-card-title>
  <v-card-text class="white--text" style="max-height: 70vh;">
    <p class="text-body-2">{{ $t('events.intro') }}</p>

    <div v-if="loading" class="grey--text text-body-2 py-4">{{ $t('events.loading') }}</div>
    <div v-else-if="!events.length" class="grey--text text-body-2 py-4">{{ $t('events.none') }}</div>

    <template v-else v-for="(group, gi) in grouped">
      <div :key="'h' + gi" class="ev-month text-subtitle-2 mt-4 mb-1">{{ group.label }}</div>
      <div v-for="(e, i) in group.items" :key="gi + '-' + i" class="ev-row d-flex align-start py-2">
        <div class="ev-day text-caption">{{ dayLabel(e.date) }}</div>
        <div style="flex: 1 1 auto; min-width: 0;">
          <div class="white--text">{{ headline(e) }}</div>
          <div v-if="detail(e)" class="text-caption grey--text text--lighten-1">{{ detail(e) }}</div>
          <router-link v-if="lessonOf(e)" :to="$lpath('/p/learn/' + lessonOf(e))"
                       class="text-caption ev-link"
                       @click.native="$store.state.showSkyEventsDialog = false">
            {{ $t('events.openLesson') }}
          </router-link>
        </div>
      </div>
    </template>

    <p class="grey--text text-caption ev-note">{{ $t('events.dateNote') }}</p>
  </v-card-text>
  <v-card-actions>
    <v-spacer></v-spacer>
    <v-btn class="blue--text darken-1" text @click.native="$store.state.showSkyEventsDialog = false">{{ $t('Close') }}</v-btn>
  </v-card-actions>
</v-card>
</v-dialog>
</template>

<script>

import skyEvents from '@/assets/sky-events.js'
import Moment from 'moment'

// 어느 레슨으로 이어 주는가. 볼거리와 레슨을 잇는 것이 이 화면의 요점이다.
// 날짜를 보고 "그래서 이게 뭔데" 를 바로 읽을 수 있어야 한다.
const LESSON = {
  moon: 'moon-phases',
  shower: 'meteor-showers',
  opposition: 'retrograde',
  elongation: 'retrograde'
}

export default {
  data: function () {
    return { events: [], loading: false, showers: null }
  },
  computed: {
    grouped: function () {
      const out = []
      for (const e of this.events) {
        const label = new Moment(e.date).format('MMMM YYYY')
        const last = out[out.length - 1]
        if (last && last.label === label) last.items.push(e)
        else out.push({ label: label, items: [e] })
      }
      return out
    }
  },
  mounted: function () {
    if (this.$store.state.showSkyEventsDialog) this.build()
  },
  watch: {
    '$store.state.showSkyEventsDialog': function (open) {
      if (open) this.build()
    }
  },
  methods: {
    build: function () {
      const that = this
      this.loading = true
      this.loadShowers().then(showers => {
        that.showers = showers
        that.events = skyEvents.compute(that.$stel, showers, 60)
        that.loading = false
      })
    },
    loadShowers: function () {
      if (this.showers) return Promise.resolve(this.showers)
      return fetch(process.env.BASE_URL + 'skydata/meteor-showers.json')
        .then(r => r.json())
        .then(d => (d && d.showers) || [])
        .catch(() => [])
    },
    dayLabel: function (d) {
      return new Moment(d).format('D')
    },
    lessonOf: function (e) {
      return LESSON[e.kind] || null
    },
    bodyName: function (key) {
      return this.$t('events.body.' + key)
    },
    headline: function (e) {
      switch (e.kind) {
        case 'moon':
          return this.$t('events.moon.' + e.phase)
        case 'shower':
          return this.$t('events.showerPeak', [this.$t('events.shower.' + e.code)])
        case 'opposition':
          return this.$t('events.opposition', [this.bodyName(e.planet)])
        case 'elongation':
          return this.$t(e.east ? 'events.elongationEast' : 'events.elongationWest',
            [this.bodyName(e.planet)])
        case 'conjunction':
          return this.$t('events.conjunction', [this.bodyName(e.a), this.bodyName(e.b)])
      }
      return ''
    },
    detail: function (e) {
      switch (e.kind) {
        case 'shower': {
          const parts = [this.$t('events.zhr', [e.zhr])]
          // 달이 밝으면 유성우는 반이 지워진다. 나가기 전에 알아야 한다.
          if (e.moonIllum !== null && e.moonIllum !== undefined) {
            const pct = Math.round(e.moonIllum * 100)
            parts.push(pct >= 60
              ? this.$t('events.moonBad', [pct])
              : this.$t('events.moonOk', [pct]))
          }
          return parts.join(' · ')
        }
        case 'opposition':
          return this.$t('events.oppositionWhy')
        case 'elongation':
          return this.$t('events.elongationWhy', [e.sep.toFixed(0)])
        case 'conjunction':
          return this.$t('events.conjunctionWhy', [e.sep.toFixed(1)])
      }
      return ''
    }
  }
}
</script>

<style>
.ev-month {
  color: rgba(255, 255, 255, 0.55);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: 3px;
}
.ev-row + .ev-row {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.ev-day {
  flex: 0 0 34px;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
  padding-right: 12px;
  padding-top: 2px;
}
.ev-link {
  text-decoration: none;
  color: #82b1ff !important;
}
.ev-link:hover {
  text-decoration: underline;
}
.ev-note {
  margin-top: 20px;
  margin-bottom: 0;
}
</style>
