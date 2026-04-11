<template>
  <div
    class="min-h-screen bg-deep-bg flex flex-col lg:flex-row"
  >
    <!-- Main Content Area -->
    <main
      class="flex-1 container mx-auto px-4 py-6 lg:mx-0 lg:max-w-none lg:px-8 lg:py-6 overflow-y-auto relative pb-24"
    >
      <!-- Top Bar Skeleton (matches MainLayout) -->
      <div class="flex items-center justify-between mb-4 lg:hidden">
        <!-- Account Button Skeleton (Left) -->
        <Skeleton width="2.5rem" height="2.5rem" border-radius="0.375rem" />

        <!-- Plus Button Skeleton (Right) -->
        <Skeleton width="2.5rem" height="2.5rem" border-radius="0.375rem" />
      </div>

      <!-- Content Skeleton -->
      <slot />
    </main>

    <!-- Bottom Navigation Skeleton (Mobile) -->
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
      <div
        class="bg-deep-card border border-deep-border rounded-full px-4 py-2 shadow-lg"
      >
        <div class="flex items-center gap-2">
          <Skeleton width="3rem" height="2.5rem" border-radius="0.5rem" />
          <Skeleton width="3rem" height="2.5rem" border-radius="0.5rem" />
          <Skeleton width="3rem" height="2.5rem" border-radius="0.5rem" />
          <Skeleton width="3rem" height="2.5rem" border-radius="0.5rem" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
