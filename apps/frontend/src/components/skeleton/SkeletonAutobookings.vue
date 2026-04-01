<template>
  <!-- Summary Skeleton -->
  <div class="grid grid-cols-3 gap-4">
    <Skeleton
      width="100%"
      height="2.25rem"
      border-radius="0.25rem"
    />
    <Skeleton
      width="100%"
      height="2.25rem"
      border-radius="0.25rem"
    />
    <Skeleton
      width="100%"
      height="2.25rem"
      border-radius="0.25rem"
    />
  </div>

  <!-- Search Bar Skeleton -->
  <Skeleton
    class="mt-4"
    width="100%"
    height="2.5rem"
    border-radius="0.25rem"
  />

  <div class="flex justify-between">
    <Skeleton
      class="mt-4"
      width="66.666%"
      height="2.5rem"
      border-radius="0.25rem"
    />
    <Skeleton
      class="mt-4"
      width="109px"
      height="2.5rem"
      border-radius="0.25rem"
    />
  </div>

  <!-- Card Skeleton -->
  <Skeleton
    class="mt-6"
    width="100%"
    height="400px"
    border-radius="0.5rem"
  />
  <Skeleton
    class="mt-6"
    width="100%"
    height="400px"
    border-radius="0.5rem"
  />
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
