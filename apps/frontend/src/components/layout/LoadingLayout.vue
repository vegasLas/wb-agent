<template>
  <div class="min-h-screen bg-white dark:bg-[#171819] flex flex-col lg:flex-row">
    <!-- Header Skeleton - matches AppHeader structure -->
    <header class="border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 lg:w-64 lg:flex-shrink-0 lg:h-screen lg:sticky lg:top-0">
      <!-- Mobile header skeleton -->
      <div class="container mx-auto px-4 py-4 lg:hidden">
        <div class="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <!-- Left: Navigation -->
          <div class="flex gap-2">
            <Skeleton class="h-9 w-32" />
            <Skeleton class="h-9 w-9" />
          </div>

          <!-- Center: Spacer -->
          <div />

          <!-- Right: Actions -->
          <div class="flex gap-2">
            <Skeleton class="h-9 w-9" />
            <Skeleton class="h-9 w-9" />
            <Skeleton class="h-9 w-24" />
          </div>
        </div>
      </div>

      <!-- Desktop sidebar skeleton -->
      <div class="hidden lg:flex lg:flex-col lg:h-full lg:justify-between lg:px-4 lg:py-6 lg:gap-6">
        <div class="flex flex-col gap-3">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
        <div class="flex flex-col gap-3">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 container mx-auto px-2 lg:mx-0 lg:max-w-none lg:px-8 lg:py-6 overflow-y-auto">
      <!-- Content Skeleton -->
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
