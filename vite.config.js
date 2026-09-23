import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/duty-issue/',   // 必須和 GitHub repo 名稱一致
  plugins: [vue()],
})
