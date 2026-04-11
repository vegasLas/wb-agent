<template>
  <div class="space-y-4">
    <div class="flex flex-col items-center justify-center py-16">
      <Skeleton
        shape="circle"
        size="4rem"
        class="mb-4"
      />
      <Skeleton
        width="8rem"
        height="1.5rem"
        class="mb-2"
      />
      <Skeleton
        width="6rem"
        height="1rem"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
