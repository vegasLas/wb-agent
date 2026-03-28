<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- Header Skeleton - matches AppHeader structure -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <!-- Left: Navigation -->
          <div class="flex items-center gap-2">
            <!-- Navigation Dropdown Skeleton: h-9 w-32 -->
            <Skeleton class="h-9 w-32" />
            <!-- Help Button Skeleton: h-9 w-9 -->
            <Skeleton class="h-9 w-9" />
          </div>
          <!-- Right: Actions -->
          <div class="flex items-center gap-2">
            <!-- Store Button Skeleton: h-9 w-9 -->
            <Skeleton class="h-9 w-9" />
            <!-- Account Management Button Skeleton: h-9 w-9 -->
            <Skeleton class="h-9 w-9" />
            <!-- User Profile Button Skeleton: h-9 w-24 -->
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
