<template>
  <div
    class="min-h-screen bg-deep-bg flex flex-col lg:flex-row"
  >
    <!-- Main Content Area -->
    <main
      class="flex-1 container mx-auto px-4 py-6 lg:mx-0 lg:max-w-none lg:px-8 lg:py-6 overflow-y-auto relative pb-6"
    >
      <!-- Top Bar Skeleton (matches MainLayout) -->
      <div class="flex items-center justify-between mb-4 lg:hidden">
        <!-- Burger + Supplier Name Skeleton (Left) -->
        <div class="flex items-center gap-2">
          <Skeleton
            width="2.5rem"
            height="2.5rem"
            border-radius="0.375rem"
          />
          <Skeleton
            width="6rem"
            height="2.5rem"
            border-radius="0.375rem"
          />
        </div>

        <!-- Theme + Plus Button Skeleton (Right) -->
        <div class="flex items-center gap-2">
          <Skeleton
            width="2.5rem"
            height="2.5rem"
            border-radius="0.375rem"
          />
          <Skeleton
            width="2.5rem"
            height="2.5rem"
            border-radius="0.375rem"
          />
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
