// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>
  <v-card v-if="selectedObject" transparent :style="cardStyle">
    <v-btn icon style="position: absolute; right: 0" v-on:click.native="unselect()"><v-icon>mdi-close</v-icon></v-btn>
    <!-- 좁은 화면에서는 접어 둔다. 레슨이 단계마다 천체를 고르는데 그때마다
         카드가 통째로 펼쳐지면 정작 봐야 할 하늘이 가려진다. 이름과 종류만
         남기고, 필요한 사람은 눌러서 편다. -->
    <v-btn v-if="compact" icon style="position: absolute; right: 36px"
           v-on:click.native="expanded = !expanded"
           :aria-label="expanded ? $t('Collapse') : $t('Expand')">
      <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
    </v-btn>
    <v-card-title primary-title :class="{ 'py-2': collapsed }" v-on:click="onTitleClick">
      <div style="width: 100%">
        <img :src="icon" :height="collapsed ? 28 : 48" :width="collapsed ? 28 : 48" align="left" style="margin-top: 3px; margin-right: 10px"/>
        <div style="overflow: hidden; text-overflow: ellipsis;">
          <div :class="collapsed ? 'text-subtitle-1' : 'text-h5'">{{ title }}</div>
          <div class="grey--text text-body-2">{{ type }}</div>
          <!-- 접힌 채로도 밝기와 거리는 보여준다. 레슨이 "천체 정보를 보면
               밝기가 1.8등급" 이라고 짚어 주는데, 이름만 남으면 그 문장이
               휴대전화에서만 헛말이 된다. -->
          <div v-if="collapsed && briefItems.length" class="text-caption white--text" style="margin-top: 2px">
            <span v-for="item in briefItems" :key="item.key" style="margin-right: 10px">
              <span class="grey--text">{{ item.key }}</span> <span v-html="item.value"></span>
            </span>
          </div>
        </div>
      </div>
    </v-card-title>
    <template v-if="!collapsed">
    <v-card-text style="padding-bottom: 5px;">
      <v-row v-if="otherNames.length > 1" style="width: 100%;">
        <v-col cols="12">
          <span style="position: absolute;">{{ $t('Also known as') }}</span><span style="padding-left: 33.3333%">&nbsp;</span><span class="text-caption white--text" v-for="mname in otherNames1to7" :key="mname" style="margin-right: 15px; font-weight: 500;">{{ mname }}</span>
          <v-btn small icon class="grey--text" v-if="otherNames.length > 8" v-on:click.native="showMinorNames = !showMinorNames" style="margin-top: -5px; margin-bottom: -5px;"><v-icon>mdi-dots-horizontal</v-icon></v-btn>
          <span class="text-caption white--text" v-for="mname in otherNames8andMore" :key="mname" style="margin-right: 15px; font-weight: 500">{{ mname }}</span>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-text>
      <template v-for="item in items">
        <v-row style="width: 100%" :key="item.key" no-gutters>
          <v-col cols="4" style="color: #dddddd">{{ item.key }}</v-col>
          <v-col cols="8" style="font-weight: 500" class="white--text"><span v-html="item.value"></span></v-col>
        </v-row>
      </template>
      <div style="margin-top: 15px" class="white--text" v-html="wikipediaSummary"></div>
    </v-card-text>
    <v-card-actions style="margin-top: -25px">
      <v-spacer/>
      <template v-for="item in pluginsSelectedInfoExtraGuiComponents">
        <component :is="item" :key="item"></component>
      </template>
    </v-card-actions>
    </template>
    <v-dialog v-model="showShareLinkDialog" width="500px" absolute>
      <v-card style="height: 180px" class="secondary white--text">
        <v-card-title primary-title>
          <div>
            <h3 class="text-h5 mb-0">Share link</h3>
          </div>
        </v-card-title>
        <v-card-text style="width:100%;">
          <v-row style="width: 100%">
            <v-text-field id="link_inputid" v-model="shareLink" label="Link" solo readonly></v-text-field>
            <v-btn @click.native.stop="copyLink">Copy</v-btn>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>
    <div v-if="$store.state.showSelectedInfoButtons && !collapsed" style="position: absolute; right: 0px; bottom: -50px;">
      <v-btn v-if="!showPointToButton" fab small color="transparent" @click.native="showShareLinkDialog = !showShareLinkDialog">
        <v-icon>mdi-link</v-icon>
      </v-btn>
      <v-btn v-if="showPointToButton" fab small color="transparent" v-on:click.native="lockToSelection()">
        <img src="@/assets/images/svg/ui/point_to.svg" height="40px" style="min-height: 40px"></img>
      </v-btn>
      <v-btn v-if="!showPointToButton" fab small color="transparent" @mousedown="zoomOutButtonClicked()">
        <img :class="{bt_disabled: !zoomOutButtonEnabled}" src="@/assets/images/svg/ui/remove_circle_outline.svg" height="40px" style="min-height: 40px"></img>
      </v-btn>
      <v-btn v-if="!showPointToButton" fab small color="transparent" @mousedown="zoomInButtonClicked()">
        <img :class="{bt_disabled: !zoomInButtonEnabled}" src="@/assets/images/svg/ui/add_circle_outline.svg" height="40px" style="min-height: 40px"></img>
      </v-btn>
    </div>
    <v-snackbar bottom left :timeout="2000" v-model="copied" color="secondary" >
      Link copied
    </v-snackbar>
  </v-card>
