<template>
  <div class="space-y-6">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="p-4 bg-deep-card rounded-lg">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Skeleton width="5rem" height="0.75rem" border-radius="0.5rem" />
            <Skeleton width="8rem" height="1.5rem" border-radius="0.5rem" />
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

    <!-- Page Header -->
    <div class="space-y-2">
      <Skeleton width="8rem" height="1.5rem" border-radius="0.5rem" />
      <Skeleton width="60%" height="0.875rem" border-radius="0.5rem" />
    </div>

    <!-- Tabs Navigation -->
    <div class="border-b border-deep-border pb-2">
      <div class="flex gap-4">
        <Skeleton width="6rem" height="2.5rem" border-radius="0.5rem" />
        <Skeleton width="6rem" height="2.5rem" border-radius="0.5rem" />
      </div>
    </div>

    <!-- Tab Content Card -->
    <div class="p-4 bg-deep-card rounded-lg space-y-4">
      <Skeleton width="45%" height="1.125rem" border-radius="0.5rem" />
      <Skeleton width="100%" height="0.875rem" border-radius="0.5rem" />
      <Skeleton width="80%" height="0.875rem" border-radius="0.5rem" />
    </div>

    <!-- Tariff Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="i in 4"
        :key="`tariff-${i}`"
        class="p-4 bg-deep-card rounded-lg space-y-4"
      >
        <div class="flex items-center justify-between">
          <Skeleton width="40%" height="1rem" border-radius="0.5rem" />
          <Skeleton width="3rem" height="1rem" border-radius="0.5rem" />
        </div>
        <div class="flex items-center gap-2">
          <Skeleton width="4rem" height="1.5rem" border-radius="0.5rem" />
          <Skeleton width="3rem" height="0.75rem" border-radius="0.5rem" />
        </div>
        <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
