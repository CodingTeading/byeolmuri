// 별무리 - 하늘 밝기 설정
//
// 이 프로젝트가 더한 화면이다. 상류(Stellarium Web)에는 없다.

<template>
<v-dialog scrollable max-width='560' v-model="$store.state.showSkyBrightnessDialog">
<v-card v-if="$store.state.showSkyBrightnessDialog" class="secondary white--text">
  <v-card-title><div class="text-h5">{{ $t('skyBrightness.title') }}</div></v-card-title>
  <v-card-text class="white--text" style="max-height: 70vh;">
    <p class="text-body-2">{{ $t('skyBrightness.intro') }}</p>
    <v-radio-group v-model="bortle" hide-details class="mt-0 pt-0">
      <v-radio v-for="l in levels" :key="l.key" :value="l.bortle" color="blue lighten-2" class="sb-level">
        <template v-slot:label>
          <div>
            <div class="white--text">{{ $t('skyBrightness.' + l.key) }}</div>
            <div class="grey--text text--lighten-1 text-caption">{{ $t('skyBrightness.' + l.key + 'Desc') }}</div>
          </div>
        </template>
      </v-radio>
    </v-radio-group>
    <p class="grey--text text-caption sb-note">{{ $t('skyBrightness.lessonNote') }}</p>
  </v-card-text>
  <v-card-actions>
    <v-spacer></v-spacer>
    <v-btn class="blue--text darken-1" text @click.native="$store.state.showSkyBrightnessDialog = false">{{ $t('Close') }}</v-btn>
  </v-card-actions>
</v-card>
</v-dialog>
</template>

<script>

import sb from '@/assets/sky-brightness.js'

export default {
  data: function () {
    return {
      levels: sb.LEVELS,
      chosen: sb.load()
    }
  },
  watch: {
    // 창을 열 때마다 저장된 값을 다시 읽는다. 레슨이 엔진의 값을 잠시
    // 바꿔 두므로 엔진에게 물어볼 수는 없다.
    '$store.state.showSkyBrightnessDialog': function (open) {
      if (open) this.chosen = sb.load()
    }
  },
  computed: {
    // 고른 값은 저장된 설정이지 엔진의 현재 값이 아니다. 레슨이 도는
    // 동안 엔진은 LESSON_BORTLE 로 고정되는데, 그때 이 창을 열었다고
    // 사용자가 고른 것이 '시골'로 보이면 안 된다.
    bortle: {
      get: function () {
        return this.chosen
      },
      set: function (newValue) {
        this.chosen = newValue
        sb.save(newValue)
        sb.applyTo(this.$stel, newValue)
      }
    }
  }
}
</script>

<style>
.sb-level {
  margin-bottom: 14px;
}
.sb-note {
  margin-top: 20px;
  margin-bottom: 0;
}
</style>
