<template>
  <div class="space-y-4">
    <!-- Stats Cards -->
    <div class="grid grid-cols-2 gap-3">
      <div class="p-4 bg-deep-card rounded-lg">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Skeleton width="4rem" height="0.75rem" border-radius="0.5rem" />
            <Skeleton width="3rem" height="1.5rem" border-radius="0.5rem" />
          </div>
          <Skeleton width="2rem" height="2rem" border-radius="50%" />
        </div>
      </div>
      <div class="p-4 bg-deep-card rounded-lg">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Skeleton width="4rem" height="0.75rem" border-radius="0.5rem" />
            <Skeleton width="3rem" height="1.5rem" border-radius="0.5rem" />
          </div>
          <Skeleton width="2rem" height="2rem" border-radius="50%" />
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="p-4 bg-deep-card rounded-lg space-y-3">
      <SkeletonTable :columns="7" :rows="4" />
    </div>

    <!-- Paginator -->
    <div class="flex justify-center gap-2">
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import { SkeletonTable } from './base';
</script>
