module.exports = {
  runtimeCompiler: true,

  // /api/* 는 Cloudflare Pages Function 이라 dev server 에는 없다.
  // 로컬에서도 날씨 예보를 보려면 배포본으로 넘긴다.
  // (functions/api/forecast.js 참고. 응답은 서버에서 캐시되므로
  //  로컬 개발이 기상청 할당량을 축내지 않는다.)
  devServer: {
    proxy: {
      '/api': {
        target: 'https://byeolmuri.codingteading.com',
        changeOrigin: true
      }
    }
  },

  publicPath: process.env.CDN_ENV ? process.env.CDN_ENV : '/',

  chainWebpack: config => {
    // workaround taken from webpack/webpack#6642
    config.output
      .globalObject('this')
    // Tell that our main wasm file needs to be loaded by file loader
    config.module
      .rule('mainwasm')
      .test(/stellarium-web-engine\.wasm$/)
      .type('javascript/auto')
      .use('file-loader')
        .loader('file-loader')
        .options({name: '[name].[hash:8].[ext]', outputPath: 'js'})
        .end()
    config.plugin('copy')
      .tap(([pathConfigs]) => {
         const to = pathConfigs[0].to
         pathConfigs[0].force = true // so the original `/public` folder keeps priority
         // add other locations.
         pathConfigs.unshift({
           from: '../skydata',
           to: to + '/skydata',
         })
         return [pathConfigs]
       })
  },

  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: true
    }
  }
}
