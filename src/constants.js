// 前後端共用的代碼（後端 Code.gs 也有同一份，修改時兩邊要一起改）
export const CATEGORIES = ['系統', '設備', '網路', '其他']
export const MAX_IMAGES = 5

// 本機時區的 yyyy-MM-dd
export function formatDate(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
