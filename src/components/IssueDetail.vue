<script setup>
import { ref, onMounted } from 'vue'
import { callApi } from '../services/api'

const props = defineProps({
  issueId: { type: Number, required: true }
})
const emit = defineEmits(['back'])

const issue = ref(null)
const loading = ref(true)
const error = ref('')
const viewing = ref(null)   // 正在全螢幕檢視的圖片

onMounted(async () => {
  try {
    issue.value = await callApi('getIssue', { issueId: props.issueId })
  } catch (e) {
    error.value = '載入失敗：' + e.message
  } finally {
    loading.value = false
  }
})

const imgSrc = img => `data:${img.mimeType};base64,${img.data}`
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

      <div v-if="issue.images.length" class="images">
        <button
          v-for="(img, i) in issue.images"
          :key="i"
          type="button"
          class="image"
          @click="viewing = img"
        >
          <img :src="imgSrc(img)" :alt="`圖片 ${i + 1}`" />
        </button>
      </div>

      <p class="time">
        #{{ issue.issueId }}，登打於 {{ issue.createTime }}<span v-if="issue.updateTime">，更新於 {{ issue.updateTime }}</span>
      </p>
    </template>

    <!-- 點圖片放大檢視，再點一下關閉 -->
    <div v-if="viewing" class="viewer" @click="viewing = null">
      <img :src="imgSrc(viewing)" alt="" />
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
