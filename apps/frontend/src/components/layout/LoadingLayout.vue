<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <main class="container mx-auto px-4 py-6">
      <!-- Header Skeleton -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
          <!-- Navigation Dropdown Skeleton: h-9 w-32 -->
          <Skeleton class="h-9 w-32" />
          <!-- Help Button Skeleton: h-9 w-9 -->
          <Skeleton class="h-9 w-9" />
        </div>
        <div class="flex items-center gap-2">
          <!-- Store Button Skeleton: h-9 w-9 -->
          <Skeleton class="h-9 w-9" />
          <!-- Account Management Button Skeleton: h-9 w-9 -->
          <Skeleton class="h-9 w-9" />
          <!-- User Profile Button Skeleton: h-9 w-24 -->
          <Skeleton class="h-9 w-24" />
        </div>
      </div>

      <!-- Content Skeleton -->
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
