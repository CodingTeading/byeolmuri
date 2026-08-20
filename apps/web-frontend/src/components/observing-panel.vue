// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

<template>

<div id="observing-panel-container"
     :class="{observingpanelhidden: !$store.state.showSidePanel, 'sheet-collapsed': collapsed}"
     class="get-click">
  <!-- 손잡이. 좁은 화면에서만 보인다. 눌러서 하늘을 더 넓게 볼 수 있다. -->
  <div class="sheet-handle" @click="toggleSheet">
    <div class="sheet-grip"></div>
  </div>
  <div class="observing-panel-tabsbtn" v-if="$store.state.showObservingPanelTabsButtons">
    <v-btn class='tab-bt' v-for="tab in tabs" small :key="tab.tabName" :to="tab.url" active-class="tab-bt-active">{{ $t(tab.tabName) }}</v-btn>
  </div>
  <div id="observing-panel">
    <router-view style="height: 100%"/>
  </div>
</div>

</template>

<script>
export default {
  data: function () {
    return { collapsed: false }
  },
  methods: {
    // 시트 높이를 CSS 변수로 알린다. 하늘 영역(#stel 의 아래 여백)과
    // 시트 높이가 같은 값을 봐야 서로 어긋나지 않는다.
    applySheetHeight: function () {
      document.documentElement.style.setProperty(
        '--byeolmuri-sheet-h', this.collapsed ? '26vh' : '58vh')
    },
    toggleSheet: function () {
      this.collapsed = !this.collapsed
      this.applySheetHeight()
    }
  },
  mounted: function () {
    this.applySheetHeight()
  },
  computed: {
    showObservingPanel: function () {
      return this.$store.state.showSidePanel
    },
    tabs: function () {
      const res = []
      for (const i in this.$stellariumWebPlugins()) {
        const plugin = this.$stellariumWebPlugins()[i]
        if (plugin.panelRoutes) {
          for (const j in plugin.panelRoutes) {
            const r = plugin.panelRoutes[j]
            if (r.meta && r.meta.tabName) {
              res.push({ tabName: r.meta.tabName, url: r.path })
            }
          }
        }
      }
      return res
    }
  }
}
</script>

<style>
#observing-panel-container {
  position:absolute;
  height: 100%;
  width: 400px;
  right: -400px;
}
.sheet-handle { display: none; }

#observing-panel {
  height: 100%;
  color: white;
  background-color: #212121;
}
.observing-panel-tabsbtn {
  position:absolute;
  right: 400px;
  transform-origin: bottom right;
  transform: rotate(-90deg);
  width: 100vh;
  top: 12px;
  text-align: right;
}
.observingpanelhidden {
  display: none;
}
.tab-bt {
  opacity: 0.5;
}
.tab-bt-active {
  opacity: 1;
}

/* 좁은 화면에서는 옆이 아니라 아래에 둔다.
   400px 패널을 그대로 쓰면 화면을 통째로 덮어 캔버스 너비가 0 이 되고,
   하늘이 아예 보이지 않는다. 이론과 실습을 같이 보여주는 것이 이 사이트의
   전부이므로 하늘이 사라지면 안 된다. */
@media (max-width: 760px) {
  #observing-panel-container {
    width: 100%;
    left: 0;
    right: 0;
    top: auto;
    height: var(--byeolmuri-sheet-h, 58vh);
    bottom: calc(-1 * var(--byeolmuri-sheet-h, 58vh));
    display: flex;
    flex-direction: column;
    transition: height .2s ease, bottom .2s ease;
  }
  .sheet-handle {
    display: block;
    background: #212121;
    padding: 7px 0 3px;
    cursor: pointer;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }
  .sheet-grip {
    width: 38px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.35);
    margin: 0 auto;
  }
  .observing-panel-tabsbtn {
    position: static;
    transform: none;
    width: auto;
    top: auto;
    right: auto;
    text-align: center;
    background: #212121;
    padding-bottom: 2px;
  }
  #observing-panel {
    flex: 1;
    min-height: 0;
  }
}
</style>
