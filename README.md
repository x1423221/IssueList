# 值班問題登打（LIFF）

Vue 3 + LIFF，部署於 GitHub Pages；後端為 Google Apps Script，資料存 Google 試算表。

## 本機開發
1. `cp .env.example .env.local` 並填入 LIFF ID 與 Apps Script `/exec` 網址
2. `npm install`
3. `npm run dev`

## 部署
push 到 `main` 即由 GitHub Actions 自動建置並部署。
需在 repo Settings → Secrets and variables → Actions → Variables 設定
`VITE_LIFF_ID`、`VITE_GAS_URL`，並將 Settings → Pages 的 Source 設為 GitHub Actions。

## 目錄
- `src/` 前端
- `gas/Code.gs` Apps Script 後端備份
