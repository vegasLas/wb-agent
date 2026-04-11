<template>
  <div
    class="min-h-screen bg-white dark:bg-[#171819] flex flex-col lg:flex-row py-6 px-4"
  >
    <!-- Main Content Area -->
    <main
      class="flex-1 container mx-auto px-2 lg:mx-0 lg:max-w-none lg:px-8 lg:py-6 overflow-y-auto"
    >
      <!-- Content Skeleton -->
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
