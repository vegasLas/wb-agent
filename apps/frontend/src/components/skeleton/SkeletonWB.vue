<template>
  <div class="space-y-4">
    <!-- Top Navigation Buttons -->
    <div class="flex gap-3">
      <Skeleton
        height="2.5rem"
        class="flex-1"
      />
      <Skeleton
        height="2.5rem"
        class="flex-1"
      />
    </div>

    <!-- Main Content -->
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
        width="12rem"
        height="1rem"
      />
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4 max-w-sm mx-auto">
      <div class="p-4 border rounded-lg bg-white dark:bg-gray-800 text-center">
        <Skeleton
          width="3rem"
          height="2rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="6rem"
          height="0.875rem"
          class="mx-auto"
        />
      </div>
      <div class="p-4 border rounded-lg bg-white dark:bg-gray-800 text-center">
        <Skeleton
          width="3rem"
          height="2rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="5rem"
          height="0.875rem"
          class="mx-auto"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
