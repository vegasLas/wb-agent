<script setup lang="ts">
import { ref } from 'vue';

const message = ref('Autobooking Main - To be implemented in Plan 07');
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Autobooking</h1>
    <p class="text-gray-600">{{ message }}</p>
  </div>
</template>
