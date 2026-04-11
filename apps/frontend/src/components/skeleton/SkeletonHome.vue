<template>
  <div class="space-y-4">
    <!-- UserAlerts placeholder -->
    <Skeleton height="3rem" border-radius="0.25rem" />

    <!-- Welcome Section -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="flex items-center gap-4">
        <Skeleton shape="circle" size="3rem" />
        <div class="space-y-2">
          <Skeleton width="8rem" height="1.25rem" border-radius="0.25rem" />
          <Skeleton width="12rem" height="0.875rem" border-radius="0.25rem" />
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-3">
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
        <Skeleton width="3rem" height="2rem" border-radius="0.25rem" class="mx-auto mb-2" />
        <Skeleton width="5rem" height="0.875rem" border-radius="0.25rem" class="mx-auto" />
      </div>
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
        <Skeleton width="3rem" height="2rem" border-radius="0.25rem" class="mx-auto mb-2" />
        <Skeleton width="5rem" height="0.875rem" border-radius="0.25rem" class="mx-auto" />
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <Skeleton width="8rem" height="1.25rem" border-radius="0.25rem" class="mb-4" />
      <div class="grid grid-cols-2 gap-3">
        <Skeleton height="2.5rem" border-radius="0.25rem" />
        <Skeleton height="2.5rem" border-radius="0.25rem" />
        <Skeleton height="2.5rem" border-radius="0.25rem" />
        <Skeleton height="2.5rem" border-radius="0.25rem" />
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <Skeleton width="8rem" height="1.25rem" border-radius="0.25rem" class="mb-4" />
      <div class="space-y-3">
        <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Skeleton shape="circle" size="1.5rem" />
          <div class="flex-1 space-y-1">
            <Skeleton width="60%" height="0.875rem" border-radius="0.25rem" />
            <Skeleton width="40%" height="0.75rem" border-radius="0.25rem" />
          </div>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Skeleton shape="circle" size="1.5rem" />
          <div class="flex-1 space-y-1">
            <Skeleton width="50%" height="0.875rem" border-radius="0.25rem" />
            <Skeleton width="30%" height="0.75rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
