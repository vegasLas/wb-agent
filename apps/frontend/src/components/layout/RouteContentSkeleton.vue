<template>
  <div class="space-y-6">
    <!-- Stats Row -->
    <div
      v-if="showStats"
      class="grid grid-cols-3 gap-4"
    >
      <Skeleton
        v-for="i in 3"
        :key="i"
        height="4rem"
        border-radius="0.5rem"
      />
    </div>

    <!-- Search and Actions Row -->
    <div class="flex justify-between items-center gap-4">
      <Skeleton
        height="2.5rem"
        border-radius="0.25rem"
        class="flex-1"
      />
      <Skeleton
        width="6rem"
        height="2.5rem"
        border-radius="0.25rem"
      />
    </div>

    <!-- Content Cards -->
    <div class="space-y-4">
      <Skeleton
        v-for="i in skeletonCount"
        :key="i"
        height="8rem"
        border-radius="0.5rem"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Skeleton from 'primevue/skeleton';

const route = useRoute();

const routeConfig: Record<
  string,
  { showStats: boolean; skeletonCount: number }
> = {
  Autobooking: { showStats: true, skeletonCount: 3 },
  AutobookingList: { showStats: true, skeletonCount: 3 },
  Triggers: { showStats: false, skeletonCount: 4 },
  TriggersList: { showStats: false, skeletonCount: 4 },
  Reschedules: { showStats: true, skeletonCount: 3 },
  ReschedulesList: { showStats: true, skeletonCount: 3 },
  Reports: { showStats: false, skeletonCount: 2 },
  Account: { showStats: false, skeletonCount: 2 },
  Store: { showStats: false, skeletonCount: 2 },
};

const config = computed(() => {
  const routeName = route.name as string;
  return routeConfig[routeName] || { showStats: false, skeletonCount: 2 };
});

const showStats = computed(() => config.value.showStats);
const skeletonCount = computed(() => config.value.skeletonCount);
</script>