</template>

<script>

import Moment from 'moment'
import swh from '@/assets/sw_helpers.js'

export default {
  data: function () {
    return {
      showMinorNames: false,
      wikipediaData: undefined,
      shareLink: undefined,
      showShareLinkDialog: false,
      copied: false,
      expanded: false,
      items: []
    }
  },
  computed: {
    // 폭이 좁은 화면(휴대전화)에서만 접는다. 태블릿부터는 카드가 하늘을
    // 가리지 않을 만큼 화면이 넓다.
    compact: function () {
      return this.$vuetify.breakpoint.xsOnly
    },
    collapsed: function () {
      return this.compact && !this.expanded
    },
    // 접었을 때 한 줄로 보여줄 값. 밝기와 거리면 레슨이 짚는 것은 거의 다 된다.
    briefItems: function () {
      const want = [this.$t('Magnitude'), this.$t('Distance'), this.$t('Phase')]
      return this.items.filter(i => want.indexOf(i.key) !== -1).slice(0, 2)
    },
    cardStyle: function () {
      const bg = 'background: rgba(66, 66, 66, 0.3);'
      // 펼쳐도 화면을 다 덮지는 않게 한다.
      return this.compact ? bg + ' max-height: 62vh; overflow-y: auto;' : bg
    },
    selectedObject: function () {
      return this.$store.state.selectedObject
    },
    stelSelectionId: function () {
      return this.$store.state.stel && this.$store.state.stel.selection ? this.$store.state.stel.selection : undefined
    },
    title: function () {
      return this.selectedObject ? this.otherNames[0] : 'Selection'
    },
    otherNames: function () {
      return this.selectedObject ? swh.namesForSkySource(this.selectedObject, 26) : undefined
    },
    otherNames1to7: function () {
      return this.otherNames.slice(1, 8)
    },
    otherNames8andMore: function () {
      return this.showMinorNames ? this.otherNames.slice(8) : []
    },
    wikipediaSummary: function () {
      if (!this.wikipediaData) return ''
      const page = this.wikipediaData.query.pages[Object.keys(this.wikipediaData.query.pages)[0]]
      if (!page || !page.extract) return ''
      const wl = '<b><a style="color: #62d1df;" target="_blank" rel="noopener" href="' + this.wikipediaLink + '">wikipedia</a></b></i>'
      return page.extract.replace(/<p>/g, '').replace(/<\/p>/g, '') + '<span class="grey--text text-caption" style="margin-left:auto; margin-right:0;"><i>&nbsp; ' + this.$t('more on {0}', [wl]) + '</span>'
    },
    wikipediaLink: function () {
      const page = this.wikipediaData.query.pages[Object.keys(this.wikipediaData.query.pages)[0]]
      if (!page || !page.extract) return ''
      return 'https://en.wikipedia.org/wiki/' + page.title
    },
    type: function () {
      if (!this.selectedObject) return this.$t('Unknown')
      let morpho = ''
      if (this.selectedObject.model_data && this.selectedObject.model_data.morpho) {
        morpho = swh.nameForGalaxyMorpho(this.selectedObject.model_data.morpho)
        if (morpho) {
          morpho = morpho + ' '
        }
      }
      return morpho + swh.nameForSkySourceType(this.selectedObject.types[0])
    },
    icon: function () {
      return swh.iconForSkySource(this.selectedObject)
    },
    showPointToButton: function () {
      if (!this.$store.state.stel.lock) return true
      if (this.$store.state.stel.lock !== this.$store.state.stel.selection) return true
      return false
    },
    zoomInButtonEnabled: function () {
      if (!this.$store.state.stel.lock || !this.selectedObject) return false
      return true
    },
    zoomOutButtonEnabled: function () {
      if (!this.$store.state.stel.lock || !this.selectedObject) return false
      return true
    },
    extraButtons: function () {
      return swh.selectedObjectExtraButtons
    },
    pluginsSelectedInfoExtraGuiComponents: function () {
      let res = []
      for (const i in this.$stellariumWebPlugins()) {
        const plugin = this.$stellariumWebPlugins()[i]
        if (plugin.selectedInfoExtraGuiComponents) {
          res = res.concat(plugin.selectedInfoExtraGuiComponents)
        }
      }
      return res
    }
  },
  watch: {
    selectedObject: function (s) {
      this.showMinorNames = false
      this.wikipediaData = undefined
      // 다른 천체가 선택되면 다시 접는다. 레슨이 다음 단계로 넘어갔는데
      // 앞 단계에서 펼쳐 둔 카드가 그대로 하늘을 덮고 있으면 안 된다.
      this.expanded = false
      if (!s) {
        if (this.timer) clearInterval(this.timer)
        this.timer = undefined
        return
      }
      var that = this
      that.items = that.computeItems()
      if (that.timer) clearInterval(that.timer)
      that.timer = setInterval(() => { that.items = that.computeItems() }, 1000)

      swh.getSkySourceSummaryFromWikipedia(s).then(data => {
        that.wikipediaData = data
      }, reason => { })
    },
    stelSelectionId: function (s) {
      if (!this.$stel.core.selection) {
        this.$store.commit('setSelectedObject', 0)
        return
      }
      swh.sweObj2SkySource(this.$stel.core.selection).then(res => {
        this.$store.commit('setSelectedObject', res)
      }, err => {
        console.log("Couldn't find info for object " + s + ':' + err)
        this.$store.commit('setSelectedObject', 0)
      })
    },
    showShareLinkDialog: function (b) {
      this.shareLink = swh.getShareLink(this)
    }
  },
  methods: {
    onTitleClick: function () {
      if (this.compact) this.expanded = !this.expanded
    },
    computeItems: function () {
      const obj = this.$stel.core.selection
      if (!obj) return []
      const that = this

      const ret = []

      const addAttr = (key, attr, format) => {
        const v = obj.getInfo(attr)
        if (v && !isNaN(v)) {
          ret.push({
            key: key,
            value: format ? format(v) : v.toString()
          })
        }
      }

      addAttr(that.$t('Magnitude'), 'vmag', this.formatMagnitude)
      addAttr(that.$t('Distance'), 'distance', this.formatDistance)
      if (this.selectedObject.model_data) {
        if (this.selectedObject.model_data.radius) {
          ret.push({
            key: that.$t('Radius'),
            value: this.selectedObject.model_data.radius.toString() + ' Km'
          })
        }
        if (this.selectedObject.model_data.spect_t) {
          ret.push({
            key: that.$t('Spectral Type'),
            value: this.selectedObject.model_data.spect_t
          })
        }
        if (this.selectedObject.model_data.dimx) {
          const dimy = this.selectedObject.model_data.dimy ? this.selectedObject.model_data.dimy : this.selectedObject.model_data.dimx
          ret.push({
            key: that.$t('Size'),
            value: this.selectedObject.model_data.dimx.toString() + "' x " + dimy.toString() + "'"
          })
        }
      }
      const formatInt = function (num, padLen) {
        const pad = new Array(1 + padLen).join('0')
        return (pad + num).slice(-pad.length)
      }
      const formatRA = function (a) {
        const raf = that.$stel.a2tf(a, 1)
        return '<div class="radecVal">' + formatInt(raf.hours, 2) + '<span class="radecUnit">h</span>&nbsp;</div><div class="radecVal">' + formatInt(raf.minutes, 2) + '<span class="radecUnit">m</span></div><div class="radecVal">' + formatInt(raf.seconds, 2) + '.' + raf.fraction + '<span class="radecUnit">s</span></div>'
      }
      const formatAz = function (a) {
        const raf = that.$stel.a2af(a, 1)
        return '<div class="radecVal">' + formatInt(raf.degrees < 0 ? raf.degrees + 180 : raf.degrees, 3) + '<span class="radecUnit">°</span></div><div class="radecVal">' + formatInt(raf.arcminutes, 2) + '<span class="radecUnit">\'</span></div><div class="radecVal">' + formatInt(raf.arcseconds, 2) + '.' + raf.fraction + '<span class="radecUnit">"</span></div>'
      }
      const formatDec = function (a) {
        const raf = that.$stel.a2af(a, 1)
        return '<div class="radecVal">' + raf.sign + formatInt(raf.degrees, 2) + '<span class="radecUnit">°</span></div><div class="radecVal">' + formatInt(raf.arcminutes, 2) + '<span class="radecUnit">\'</span></div><div class="radecVal">' + formatInt(raf.arcseconds, 2) + '.' + raf.fraction + '<span class="radecUnit">"</span></div>'
      }
      const posCIRS = this.$stel.convertFrame(this.$stel.core.observer, 'ICRF', 'JNOW', obj.getInfo('radec'))
      const radecCIRS = this.$stel.c2s(posCIRS)
      const raCIRS = this.$stel.anp(radecCIRS[0])
      const decCIRS = this.$stel.anpm(radecCIRS[1])
      ret.push({
        key: that.$t('Ra/Dec'),
        value: formatRA(raCIRS) + '&nbsp;&nbsp;&nbsp;' + formatDec(decCIRS)
      })
      const azalt = this.$stel.c2s(this.$stel.convertFrame(this.$stel.core.observer, 'ICRF', 'OBSERVED', obj.getInfo('radec')))
      const az = this.$stel.anp(azalt[0])
      const alt = this.$stel.anpm(azalt[1])
      ret.push({
        key: that.$t('Az/Alt'),
        value: formatAz(az) + '&nbsp;&nbsp;&nbsp;' + formatDec(alt)
      })
      addAttr(that.$t('Phase'), 'phase', this.formatPhase)
      const vis = obj.computeVisibility()
      let str = ''
      if (vis.length === 0) {
        str = that.$t('Not visible tonight')
      } else if (vis[0].rise === null) {
        str = that.$t('Always visible tonight')
      } else {
        str = that.$t('Rise: {0}&nbsp;&nbsp;&nbsp; Set: {1}', [this.formatTime(vis[0].rise), this.formatTime(vis[0].set)])
      }
      ret.push({
        key: that.$t('Visibility'),
        value: str
      })
      return ret
    },
    formatPhase: function (v) {
      return (v * 100).toFixed(0) + '%'
    },
    formatMagnitude: function (v) {
      if (!v) {
        return 'Unknown'
      }
      return v.toFixed(2)
    },
    formatDistance: function (d) {
      // d is in AU
      if (!d) {
        return 'NAN'
      }
      // 단위도 번역한다. 레슨 여러 편이 이 줄의 거리를 읽으라고 시키는데
      // 한국어 화면에서 'light years' 가 나오면 본문과 화면이 어긋난다.
      const unit = u => '<span class="radecUnit"> ' + this.$t(u) + '</span>'
      const ly = d * swh.astroConstants.ERFA_AULT / swh.astroConstants.ERFA_DAYSEC / swh.astroConstants.ERFA_DJY
      if (ly >= 0.1) {
        return ly.toFixed(2) + unit('light years')
      }
      if (d >= 0.1) {
        return d.toFixed(2) + unit('AU')
      }
      const meter = d * swh.astroConstants.ERFA_DAU
      if (meter >= 1000) {
        return (meter / 1000).toFixed(2) + unit('km')
      }
      return meter.toFixed(2) + unit('m')
    },
    formatTime: function (jdm) {
      var d = new Date()
      d.setMJD(jdm)
      const utc = new Moment(d)
      utc.utcOffset(this.$store.state.stel.utcoffset)
      return utc.format('HH:mm')
    },
    unselect: function () {
      this.$stel.core.selection = 0
    },
    lockToSelection: function () {
      if (this.$stel.core.selection) {
        this.$stel.pointAndLock(this.$stel.core.selection, 0.5)
      }
    },
    zoomInButtonClicked: function () {
      const currentFov = this.$store.state.stel.fov * 180 / Math.PI
      this.$stel.zoomTo(currentFov * 0.3 * Math.PI / 180, 0.4)
      const that = this
      this.zoomTimeout = setTimeout(_ => { that.zoomInButtonClicked() }, 300)
    },
    zoomOutButtonClicked: function () {
      const currentFov = this.$store.state.stel.fov * 180 / Math.PI
      this.$stel.zoomTo(currentFov * 3 * Math.PI / 180, 0.6)
      const that = this
      this.zoomTimeout = setTimeout(_ => { that.zoomOutButtonClicked() }, 200)
    },
    stopZoom: function () {
      if (this.zoomTimeout) {
        clearTimeout(this.zoomTimeout)
        this.zoomTimeout = undefined
      }
    },
    extraButtonClicked: function (btn) {
      btn.callback()
    },
    copyLink: function () {
      const input = document.querySelector('#link_inputid')
      input.focus()
      input.select()
      this.copied = document.execCommand('copy')
      window.getSelection().removeAllRanges()
      this.showShareLinkDialog = false
    }
  },
  mounted: function () {
    const that = this
    window.addEventListener('mouseup', function (event) {
      that.stopZoom()
    })
  }
}
</script>

<style>
.bt_disabled {
  filter: opacity(0.2);
}

.radecVal {
  display: inline-block;
  font-family: monospace;
  padding-right: 2px;
  font-size: 13px;
  font-weight: bold;
}

.radecUnit {
  color: #dddddd;
  font-weight: normal
}
</style>
