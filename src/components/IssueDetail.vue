<script setup>
import { ref, computed, onMounted } from 'vue'
import { callApi } from '../services/api'
import { issueCache, imageCache } from '../services/cache'

const props = defineProps({
  issueId: { type: Number, required: true }
})
const emit = defineEmits(['back'])

const issue = ref(null)
const images = ref([])      // [{ id, src, error }]
const loading = ref(true)
const error = ref('')
const viewing = ref(null)   // 正在全螢幕檢視的圖片 src

// 依照順序顯示：從第 1 張開始，遇到還沒下載完成的就停下
// （下載仍是同時進行，只是後面先回來的會等前面的出現後才顯示）
const shownImages = computed(() => {
  const out = []
  for (const img of images.value) {
    if (!img.src && !img.error) break
    out.push(img)
  }
  return out
})

// 下一張等待中的圖片序號（1 起算）；全部完成時為 0
const nextPending = computed(() =>
  shownImages.value.length < images.value.length ? shownImages.value.length + 1 : 0
)

onMounted(async () => {
  try {
    let data = issueCache.get(props.issueId)
    if (!data) {
      data = await callApi('getIssue', { issueId: props.issueId })
      issueCache.set(props.issueId, data)
    }
    issue.value = data
    loading.value = false   // 文字先顯示，圖片接著各自載入
    loadImages(data.imageIds || [])
  } catch (e) {
    error.value = '載入失敗：' + e.message
    loading.value = false
  }
})

function loadImages(ids) {
  images.value = ids.map(id => ({ id, src: imageCache.get(id) || null, error: '' }))

  // 每張圖各自一個請求，同時送出，哪張先回來就先顯示哪張
  images.value.forEach((img, i) => {
    if (img.src) return
    callApi('getImage', { fileId: img.id })
      .then(res => {
        const src = `data:${res.mimeType};base64,${res.data}`
        imageCache.set(img.id, src)
        images.value[i].src = src
      })
      .catch(e => {
        images.value[i].error = e.message
      })
  })
}
</script>

<template>
  <article class="issue-detail">
    <button type="button" class="back" @click="emit('back')">‹ 返回列表</button>

    <p v-if="loading" class="muted">載入中…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="issue">
      <h2>{{ issue.title }}</h2>
      <p class="meta">{{ issue.dutyDate }}　{{ issue.category }}　{{ issue.reporterName }}</p>

      <p class="content">{{ issue.content || '（未填寫內容）' }}</p>

      <div v-if="images.length" class="images">
        <template v-for="(img, i) in shownImages" :key="img.id">
          <button v-if="img.src" type="button" class="image" @click="viewing = img.src">
            <img :src="img.src" :alt="`圖片 ${i + 1}`" />
          </button>
          <div v-else class="placeholder failed">第 {{ i + 1 }} 張圖片無法載入：{{ img.error }}</div>
        </template>
        <div v-if="nextPending" class="placeholder">
          第 {{ nextPending }} 張圖片載入中…（共 {{ images.length }} 張）
        </div>
      </div>

      <p class="time">
        #{{ issue.issueId }}，登打於 {{ issue.createTime }}<span v-if="issue.updateTime">，更新於 {{ issue.updateTime }}</span>
      </p>
    </template>

    <!-- 點圖片放大檢視，再點一下關閉 -->
    <div v-if="viewing" class="viewer" @click="viewing = null">
      <img :src="viewing" alt="" />
    </div>
  </article>
</template>

<style scoped>
.back {
  font: inherit;
  font-size: 0.95rem;
  background: none;
  border: 0;
  padding: 0.25rem 0;
  margin-bottom: 0.75rem;
  color: #06a647;
  cursor: pointer;
}
h2 {
  font-size: 1.25rem;
  margin: 0 0 0.35rem;
  line-height: 1.4;
}
.meta {
  font-size: 0.85rem;
  color: #777;
  margin: 0 0 1rem;
}
.content {
  white-space: pre-wrap;
  line-height: 1.7;
  margin: 0 0 1.25rem;
}
.images {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.image {
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}
.image img {
  width: 100%;
  display: block;
  border-radius: 6px;
}
.placeholder {
  min-height: 180px;
  border-radius: 6px;
  background: #ececec;
  color: #888;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
}
.placeholder.failed {
  min-height: 0;
  background: #fdecea;
  color: #c62828;
}
.time {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
}
.muted {
  color: #666;
}
.error {
  color: #c62828;
}
.viewer {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.viewer img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
