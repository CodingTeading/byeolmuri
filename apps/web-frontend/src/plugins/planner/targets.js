// 별무리 관측 플래너 - 관측 대상 선정
//
// 엔진이 로드해 둔 천체를 훑어 오늘 밤 볼 만한 것을 고른다.
// 엔진 열거는 listObjs 를 쓴다 (upstream 의 g_ret 공유 버그를 고친 뒤에야
// 제대로 동작한다. src/js/obj.js 참고).

import astro from './astro'
import searchIndex from '@/assets/search-index'

// 소형 망원경으로 볼 수 있는 범위. 이보다 어두우면 계획 세울 의미가 적다.
const MAX_MAG = 10
// 이 고도 밑으로는 대기 때문에 관측 가치가 급격히 떨어진다.
const MIN_ALT = 20 * Math.PI / 180

function radecOf (stel, obj, obs) {
  const v = obj.getInfo('RADEC', obs)
  const s = stel.c2s(v)
  return { ra: s[0], dec: stel.anpm(s[1]) }
}

/*
 * 오늘 밤 관측 후보를 모아 점수순으로 돌려준다.
 *
 * 점수는 세 가지를 합친다.
 *   - 최고 고도: 높을수록 대기를 적게 통과한다. 가장 중요하다.
 *   - 관측 가능 시간: 길수록 여유 있게 볼 수 있다.
 *   - 밝기: 밝을수록 찾기 쉽고 디테일이 산다.
 */
export function recommend (stel, night, limit) {
  const lat = stel.core.observer.latitude
  const lon = stel.core.observer.longitude
  const obs = stel.observer.clone()
  const mid = night.duskEnd !== null && night.dawnStart !== null
    ? (night.duskEnd + night.dawnStart) / 2 : night.sunset
  obs.utc = mid

  const out = []
  const modules = ['dsos', 'planets']
  for (const modName of modules) {
    const mod = stel.core[modName]
    if (!mod || !mod.listObjs) continue
    let objs = []
    try {
      objs = mod.listObjs(obs, MAX_MAG, () => true)
    } catch (e) {
      continue
    }
    for (const obj of objs) {
      try {
        const names = obj.designations()
        if (!names || !names.length) continue
        const vmag = obj.getInfo('vmag', obs)
        const rd = radecOf(stel, obj, obs)
        const vis = astro.visibility(rd.ra, rd.dec, lat, lon, night, MIN_ALT)
        if (!vis || vis.aboveMinutes < 30) continue
        out.push({
          names: names,
          koreanNames: searchIndex.koreanNamesFor(names),
          type: obj.getInfo('type') || '',
          vmag: typeof vmag === 'number' && isFinite(vmag) ? vmag : null,
          maxAlt: vis.maxAlt,
          bestTime: vis.bestTime,
          aboveMinutes: vis.aboveMinutes,
          module: modName
        })
      } catch (e) {
        // 개별 천체 계산 실패가 전체를 막지 않게 한다.
      } finally {
        try { obj.destroy() } catch (e) {}
      }
    }
  }
  obs.destroy && obs.destroy()

  const maxMinutes = out.reduce((m, t) => Math.max(m, t.aboveMinutes), 1)
  for (const t of out) {
    const altScore = Math.max(0, Math.sin(t.maxAlt))
    const timeScore = t.aboveMinutes / maxMinutes
    const magScore = t.vmag === null ? 0.3 : Math.max(0, (MAX_MAG - t.vmag) / MAX_MAG)
    // 행성과 달은 눈에 띄고 초보자에게도 의미가 커서 약간 가산한다.
    const bonus = t.module === 'planets' ? 0.15 : 0
    t.score = altScore * 0.45 + timeScore * 0.2 + magScore * 0.35 + bonus
  }
  out.sort((a, b) => b.score - a.score)
  return out.slice(0, limit || 12)
}

export default { recommend, MIN_ALT, MAX_MAG }
