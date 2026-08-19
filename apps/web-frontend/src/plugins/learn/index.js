// 별무리 학습 플러그인
//
// 이론과 실습을 한 화면에 둔다. 왼쪽에는 실제 하늘이 계속 떠 있고
// 오른쪽 패널에서 설명이 진행되며, 설명이 넘어갈 때마다 하늘이 그에 맞춰
// 움직인다. 천문대에서 선생님이 돔을 돌려가며 설명하는 것과 같은 구성이다.
//
// 레슨은 content/<id>.json 하나로 끝난다. 코드를 건드리지 않고
// 파일만 추가하면 레슨이 늘어난다. 형식은 README.md 참고.

import LessonList from './lesson-list.vue'
import LessonView from './lesson-view.vue'

export default {
  name: 'learn',
  panelRoutes: [
    {
      path: '/p/learn',
      component: LessonList,
      meta: { tabName: 'learn.tab', prio: 2 }
    },
    {
      // 레슨 본문. 탭으로는 노출하지 않는다 (meta.tabName 없음).
      path: '/p/learn/:id',
      component: LessonView
    }
  ]
}
