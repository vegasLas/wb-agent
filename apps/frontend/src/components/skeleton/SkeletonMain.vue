<template>
  <main class="container mx-auto px-4 py-6">
    <!-- Header Skeleton -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <!-- Navigation Dropdown Skeleton -->
        <Skeleton width="8rem" height="2.25rem" border-radius="0.25rem" />
        <!-- Help Button Skeleton -->
        <Skeleton width="2.25rem" height="2.25rem" border-radius="0.25rem" />
      </div>
      <div class="flex items-center gap-2">
        <!-- Store Button Skeleton -->
        <Skeleton width="2.25rem" height="2.25rem" border-radius="0.25rem" />
        <!-- Account Management Button Skeleton -->
        <Skeleton width="2.25rem" height="2.25rem" border-radius="0.25rem" />
        <!-- User Profile Button Skeleton -->
        <Skeleton width="6rem" height="2.25rem" border-radius="0.25rem" />
      </div>
    </div>

    <SkeletonTriggers v-if="view === 'triggers-main'" />
    <!-- <SkeletonWarehouses v-if="view === 'warehouses'" /> -->
    <SkeletonAccount v-if="view === 'account'" />
    <SkeletonStore v-if="view === 'store'" />
    <SkeletonAutobookings v-if="view === 'autobookings-main'" />
    <SkeletonReport v-if="view === 'report'" />
    <SkeletonPayments v-if="view === 'payments'" />
    <SkeletonReschedules v-if="view === 'reschedules'" />
  </main>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import SkeletonTriggers from './SkeletonTriggers.vue';
import SkeletonAccount from './SkeletonAccount.vue';
import SkeletonStore from './SkeletonStore.vue';
import SkeletonAutobookings from './SkeletonAutobookings.vue';
import SkeletonReport from './SkeletonReport.vue';
import SkeletonPayments from './SkeletonPayments.vue';
import SkeletonReschedules from './SkeletonReschedules.vue';

defineProps<{
  view: ViewType;
}>();
</script>
