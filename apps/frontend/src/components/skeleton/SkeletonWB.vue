<template>
  <div class="space-y-4">
    <!-- UserAlerts placeholder -->
    <Skeleton height="3rem" border-radius="0.25rem" />

    <!-- Top Navigation Buttons -->
    <div class="flex gap-3">
      <Skeleton height="2.5rem" border-radius="0.25rem" class="flex-1" />
      <Skeleton height="2.5rem" border-radius="0.25rem" class="flex-1" />
    </div>

    <!-- Main Content -->
    <div class="flex flex-col items-center justify-center py-16">
      <Skeleton shape="circle" size="4rem" class="mb-4" />
      <Skeleton width="8rem" height="1.5rem" border-radius="0.25rem" class="mb-2" />
      <Skeleton width="12rem" height="1rem" border-radius="0.25rem" />

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
        <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
          <Skeleton width="3rem" height="2rem" border-radius="0.25rem" class="mx-auto mb-2" />
          <Skeleton width="6rem" height="0.875rem" border-radius="0.25rem" class="mx-auto" />
        </div>
        <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
          <Skeleton width="3rem" height="2rem" border-radius="0.25rem" class="mx-auto mb-2" />
          <Skeleton width="5rem" height="0.875rem" border-radius="0.25rem" class="mx-auto" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
