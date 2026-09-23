<script setup>
import { reactive, ref, onMounted } from 'vue'
import { callApi } from '../services/api'
import { CATEGORIES, STATUSES, shiftLabel, statusLabel, formatDate, daysAgo } from '../constants'

const filter = reactive({
  dateFrom: daysAgo(30),
  dateTo: formatDate(new Date()),
  status: '',
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

function toggle(id) {
  openId.value = openId.value === id ? null : id
}

onMounted(search)
</script>

<template>
  <section class="issue-query">
    <form class="filters" @submit.prevent="search">
      <div class="row">
        <label class="field">
          <span>起</span>
          <input type="date" v-model="filter.dateFrom" />
        </label>
        <label class="field">
          <span>迄</span>
          <input type="date" v-model="filter.dateTo" />
        </label>
      </div>
      <div class="row">
        <label class="field">
          <span>狀態</span>
          <select v-model="filter.status">
            <option value="">全部</option>
            <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
        <label class="field">
          <span>類別</span>
          <select v-model="filter.category">
            <option value="">全部</option>
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
      </div>
      <button type="submit" :disabled="loading">{{ loading ? '查詢中…' : '查詢' }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="searched && !error">
      <p class="summary">
        共 {{ total }} 筆<span v-if="total > items.length">，顯示最近 {{ items.length }} 筆，可縮小日期範圍查看其他資料</span>
      </p>

      <p v-if="items.length === 0" class="empty">這段期間沒有你登打的問題。可以放寬日期或條件再查一次。</p>

      <ul class="list">
        <li v-for="it in items" :key="it.issueId" :class="['item', { open: openId === it.issueId }]">
          <button type="button" class="item-head" @click="toggle(it.issueId)">
            <span class="meta">
              #{{ it.issueId }}　{{ it.dutyDate }} {{ shiftLabel(it.shift) }}　{{ it.category }}
            </span>
            <span :class="['status', 's-' + it.status]">{{ statusLabel(it.status) }}</span>
            <span class="title">{{ it.title }}</span>
          </button>

          <div v-if="openId === it.issueId" class="item-body">
            <p class="content">{{ it.content || '（未填寫內容）' }}</p>
            <div v-if="it.resolution" class="resolution">
              <span>處理結果</span>
              <p>{{ it.resolution }}</p>
            </div>
            <p class="time">
              登打於 {{ it.createTime }}<span v-if="it.updateTime">，更新於 {{ it.updateTime }}</span>
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
  margin-bottom: 1rem;
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
input[type="date"],
select {
  font: inherit;
  font-size: 1rem;
  padding: 0.55rem 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  min-width: 0;
}
.filters > button {
  font: inherit;
  font-size: 1rem;
  padding: 0.7rem;
  border: 0;
  border-radius: 6px;
  background: #06c755;
  color: #fff;
}
.filters > button:disabled {
  opacity: 0.6;
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
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem 0.75rem;
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
  grid-column: 1 / -1;
  font-size: 1rem;
}
.item.open .title {
  font-weight: 600;
}
.status {
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  align-self: start;
}
.s-O { background: #fff3e0; color: #b45309; }
.s-P { background: #e3f2fd; color: #1565c0; }
.s-C { background: #e8f5e9; color: #2e7d32; }
.item-body {
  padding: 0 0.1rem 1rem;
}
.content {
  white-space: pre-wrap;
  margin: 0 0 0.75rem;
  line-height: 1.6;
}
.resolution {
  border-left: 3px solid #06c755;
  padding-left: 0.75rem;
  margin-bottom: 0.75rem;
}
.resolution span {
  font-size: 0.85rem;
  color: #555;
}
.resolution p {
  white-space: pre-wrap;
  margin: 0.25rem 0 0;
  line-height: 1.6;
}
.time {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
}
</style>
