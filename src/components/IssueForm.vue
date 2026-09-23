<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { callApi } from '../services/api'
import { compressImage } from '../services/image'
import { CATEGORIES, MAX_IMAGES, formatDate } from '../constants'

const form = reactive({
  dutyDate: formatDate(new Date()),
  category: CATEGORIES[0],
  title: '',
  content: ''
})
const images = ref([])          // [{ dataUrl, base64 }]
const processing = ref(false)   // 正在壓縮圖片
const submitting = ref(false)
const message = ref('')
const error = ref('')
const fileInput = ref(null)

const formEl = ref(null)

// 選檔和貼上共用：壓縮後加入清單
async function addFiles(files) {
  if (processing.value) return   // 上一批還在處理，避免超過張數上限
  error.value = ''

  const imageFiles = files.filter(f => f.type.startsWith('image/'))
  const room = MAX_IMAGES - images.value.length
  if (room <= 0) {
    error.value = `圖片最多 ${MAX_IMAGES} 張`
    return
  }
  if (imageFiles.length > room) {
    error.value = `圖片最多 ${MAX_IMAGES} 張，這次只加入前 ${room} 張`
  }

  processing.value = true
  try {
    for (const file of imageFiles.slice(0, room)) {
      images.value.push(await compressImage(file))
    }
  } catch (e) {
    error.value = e.message
  } finally {
    processing.value = false
  }
}

function onPickImages(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''   // 清空，讓同一張圖可以再選一次
  addFiles(files)
}

// 整個頁面都能貼上圖片，不需要先點某個欄位
function onPaste(event) {
  // 目前在「查詢」分頁時不處理，避免圖片被加到看不見的表單裡
  if (!formEl.value || formEl.value.offsetParent === null) return

  const items = Array.from(event.clipboardData?.items || [])
  const files = items
    .filter(it => it.kind === 'file' && it.type.startsWith('image/'))
    .map(it => it.getAsFile())
    .filter(Boolean)
  if (!files.length) return   // 純文字貼上，照常處理

  // 如果游標在文字欄位裡，而且剪貼簿也有文字（例如從網頁複製），讓文字照常貼上
  const hasText = items.some(it => it.type === 'text/plain')
  const inTextField = ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
  if (!(hasText && inTextField)) event.preventDefault()

  addFiles(files)
}

onMounted(() => document.addEventListener('paste', onPaste))
onUnmounted(() => document.removeEventListener('paste', onPaste))

function removeImage(index) {
  images.value.splice(index, 1)
}

async function submit() {
  error.value = ''
  message.value = ''
  if (!form.title.trim()) {
    error.value = '請填寫標題'
    return
  }

  submitting.value = true
  try {
    const result = await callApi('createIssue', {
      data: {
        ...form,
        images: images.value.map(img => ({ data: img.base64 }))
      }
    })
    message.value = `已送出，編號 ${result.issueId}`
    // 保留日期、類別，方便連續登打
    form.title = ''
    form.content = ''
    images.value = []
  } catch (e) {
    error.value = '送出失敗：' + e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form ref="formEl" class="issue-form" @submit.prevent="submit">
    <div class="row">
      <label class="field">
        <span>值班日期</span>
        <input type="date" v-model="form.dutyDate" required />
      </label>
      <label class="field">
        <span>類別</span>
        <select v-model="form.category">
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
    </div>

    <label class="field">
      <span>標題</span>
      <input type="text" v-model="form.title" maxlength="100" placeholder="例如：3 樓護理站印表機無法列印" />
    </label>

    <label class="field">
      <span>內容</span>
      <textarea v-model="form.content" rows="8" maxlength="2000"
        placeholder="發生時間、狀況、已做的處理"></textarea>
    </label>

    <div class="field">
      <span>圖片（{{ images.length }} / {{ MAX_IMAGES }}）<small class="paste-tip">電腦上可直接按 Ctrl+V 貼上截圖</small></span>
      <div class="thumbs">
        <div v-for="(img, i) in images" :key="i" class="thumb">
          <img :src="img.dataUrl" alt="" />
          <button type="button" class="remove" @click="removeImage(i)" aria-label="移除這張圖片">×</button>
        </div>
        <button
          v-if="images.length < MAX_IMAGES"
          type="button"
          class="add"
          :disabled="processing || submitting"
          @click="fileInput.click()"
        >{{ processing ? '處理中…' : '+ 加入圖片' }}</button>
      </div>
      <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPickImages" />
    </div>

    <p class="hint">請勿輸入或拍攝病歷號、病患姓名等個資。</p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="success">{{ message }}</p>

    <button type="submit" class="submit" :disabled="submitting || processing">
      <template v-if="submitting">
        送出中…<span v-if="images.length">（含 {{ images.length }} 張圖片）</span>
      </template>
      <template v-else>送出</template>
    </button>
  </form>
</template>

<style scoped>
.issue-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.row {
  display: flex;
  gap: 0.75rem;
}
.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.field > span {
  font-size: 0.9rem;
  color: #555;
}
input[type="date"],
input[type="text"],
select,
textarea {
  font: inherit;
  font-size: 1rem;           /* 16px 以上，iOS 才不會自動放大畫面 */
  padding: 0.6rem 0.7rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  min-width: 0;
}
textarea {
  resize: vertical;
}
.thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 0.5rem;
}
.thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #eee;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.add {
  aspect-ratio: 1;
  font: inherit;
  font-size: 0.9rem;
  border: 1px dashed #aaa;
  border-radius: 6px;
  background: #fff;
  color: #555;
  cursor: pointer;
}
.add:disabled {
  opacity: 0.6;
}
.paste-tip {
  margin-left: 0.5rem;
  color: #999;
}
.hint {
  margin: 0;
  font-size: 0.85rem;
  color: #888;
}
.error {
  margin: 0;
  color: #c62828;
}
.success {
  margin: 0;
  color: #2e7d32;
}
.submit {
  font: inherit;
  font-size: 1rem;
  padding: 0.8rem;
  border: 0;
  border-radius: 6px;
  background: #06c755;
  color: #fff;
}
.submit:disabled {
  opacity: 0.6;
}
</style>
