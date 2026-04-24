<template>
  <div class="space-y-4">
    <!-- Header -->
    <Skeleton width="10rem" height="1.125rem" border-radius="0.5rem" />

    <!-- Table -->
    <div class="p-4 bg-deep-card rounded-lg space-y-3">
      <SkeletonTable :columns="6" :rows="5" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import { SkeletonTable } from './base';
</script>
