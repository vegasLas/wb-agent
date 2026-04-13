<template>
  <div class="flex flex-col items-center justify-center py-12 text-gray-400">
    <i :class="['text-4xl mb-3', icon]" />
    <p class="text-sm">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  message: string;
}>();
</script>
