// 관측 기록.
//
// 레슨 19편이 전부 "밖에서 해 보세요"로 끝나는데, 돌아왔을 때 적을 곳이
// 없었다. 「밝기가 변하는 별」 마지막 단계는 글자 그대로 이렇게 시킨다 —
// "기록을 남기세요. 날짜 · 시각 · 판단이면 충분합니다. 이것이 관측 자료입니다."
// 그 말을 지킬 수 있게 하는 것이 이 파일이다.
//
// 서버를 두지 않는다. 이 앱은 계정도 추적도 없는 것이 성질이라, 기록도
// 브라우저 안에만 둔다. 대신 그 사실을 화면에서 밝히고 내보내기를 준다.

const STORAGE_KEY = 'byeolmuri.log'

// 한 사람이 손으로 적는 양이라 넉넉하다. 넘으면 가장 오래된 것부터
// 지우는 대신 저장을 거절한다. 조용히 지우면 자료가 사라진 줄도 모른다.
export const MAX_ENTRIES = 2000

function newId () {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function load () {
  let raw = null
  try { raw = window.localStorage.getItem(STORAGE_KEY) } catch (e) { return [] }
  if (!raw) return []
  let list = null
  try { list = JSON.parse(raw) } catch (e) { return [] }
  if (!Array.isArray(list)) return []
  return list.filter(e => e && typeof e === 'object' && e.at)
}

// 실패를 삼키지 않는다. 저장 공간이 찼는데 저장된 것처럼 굴면
// 사용자는 자기 관측 자료를 잃는다.
export function save (list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch (e) {
    return false
  }
}

export function add (entry) {
  const list = load()
  if (list.length >= MAX_ENTRIES) return null
  const e = {
    id: newId(),
    at: entry.at,
    target: (entry.target || '').trim(),
    note: (entry.note || '').trim(),
    from: entry.from || ''
  }
  list.push(e)
  list.sort((a, b) => String(b.at).localeCompare(String(a.at)))
  return save(list) ? e : null
}

export function remove (id) {
  const list = load().filter(e => e.id !== id)
  return save(list)
}

// 지금 시각을 <input type="datetime-local"> 이 받는 꼴로.
// toISOString 을 쓰면 UTC 로 밀려서 관측 시각이 아홉 시간 어긋난다.
export function nowLocal () {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
         'T' + p(d.getHours()) + ':' + p(d.getMinutes())
}

function csvCell (s) {
  const v = String(s === undefined || s === null ? '' : s)
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

/*
 * CSV 로 내보낸다.
 *
 * 맨 앞의 BOM 은 실수가 아니다. 이것이 없으면 엑셀이 UTF-8 을 알아보지
 * 못해 한글·일본어 기록이 깨진 채로 열린다.
 */
export function toCSV (list, header) {
  const rows = [header.map(csvCell).join(',')]
  for (const e of list) {
    rows.push([e.at, e.target, e.note, e.from].map(csvCell).join(','))
  }
  return '\uFEFF' + rows.join('\r\n') + '\r\n'
}

export default { load, save, add, remove, nowLocal, toCSV, MAX_ENTRIES }
