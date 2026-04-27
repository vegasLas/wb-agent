<template>
  <div
    class="min-h-screen bg-deep-bg text-theme flex flex-col lg:flex-row"
  >
    <!-- Desktop Sidebar Skeleton -->
    <aside
      class="hidden lg:flex w-[260px] h-screen sticky top-0 shrink-0 bg-card border-r border-deep-border flex-col"
    >
      <!-- Brand -->
      <div class="h-16 flex items-center gap-3 px-5 border-b border-deep-border">
        <AppLogo :size="32" />
        <div class="space-y-1.5">
          <Skeleton width="3.5rem" height="0.875rem" border-radius="0.5rem" />
          <Skeleton width="5rem" height="0.625rem" border-radius="0.5rem" />
        </div>
      </div>

      <!-- Primary Navigation Skeleton -->
      <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <nav class="space-y-1.5">
          <div
            v-for="i in 11"
            :key="`nav-primary-${i}`"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          >
            <Skeleton width="1.25rem" height="1.25rem" border-radius="50%" />
            <Skeleton :width="`${50 + (i % 3) * 15}%`" height="0.875rem" border-radius="0.5rem" />
          </div>
        </nav>

        <!-- Divider -->
        <div class="border-t border-deep-border" />

        <!-- Secondary Navigation Skeleton -->
        <nav class="space-y-1.5">
          <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <Skeleton width="1.25rem" height="1.25rem" border-radius="50%" />
            <Skeleton width="40%" height="0.875rem" border-radius="0.5rem" />
          </div>
        </nav>
      </div>

      <!-- Bottom Actions Skeleton -->
      <div class="px-3 py-4 border-t border-deep-border">
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <Skeleton width="1.25rem" height="1.25rem" border-radius="50%" />
          <Skeleton width="50%" height="0.875rem" border-radius="0.5rem" />
          <Skeleton width="0.75rem" height="0.75rem" border-radius="50%" class="ml-auto" />
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main
      class="flex-1 px-4 py-6 lg:px-8 lg:py-6 relative min-h-screen"
    >
      <!-- Top Bar Skeleton (matches MainLayout) -->
      <div class="flex items-center justify-between lg:hidden sticky top-0 z-30 bg-deep-bg py-4 -mx-4 px-4 mb-4">
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
import AppLogo from './AppLogo.vue';
import Skeleton from 'primevue/skeleton';
</script>
