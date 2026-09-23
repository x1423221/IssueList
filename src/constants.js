// 前後端共用的代碼（後端 Code.gs 也有同一份，修改時兩邊要一起改）
export const SHIFTS = [
  { value: 'D', label: '白班' },
  { value: 'E', label: '小夜' },
  { value: 'N', label: '大夜' }
]

export const CATEGORIES = ['系統', '設備', '網路', '其他']

export const STATUSES = [
  { value: 'O', label: '待處理' },
  { value: 'P', label: '處理中' },
  { value: 'C', label: '已結案' }
]

export const shiftLabel = v => SHIFTS.find(s => s.value === v)?.label || v
export const statusLabel = v => STATUSES.find(s => s.value === v)?.label || v

// 本機時區的 yyyy-MM-dd
export function formatDate(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}
