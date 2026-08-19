// 별무리 관측 플래너 플러그인
//
// stellarium-web 은 src/plugins/<이름>/index.js 를 자동으로 찾아 읽는다
// (src/main.js 의 require.context 참고). 덕분에 업스트림 파일을 건드리지
// 않고 사이드 패널에 기능을 추가할 수 있다.

import Tonight from './tonight.vue'

export default {
  name: 'planner',
  panelRoutes: [
    {
      path: '/p/tonight',
      component: Tonight,
      meta: { tabName: '오늘 밤', prio: 1 }
    }
  ]
}
