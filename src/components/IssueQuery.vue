<script setup>
import { reactive, ref } from 'vue'
import { callApi } from '../services/api'
import { CATEGORIES } from '../constants'

const filter = reactive({
  keyword: '',
  dateFrom: '',
  dateTo: '',
  category: ''
})

const items = ref([])
const total = ref(0)
const loading = ref(false)
const searched = ref(false)
const error = ref('')
const openId = ref(null)   // 目前展開的那一筆

async function search() {
  error.value = ''
  if (filter.dateFrom && filter.dateTo && filter.dateFrom > filter.dateTo) {
    error.value = '起始日期不可晚於結束日期'
    return
  }

  loading.value = true
  try {
    const result = await callApi('queryIssues', { filter: { ...filter } })
    items.value = result.items
    total.value = result.total
    openId.value = null
    searched.value = true
  } catch (e) {
    error.value = '查詢失敗：' + e.message
  } finally {
    loading.value = false
  }
}

function clearFilter() {
  Object.assign(filter, { keyword: '', dateFrom: '', dateTo: '', category: '' })
}

function toggle(id) {
  openId.value = openId.value === id ? null : id
}
</script>

<template>
  <section class="issue-query">
    <form class="filters" @submit.prevent="search">
      <label class="field">
        <span>關鍵字</span>
        <input type="search" v-model="filter.keyword" placeholder="例如：印表機 3樓（多個字用空白分隔）" />
      </label>

      <div class="row">
        <label class="field">
          <span>日期起</span>
          <input type="date" v-model="filter.dateFrom" />
        </label>
        <label class="field">
          <span>日期迄</span>
          <input type="date" v-model="filter.dateTo" />
        </label>
      </div>

      <label class="field">
        <span>類別</span>
        <select v-model="filter.category">
          <option value="">全部</option>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>

      <div class="actions">
        <button type="button" class="secondary" @click="clearFilter">清除條件</button>
        <button type="submit" class="primary" :disabled="loading">{{ loading ? '查詢中…' : '查詢' }}</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <p v-if="!searched && !error" class="empty">輸入條件後按「查詢」。不填任何條件會列出最近的紀錄。</p>

    <template v-if="searched && !error">
      <p class="summary">
        共 {{ total }} 筆<span v-if="total > items.length">，顯示最近 {{ items.length }} 筆，可加上關鍵字或日期縮小範圍</span>
      </p>

      <p v-if="items.length === 0" class="empty">找不到符合的紀錄。可以換個關鍵字或放寬條件再查一次。</p>

      <ul class="list">
        <li v-for="it in items" :key="it.issueId" :class="['item', { open: openId === it.issueId }]">
          <button type="button" class="item-head" @click="toggle(it.issueId)">
            <span class="meta">
              {{ it.dutyDate }}　{{ it.category }}　{{ it.reporterName }}
            </span>
            <span class="title">{{ it.title }}</span>
          </button>

          <div v-if="openId === it.issueId" class="item-body">
            <p class="content">{{ it.content || '（未填寫內容）' }}</p>
            <p class="time">
              #{{ it.issueId }}，登打於 {{ it.createTime }}<span v-if="it.updateTime">，更新於 {{ it.updateTime }}</span>
            </p>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.row {
  display: flex;
  gap: 0.75rem;
}
.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}
.field > span {
  font-size: 0.9rem;
  color: #555;
}
input[type="search"],
input[type="date"],
select {
  font: inherit;
  font-size: 1rem;           /* 16px 以上，iOS 才不會自動放大畫面 */
  padding: 0.55rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  min-width: 0;
}
.actions {
  display: flex;
  gap: 0.75rem;
}
.actions button {
  font: inherit;
  font-size: 1rem;
  padding: 0.7rem;
  border-radius: 6px;
  cursor: pointer;
}
.primary {
  flex: 2;
  border: 0;
  background: #06c755;
  color: #fff;
}
.primary:disabled {
  opacity: 0.6;
}
.secondary {
  flex: 1;
  border: 1px solid #ccc;
  background: #fff;
  color: #444;
}
.error {
  color: #c62828;
}
.summary {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 0.5rem;
}
.empty {
  color: #666;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid #ddd;
}
.item {
  border-bottom: 1px solid #ddd;
}
.item-head {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: left;
  font: inherit;
  background: none;
  border: 0;
  padding: 0.8rem 0.1rem;
  cursor: pointer;
  color: inherit;
}
.meta {
  font-size: 0.85rem;
  color: #777;
}
.title {
  font-size: 1rem;
}
.item.open .title {
  font-weight: 600;
}
.item-body {
  padding: 0 0.1rem 1rem;
}
.content {
  white-space: pre-wrap;
  margin: 0 0 0.75rem;
  line-height: 1.6;
}
.time {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
}
</style>
