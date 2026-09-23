<script setup>
import { ref, onMounted } from 'vue'
import { callApi } from './services/api'

const user = ref(null)
const error = ref('')

onMounted(async () => {
  try {
    user.value = await callApi('ping')
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <main>
    <h1>值班問題登打</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="user">驗證成功：{{ user.name }}（{{ user.userId }}）</p>
    <p v-else>驗證中…</p>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Noto Sans TC", sans-serif;
}
main {
  padding: 1.25rem;
}
.error {
  color: #c62828;
}
</style>
