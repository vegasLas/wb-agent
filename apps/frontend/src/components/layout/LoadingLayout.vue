<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- Header Skeleton - matches AppHeader structure -->

    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="container mx-auto px-4 py-4">
        <div class="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <!-- Left: Navigation -->
          <div class="flex gap-2">
            <Skeleton class="h-9 w-32" />
            <Skeleton class="h-9 w-9" />
          </div>

          <!-- Center: Spacer -->
          <div></div>

          <!-- Right: Actions -->
          <div class="flex gap-2">
            <Skeleton class="h-9 w-9" />
            <Skeleton class="h-9 w-9" />
            <Skeleton class="h-9 w-24" />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="container mx-auto px-4 py-6">
      <!-- Content Skeleton -->
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
