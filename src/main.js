import { createApp } from 'vue'
import liff from '@line/liff'
import App from './App.vue'

liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
  .then(() => {
    if (!liff.isLoggedIn()) {
      liff.login()   // 只有在外部瀏覽器開啟時才會走到這裡
      return
    }
    createApp(App).mount('#app')
  })
  .catch(err => {
    document.body.innerText = 'LIFF 初始化失敗：' + err.message
  })
