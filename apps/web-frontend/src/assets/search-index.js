// 별무리 - 정적 검색 색인
//
// stellarium-web.org 는 천체 검색을 외부 비공개 API(api.noctuasky.com)에
// 의존한다. 별무리는 대신 빌드 타임에 만든 정적 JSON 색인을 쓴다.
// 백엔드 서버가 필요 없으므로 정적 호스팅만으로 사이트 전체가 돌아간다.
//
// 색인은 apps/search-index/build_index.py 가 skydata 의 .eph 타일에서 생성한다.
// 엔진이 실제로 해석할 수 있는 천체만 들어있으므로 검색 결과를 누르면
// 반드시 선택된다.

const INDEX_URL = process.env.BASE_URL + 'search-index.json'

// 검색어와 식별자를 같은 규칙으로 정규화한다.
// "M31" 로 쳐도 "M 31" 이 잡히고, "ngc224" 로 쳐도 "NGC 224" 가 잡히게 한다.
const normalize = (s) => s.toLowerCase().replace(/[\s_*|]+/g, '')

// 검색에 노출하지 않을 접두사. 사람이 치지 않으면서 결과만 어지럽힌다.
const isNoise = (name) => name.startsWith('HIP ') || name.startsWith('Cl ')

const MODEL_BY_TYPE = { Con: 'constellation', '*': 'star' }

let loading = null
let entries = null // { key, name, rec } 평탄화 목록

function toSkySource (rec, match) {
  return {
    names: rec.n.slice(),
    types: [rec.t],
    model: MODEL_BY_TYPE[rec.t] || 'dso',
    model_data: {},
    // 표시용으로 실제 매칭된 이름을 돌려준다 (검색 결과 목록에서 사용).
    match: match || rec.n[0],
    // 한글 이름. 원본 API 에는 없는 별무리 확장 필드.
    koreanNames: rec.k || []
  }
}

function build (data) {
  const list = []
  for (const rec of data.objects) {
    const names = rec.n.concat(rec.k || [])
    for (const name of names) {
      list.push({ key: normalize(name), name: name, rec: rec })
    }
  }
  return list
}

export function load () {
  if (!loading) {
    loading = fetch(INDEX_URL)
      .then(res => {
        if (!res.ok) throw new Error('search index HTTP ' + res.status)
        return res.json()
      })
      .then(data => {
        entries = build(data)
        return entries
      })
      .catch(err => {
        // 다음 검색에서 다시 시도할 수 있게 캐시를 비운다.
        loading = null
        throw err
      })
  }
  return loading
}

// 밝을수록, 그리고 앞에서부터 일치할수록 위로 올린다.
function score (entry, key) {
  const pos = entry.key.indexOf(key)
  const vmag = entry.rec.v === null || entry.rec.v === undefined ? 15 : entry.rec.v
  // 완전 일치 > 접두 일치 > 부분 일치
  const kind = entry.key === key ? 0 : (pos === 0 ? 1 : 2)
  return kind * 1000 + vmag
}

export function query (str, limit) {
  limit = limit || 10
  const key = normalize(str || '')
  if (!key) return Promise.resolve([])
  return load().then(() => {
    const hits = []
    const seen = new Set()
    for (const e of entries) {
      if (e.key.indexOf(key) === -1) continue
      if (isNoise(e.name) && e.key !== key) continue
      hits.push(e)
    }
    hits.sort((a, b) => score(a, key) - score(b, key))
    const res = []
    for (const e of hits) {
      if (seen.has(e.rec)) continue
      seen.add(e.rec)
      res.push(toSkySource(e.rec, e.name))
      if (res.length >= limit) break
    }
    return res
  })
}

export function lookupByName (name) {
  const key = normalize(name)
  return load().then(() => {
    const hit = entries.find(e => e.key === key)
    if (!hit) throw new Error('unknown sky source: ' + name)
    return toSkySource(hit.rec, hit.name)
  })
}

// 엔진에서 온 천체의 식별자로 한글 이름을 찾는다.
export function koreanNamesFor (designations) {
  if (!entries || !designations) return []
  for (const d of designations) {
    const key = normalize(d)
    const hit = entries.find(e => e.key === key)
    if (hit && hit.rec.k) return hit.rec.k.slice()
  }
  return []
}

export default { load, query, lookupByName, koreanNamesFor }
