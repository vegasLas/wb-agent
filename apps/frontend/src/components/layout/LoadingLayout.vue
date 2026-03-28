<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- Header Skeleton -->
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <!-- Left side: Nav + Help -->
          <div class="flex items-center gap-2">
            <Skeleton width="8rem" height="2.25rem" border-radius="0.25rem" />
            <Skeleton width="2.25rem" height="2.25rem" border-radius="0.25rem" />
          </div>
          
          <!-- Right side: Store, Accounts, User -->
          <div class="flex items-center gap-2">
            <Skeleton width="2.25rem" height="2.25rem" border-radius="0.25rem" />
            <Skeleton width="2.25rem" height="2.25rem" border-radius="0.25rem" />
            <Skeleton width="6rem" height="2.25rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>
    </header>

    <!-- Content Skeleton -->
    <main class="container mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>
