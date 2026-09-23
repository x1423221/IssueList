<script setup>
import liff from '@line/liff'
import IssueForm from './components/IssueForm.vue'

// 直接從 ID Token 解出名稱，不必再呼叫一次後端
const userName = liff.getDecodedIDToken()?.name || ''
</script>

<template>
  <main>
    <header>
      <h1>值班問題登打</h1>
      <p v-if="userName" class="user">{{ userName }}</p>
    </header>
    <IssueForm />
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Noto Sans TC", sans-serif;
  background: #f7f7f7;
}
main {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.25rem;
}
header {
  margin-bottom: 1.25rem;
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
</style>
