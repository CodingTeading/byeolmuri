// 별무리 - 관측 기록
//
// 이 프로젝트가 더한 화면이다. 상류(Stellarium Web)에는 없다.

<template>
<v-dialog scrollable max-width='620' v-model="$store.state.showObservationLogDialog">
<v-card v-if="$store.state.showObservationLogDialog" class="secondary white--text">
  <v-card-title><div class="text-h5">{{ $t('log.title') }}</div></v-card-title>
  <v-card-text class="white--text" style="max-height: 70vh;">

    <!-- 새로 적기 -->
    <div class="log-form pa-3 mb-4">
      <div class="text-subtitle-2 mb-3">{{ $t('log.newEntry') }}</div>

      <div class="log-field">
        <div class="text-caption log-lab">{{ $t('log.when') }}</div>
        <v-text-field v-model="form.at" type="datetime-local"
                      dark dense hide-details single-line></v-text-field>
      </div>
      <div class="log-field">
        <div class="text-caption log-lab">{{ $t('log.target') }}</div>
        <v-text-field v-model="form.target" :placeholder="$t('log.targetHint')"
                      dark dense hide-details single-line></v-text-field>
      </div>
      <div class="log-field">
        <div class="text-caption log-lab">{{ $t('log.note') }}</div>
        <v-textarea v-model="form.note" :placeholder="$t('log.noteHint')"
                    dark dense hide-details no-resize rows="2"></v-textarea>
      </div>
      <div class="d-flex align-center">
        <span v-if="error" class="red--text text-caption">{{ error }}</span>
        <v-spacer></v-spacer>
        <v-btn small color="primary" :disabled="!canSave" @click="addEntry">{{ $t('log.save') }}</v-btn>
      </div>
    </div>

    <!-- 적어 둔 것 -->
    <div class="d-flex align-center mb-2">
      <span class="text-subtitle-2">{{ $t('log.entries', [entries.length]) }}</span>
      <v-spacer></v-spacer>
      <v-btn small text class="blue--text" :disabled="!entries.length" @click="exportCsv">{{ $t('log.export') }}</v-btn>
    </div>

    <div v-if="!entries.length" class="grey--text text-body-2 py-3">{{ $t('log.empty') }}</div>

    <div v-for="e in entries" :key="e.id" class="log-row d-flex align-start py-2">
      <div style="flex: 1 1 auto; min-width: 0;">
        <div class="text-caption grey--text text--lighten-1">{{ prettyWhen(e.at) }}</div>
        <div class="white--text">{{ e.target || $t('log.noTarget') }}</div>
        <div v-if="e.note" class="text-body-2 grey--text text--lighten-1 log-note">{{ e.note }}</div>
        <div v-if="e.from" class="text-caption blue--text text--lighten-2">{{ $t('log.fromLesson', [e.from]) }}</div>
      </div>
      <v-btn icon small :aria-label="$t('log.remove')" :title="$t('log.remove')" @click="removeEntry(e.id)">
        <v-icon small>mdi-delete-outline</v-icon>
      </v-btn>
    </div>

    <p class="grey--text text-caption log-warn">{{ $t('log.storageNote') }}</p>
  </v-card-text>
  <v-card-actions>
    <v-spacer></v-spacer>
    <v-btn class="blue--text darken-1" text @click.native="$store.state.showObservationLogDialog = false">{{ $t('Close') }}</v-btn>
  </v-card-actions>
</v-card>
</v-dialog>
</template>

<script>

import olog from '@/assets/observation-log.js'
import swh from '@/assets/sw_helpers.js'
import Moment from 'moment'

export default {
  data: function () {
    return {
      entries: [],
      error: '',
      form: { at: olog.nowLocal(), target: '', note: '', from: '' }
    }
  },
  computed: {
    canSave: function () {
      return !!(this.form.at && (this.form.target.trim() || this.form.note.trim()))
    }
  },
  // 창이 이미 열린 채로 이 컴포넌트가 만들어지는 경우가 있다.
  // 그때는 watch 가 울지 않으므로 여기서 한 번 읽는다.
  mounted: function () {
    if (this.$store.state.showObservationLogDialog) this.reload()
  },
  watch: {
    '$store.state.showObservationLogDialog': function (open) {
      if (open) this.reload()
    }
  },
  methods: {
    reload: function () {
      this.entries = olog.load()
      this.error = ''
      // 레슨이나 하늘에서 넘겨준 밑그림이 있으면 그것으로 채운다.
      const draft = this.$store.state.logDraft
      this.form = {
        at: olog.nowLocal(),
        target: (draft && draft.target) || this.selectedName(),
        note: '',
        from: (draft && draft.from) || ''
      }
      this.$store.commit('setValue', { varName: 'logDraft', newValue: null })
    },
    // 하늘에서 무언가를 고른 채로 열었으면 그 이름을 미리 넣어 준다.
    // 천체 정보창이 제목에 쓰는 것과 같은 함수를 쓴다. 그래야 화면에
    // '직녀성' 이라 떠 있는데 기록에는 '* alf Lyr' 이 적히는 일이 없다.
    selectedName: function () {
      const sel = this.$store.state.selectedObject
      if (!sel) return ''
      const names = swh.namesForSkySource(sel, 26)
      return names.length ? names[0] : ''
    },
    addEntry: function () {
      const e = olog.add(this.form)
      if (!e) {
        this.error = this.$t('log.saveFailed')
        return
      }
      this.entries = olog.load()
      this.error = ''
      // from 은 비우지 않는다. 레슨에서 넘어와 창을 연 한 자리에서
      // 두세 줄을 이어 적는 것이 보통인데, 첫 줄에만 레슨 이름이
      // 붙으면 나중에 자료를 볼 때 나머지가 어디서 왔는지 모른다.
      this.form = { at: olog.nowLocal(), target: '', note: '', from: this.form.from }
    },
    removeEntry: function (id) {
      olog.remove(id)
      this.entries = olog.load()
    },
    prettyWhen: function (at) {
      const m = new Moment(at)
      return m.isValid() ? m.format('LLL') : at
    },
    exportCsv: function () {
      const header = [this.$t('log.when'), this.$t('log.target'), this.$t('log.note'), this.$t('log.colLesson')]
      const csv = olog.toCSV(this.entries, header)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'byeolmuri-log-' + new Moment().format('YYYYMMDD') + '.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // 바로 풀면 내려받기가 시작되기 전에 사라지는 브라우저가 있다.
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    }
  }
}
</script>

<style>
.log-form {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
}
/* 떠오르는 라벨은 dense 필드 위에 겹쳐 앉는다. 라벨 대신 위에 한 줄로
   적고, 입력칸은 라벨을 아예 갖지 않게 한다. */
.log-field {
  margin-bottom: 14px;
}
.log-lab {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2px;
}
.log-form .v-input {
  margin-top: 0;
  padding-top: 0;
}
.log-row {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.log-note {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.log-warn {
  margin-top: 20px;
  margin-bottom: 0;
}
</style>
