<script setup lang="ts">
import { ref } from 'vue';

const message = ref('Report Main - To be implemented in Plan 10');
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Reports</h1>
    <p class="text-gray-600">{{ message }}</p>
  </div>
</template>
