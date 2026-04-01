<template>
  <!-- Subscription Status Skeleton -->
  <div class="flex items-center justify-between gap-4">
    <Skeleton
      width="8rem"
      height="1.5rem"
      border-radius="0.25rem"
    />
    <div class="flex items-center gap-2">
      <Skeleton
        width="4rem"
        height="2rem"
        border-radius="0.25rem"
      />
      <Skeleton
        width="4rem"
        height="2rem"
        border-radius="0.25rem"
      />
    </div>
  </div>

  <Skeleton
    class="mt-4"
    width="100%"
    height="229px"
    border-radius="0.5rem"
  />
  <Skeleton
    class="mt-4"
    width="100%"
    height="229px"
    border-radius="0.5rem"
  />
  <Skeleton
    class="mt-4"
    width="100%"
    height="229px"
    border-radius="0.5rem"
  />
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
