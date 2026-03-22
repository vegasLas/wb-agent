<template>
  <main class="container mx-auto px-4 py-6">
    <!-- Header Skeleton -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <!-- Navigation Dropdown Skeleton -->
        <div class="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <!-- Help Button Skeleton -->
        <div class="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div class="flex items-center gap-2">
        <!-- Store Button Skeleton -->
        <div class="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <!-- Account Management Button Skeleton -->
        <div class="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <!-- User Profile Button Skeleton -->
        <div class="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>

    <SkeletonTriggers v-if="view === 'triggers-main'" />
    <SkeletonAccount v-if="view === 'account'" />
    <SkeletonStore v-if="view === 'store'" />
    <SkeletonAutobookings v-if="view === 'autobookings-main'" />
    <SkeletonReport v-if="view === 'report'" />
  </main>
</template>

<script setup lang="ts">
import type { ViewType } from '../../types';
import SkeletonTriggers from './SkeletonTriggers.vue';
import SkeletonAccount from './SkeletonAccount.vue';
import SkeletonStore from './SkeletonStore.vue';
import SkeletonAutobookings from './SkeletonAutobookings.vue';
import SkeletonReport from './SkeletonReport.vue';

defineProps<{
  view: ViewType;
}>();
</script>
