import liff from '@line/liff'

const GAS_URL = import.meta.env.VITE_GAS_URL

// ID Token 快過期（剩不到 1 分鐘）時，登出再重新載入，讓 LIFF 重新取得新的 token
function ensureFreshToken() {
  const decoded = liff.getDecodedIDToken()
  if (decoded && decoded.exp * 1000 < Date.now() + 60 * 1000) {
    liff.logout()
    window.location.reload()
    throw new Error('登入已過期，正在重新登入…')
  }
}

// 統一呼叫 Apps Script 的入口
// Content-Type 用 text/plain，避免觸發 CORS 預檢（Apps Script 不處理 OPTIONS）
export async function callApi(action, payload = {}) {
  ensureFreshToken()

  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, idToken: liff.getIDToken(), ...payload })
  })
  const result = await res.json()
  if (!result.ok) throw new Error(result.error)
  return result.data
}
