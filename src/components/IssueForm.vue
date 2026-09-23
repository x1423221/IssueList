<script setup>
import { reactive, ref } from 'vue'
import { callApi } from '../services/api'
import { CATEGORIES, formatDate } from '../constants'

const form = reactive({
  dutyDate: formatDate(new Date()),
  category: CATEGORIES[0],
  title: '',
  content: ''
})
const submitting = ref(false)
const message = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  message.value = ''
  if (!form.title.trim()) {
    error.value = '請填寫標題'
    return
  }

  submitting.value = true
  try {
    const result = await callApi('createIssue', { data: { ...form } })
    message.value = `已送出，編號 ${result.issueId}`
    // 保留日期、類別，方便連續登打
    form.title = ''
    form.content = ''
  } catch (e) {
    error.value = '送出失敗：' + e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="issue-form" @submit.prevent="submit">
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

    <p class="hint">請勿輸入病歷號、病患姓名等個資。</p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="success">{{ message }}</p>

    <button type="submit" :disabled="submitting">
      {{ submitting ? '送出中…' : '送出' }}
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
button {
  font: inherit;
  font-size: 1rem;
  padding: 0.8rem;
  border: 0;
  border-radius: 6px;
  background: #06c755;
  color: #fff;
}
button:disabled {
  opacity: 0.6;
}
</style>
