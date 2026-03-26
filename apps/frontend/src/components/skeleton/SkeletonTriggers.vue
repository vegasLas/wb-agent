<template>
  <!-- Control Panel Skeleton -->

  <!-- Search Bar Skeleton -->
  <div class="flex gap-2">
    <Skeleton width="100%" height="2.25rem" borderRadius="0.25rem" />
    <Skeleton width="100%" height="2.25rem" borderRadius="0.25rem" />
    <Skeleton width="100%" height="2.25rem" borderRadius="0.25rem" />
  </div>

  <Skeleton class="mt-4" width="100%" height="2.25rem" borderRadius="0.25rem" />

  <div class="flex justify-between gap-4 mt-4">
    <Skeleton width="6rem" height="2.25rem" borderRadius="0.25rem" />
    <Skeleton width="7rem" height="2.25rem" borderRadius="0.25rem" />
  </div>

  <!-- Slot Card Skeleton -->
  <Skeleton class="mt-4" width="100%" height="300px" borderRadius="0.25rem" />
  <Skeleton class="mt-4" width="100%" height="300px" borderRadius="0.25rem" />
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
