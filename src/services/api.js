import liff from '@line/liff'

const GAS_URL = import.meta.env.VITE_GAS_URL

// 統一呼叫 Apps Script 的入口
// Content-Type 用 text/plain，避免觸發 CORS 預檢（Apps Script 不處理 OPTIONS）
export async function callApi(action, payload = {}) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, idToken: liff.getIDToken(), ...payload })
  })
  const result = await res.json()
  if (!result.ok) throw new Error(result.error)
  return result.data
}
