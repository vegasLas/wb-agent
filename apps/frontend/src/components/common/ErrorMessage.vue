<template>
  <div
    class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
  >
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>
