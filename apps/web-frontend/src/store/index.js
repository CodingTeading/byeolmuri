// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

import Vue from 'vue'
import Vuex from 'vuex'
import _ from 'lodash'

Vue.use(Vuex)

const createStore = () => {
  var pluginsModules = {}
  for (const i in Vue.SWPlugins) {
    const plugin = Vue.SWPlugins[i]
    if (plugin.storeModule) {
      console.log('Register store module for plugin: ' + plugin.name)
      pluginsModules[plugin.name] = plugin.storeModule
    }
  }

  return new Vuex.Store({
    modules: pluginsModules,

    state: {
      stel: null,
      initComplete: false,

      showNavigationDrawer: false,
      showDataCreditsDialog: false,
      showViewSettingsDialog: false,
      showPlanetsVisibilityDialog: false,
      showSkyBrightnessDialog: false,
      showObservationLogDialog: false,
      showSkyEventsDialog: false,
      // 관측 기록 창을 열 때 미리 채워 둘 밑그림. 레슨 마지막 단계나
      // 하늘에서 넘겨준다. 창이 열리면서 비운다.
      logDraft: null,
      showLocationDialog: false,
      selectedObject: undefined,

      showSidePanel: false,

      showMainToolBar: true,
      showLocationButton: true,
      showTimeButtons: true,
      showObservingPanelTabsButtons: true,
      showSelectedInfoButtons: true,
      showFPS: false,
      showEquatorialJ2000GridButton: false,

      fullscreen: false,
      nightmode: false,
      wasmSupport: true,

      autoDetectedLocation: {
        short_name: 'Unknown',
        country: 'Unknown',
        street_address: '',
        lat: 0,
        lng: 0,
        alt: 0,
        accuracy: 5000
      },

      currentLocation: {
        short_name: 'Unknown',
        country: 'Unknown',
        street_address: '',
        lat: 0,
        lng: 0,
        alt: 0,
        accuracy: 5000
      },

      useAutoLocation: true
    },
    mutations: {
      replaceStelWebEngine (state, newTree) {
        // mutate StelWebEngine state
        state.stel = newTree
      },
      toggleBool (state, varName) {
        _.set(state, varName, !_.get(state, varName))
      },
      setValue (state, { varName, newValue }) {
        _.set(state, varName, newValue)
      },
      setAutoDetectedLocation (state, newValue) {
        state.autoDetectedLocation = { ...newValue }
        if (state.useAutoLocation) {
          state.currentLocation = { ...newValue }
        }
      },
      setUseAutoLocation (state, newValue) {
        state.useAutoLocation = newValue
        if (newValue) {
          state.currentLocation = { ...state.autoDetectedLocation }
        }
      },
      setCurrentLocation (state, newValue) {
        state.useAutoLocation = false
        state.currentLocation = { ...newValue }
      },
      setSelectedObject (state, newValue) {
        state.selectedObject = newValue
      }
    }
  })
}

export default createStore
