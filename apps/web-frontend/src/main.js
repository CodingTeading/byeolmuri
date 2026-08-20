// Stellarium Web - Copyright (c) 2022 - Stellarium Labs SRL
//
// This program is licensed under the terms of the GNU AGPL v3, or
// alternatively under a commercial licence.
//
// The terms of the AGPL v3 license can be found in the main directory of this
// repository.

// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import '@mdi/font/css/materialdesignicons.css'
import store from './store'
import Router from 'vue-router'
import fullscreen from 'vue-fullscreen'
import VueJsonp from 'vue-jsonp'
import VueCookie from 'vue-cookie'
import _ from 'lodash'

import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
import VueI18n from 'vue-i18n'
import Moment from 'moment'
import langs from './i18n/langs'
import head from './i18n/head'

Vue.config.productionTip = false

// this part resolve an issue where the markers would not appear
delete Icon.Default.prototype._getIconUrl

Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
})

Vue.use(VueCookie)
Vue.use(fullscreen)
Vue.use(VueJsonp)
Vue.use(VueI18n)

// Load all plugins JS modules found in the plugins directory
var plugins = []
const ctx = require.context('./plugins/', true, /\.\/\w+\/index\.js$/)
for (const i in ctx.keys()) {
  const key = ctx.keys()[i]
  console.log('Loading plugin: ' + key)
  const mod = ctx(key)
  plugins.push(mod.default)
}
Vue.SWPlugins = plugins

// Loads all GUI translations found in the src/locales/ directory
var messages = {}
const guiLocales = require.context('./locales', true, /[A-Za-z0-9-_,\s]+\.json$/i)
guiLocales.keys().forEach(key => {
  const matched = key.match(/([A-Za-z0-9-_]+)\./i)
  if (matched && matched.length > 1) {
    const locale = matched[1]
    messages[locale] = guiLocales(key)
  }
})

// Loads all GUI translations found in the src/plugins/xxx/locales directories
const pluginsLocales = require.context('./plugins/', true, /\.\/\w+\/locales\/([A-Za-z0-9-_]+)\.json$/i)
pluginsLocales.keys().forEach(key => {
  const matched = key.match(/\.\/\w+\/locales\/([A-Za-z0-9-_]+)\.json/i)
  if (matched && matched.length > 1) {
    const locale = matched[1]
    if (messages[locale] === undefined) {
      messages[locale] = pluginsLocales(key)
    } else {
      _.merge(messages[locale], pluginsLocales(key))
    }
  }
})

// 첫 언어는 주소에서 정한다. 공유된 링크는 보낸 사람의 언어로 열려야 한다.
const loc = langs.detect(window.location.pathname)
Moment.locale(langs.momentLocale(loc))
var i18n = new VueI18n({
  locale: loc,
  messages: messages,
  formatFallbackMessages: true,
  // 번역이 없으면 한국어로 떨어진다. 콘텐츠가 한국어에서 출발하기 때문이다.
  fallbackLocale: [langs.DEFAULT_LANG, 'en'],
  silentTranslationWarn: true
})
Vue.prototype.$langs = langs
// 화면에서 링크를 만들 때 쓴다. to="/p/learn" 대신 :to="$lpath('/p/learn')".
// 접두어 없이 걸어도 라우터 가드가 고쳐주지만, 그러면 이동이 한 번 더 생긴다.
// 컴포넌트 밖(sw_helpers 같은 순수 모듈)에서 현재 언어를 물어볼 때 쓴다.
// i18n 인스턴스를 직접 import 하면 순환 참조가 생긴다.
Vue.prototype.$i18nLocale = function () { return i18n.locale }
Vue.prototype.$lpath = function (path) {
  return langs.withLang(path, this.$i18n ? this.$i18n.locale : langs.DEFAULT_LANG)
}

// Setup routes for the app
Vue.use(Router)
// Base routes
//
// 하늘(엔진)은 /sky 에 있다. 최상위 주소 / 는 포털이 가져간다(learn 플러그인).
// 첫 화면에서 3MB WASM 을 내려받지 않아야 검색엔진과 느린 회선에서 살아남고,
// "밤하늘을 읽는 법을 배우는 곳"이라는 정체성이 주소에 드러난다.
// 하늘로 들어오는 문은 셋이다 — /sky, /skysource/<이름>, /p/<탭>.
let routes = [
  {
    // The main page
    path: '/sky',
    name: 'App',
    component: App,
    children: []
  },
  {
    // Main page, but centered on the passed sky source name
    path: '/skysource/:name',
    component: App
  }
]
// Routes exposed by plugins
let defaultObservingRoute = {
  path: '/p/calendar',
  meta: { prio: 2 }
}
for (const i in Vue.SWPlugins) {
  const plugin = Vue.SWPlugins[i]
  if (plugin.routes) {
    routes = routes.concat(plugin.routes)
  }
  if (plugin.panelRoutes) {
    routes[0].children = routes[0].children.concat(plugin.panelRoutes)
    for (const j in plugin.panelRoutes) {
      const r = plugin.panelRoutes[j]
      if (r.meta && r.meta.prio && r.meta.prio < defaultObservingRoute.meta.prio) {
        defaultObservingRoute = r
      }
    }
  }
  if (plugin.vuePlugin) {
    Vue.use(plugin.vuePlugin)
  }
}
routes[0].children.push({
  path: '/p',
  redirect: to => langs.withLang(defaultObservingRoute.path, to.params.lang || i18n.locale)
})

// 모든 주소 앞에 언어를 선택적으로 붙인다.
//   /ko/p/learn  는 물론이고
//   /p/learn     (접두어 없는 예전 링크) 도 그대로 받는다.
// 뒤엣것은 아래 beforeEach 가 언어를 붙인 주소로 옮겨 준다.
const LANG_PARAM = ':lang(' + langs.LANGS.join('|') + ')?'
function localizeRoute (route) {
  const r = Object.assign({}, route)
  if (r.path) {
    r.path = r.path === '/' ? '/' + LANG_PARAM : '/' + LANG_PARAM + r.path
  }
  if (r.alias) {
    const aliases = Array.isArray(r.alias) ? r.alias : [r.alias]
    r.alias = aliases.map(a => (a === '/' ? '/' + LANG_PARAM : '/' + LANG_PARAM + a))
  }
  if (r.children) r.children = r.children.map(localizeRoute)
  return r
}
routes = routes.map(localizeRoute)

var router = new Router({
  mode: 'history',
  base: '/',
  routes: routes
})

// 언어를 주소와 화면에 맞춰 유지한다.
router.beforeEach((to, from, next) => {
  const lang = to.params.lang
  if (!lang) {
    // 접두어가 없는 주소로 들어왔다. 정규 주소로 옮긴다.
    const target = langs.detect(to.fullPath)
    next({ path: langs.withLang(to.path, target), query: to.query, hash: to.hash, replace: true })
    return
  }
  if (i18n.locale !== lang) {
    i18n.locale = lang
    Moment.locale(langs.momentLocale(lang))
  }
  langs.remember(lang)
  head.applyHead(lang, to.path)
  next()
})

// Expose plugins singleton to all Vue instances
Vue.prototype.$stellariumWebPlugins = function () {
  return Vue.SWPlugins
}

/* eslint-disable no-new */
new Vue({
  router,
  store,
  i18n,
  vuetify
}).$mount('#app')
