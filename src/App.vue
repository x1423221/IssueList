<script setup>
import { ref } from 'vue'
import liff from '@line/liff'
import IssueForm from './components/IssueForm.vue'
import IssueQuery from './components/IssueQuery.vue'

// 直接從 ID Token 解出名稱，不必再呼叫一次後端
const userName = liff.getDecodedIDToken()?.name || ''

const TABS = [
  { key: 'form', label: '登打' },
  { key: 'query', label: '查詢' }
]
const tab = ref('form')
</script>

<template>
  <main>
    <header>
      <h1>值班問題</h1>
      <p v-if="userName" class="user">{{ userName }}</p>
    </header>

    <nav class="tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        :class="{ active: tab === t.key }"
        @click="tab = t.key"
      >{{ t.label }}</button>
    </nav>

    <!-- v-show 保留兩邊的狀態：切換分頁時，登打到一半的內容不會消失 -->
    <IssueForm v-show="tab === 'form'" />
    <IssueQuery v-if="tab === 'query'" />
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Noto Sans TC", sans-serif;
  background: #f7f7f7;
  color: #222;
}
main {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.25rem;
}
header {
  margin-bottom: 1rem;
}
h1 {
  font-size: 1.4rem;
  margin: 0;
}
.user {
  margin: 0.25rem 0 0;
  color: #666;
  font-size: 0.9rem;
}
.tabs {
  display: flex;
  gap: 1.5rem;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1.25rem;
}
.tabs button {
  font: inherit;
  font-size: 1rem;
  background: none;
  border: 0;
  border-bottom: 3px solid transparent;
  padding: 0.5rem 0.1rem;
  margin-bottom: -1px;
  color: #777;
  cursor: pointer;
}
.tabs button.active {
  color: #222;
  border-bottom-color: #06c755;
  font-weight: 600;
}
</style>
