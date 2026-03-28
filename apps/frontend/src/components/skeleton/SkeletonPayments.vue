<template>
  <!-- Header Skeleton -->
  <div class="mb-6">
    <Skeleton width="200px" height="2rem" borderRadius="0.25rem" class="mb-2" />
    <Skeleton width="60%" height="1rem" borderRadius="0.25rem" />
  </div>

  <!-- Tabs Skeleton -->
  <div class="mb-6">
    <div class="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
      <Skeleton width="100px" height="2rem" borderRadius="0.25rem" />
      <Skeleton width="100px" height="2rem" borderRadius="0.25rem" />
    </div>
  </div>

  <!-- Card Skeleton -->
  <Skeleton class="mb-6" width="100%" height="300px" borderRadius="0.5rem" />
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
