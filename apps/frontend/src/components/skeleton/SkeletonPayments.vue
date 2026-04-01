<template>
  <!-- Alert Message Skeleton -->
  <Skeleton
    class="mb-6"
    width="100%"
    height="5rem"
    border-radius="0.5rem"
  />

  <!-- Tariffs Grid Skeleton -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Tariff Card 1 -->
    <div class="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div class="flex items-center justify-between">
        <Skeleton
          width="6rem"
          height="1.5rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="3rem"
          height="1.25rem"
          border-radius="0.25rem"
        />
      </div>
      <div class="flex items-center gap-2">
        <Skeleton
          width="5rem"
          height="2rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="4rem"
          height="1rem"
          border-radius="0.25rem"
        />
      </div>
      <Skeleton
        width="100%"
        height="2.5rem"
        border-radius="0.25rem"
      />
    </div>

    <!-- Tariff Card 2 -->
    <div class="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div class="flex items-center justify-between">
        <Skeleton
          width="6rem"
          height="1.5rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="3rem"
          height="1.25rem"
          border-radius="0.25rem"
        />
      </div>
      <div class="flex items-center gap-2">
        <Skeleton
          width="5rem"
          height="2rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="4rem"
          height="1rem"
          border-radius="0.25rem"
        />
      </div>
      <Skeleton
        width="100%"
        height="2.5rem"
        border-radius="0.25rem"
      />
    </div>

    <!-- Tariff Card 3 -->
    <div class="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div class="flex items-center justify-between">
        <Skeleton
          width="6rem"
          height="1.5rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="3rem"
          height="1.25rem"
          border-radius="0.25rem"
        />
      </div>
      <div class="flex items-center gap-2">
        <Skeleton
          width="5rem"
          height="2rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="4rem"
          height="1rem"
          border-radius="0.25rem"
        />
      </div>
      <Skeleton
        width="100%"
        height="2.5rem"
        border-radius="0.25rem"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
