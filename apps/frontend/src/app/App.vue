<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!--
      Route-based Skeleton Loading
      - Shown during: router guard initialization (Telegram + user data)
      - Hidden when: view component signals ready via useViewReady()
    -->
    <LoadingLayout v-if="showSkeleton">
      <component :is="currentRouteSkeleton" />
    </LoadingLayout>

    <!-- Main Router View - mounted but hidden while skeleton is shown -->
    <div v-show="!showSkeleton">
      <RouterView />
    </div>

    <!-- Global Components -->
    <Toast position="top-right" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import LoadingLayout from '../components/layout/LoadingLayout.vue';
import { useSkeleton } from '../composables/useSkeleton';
import {
  SkeletonAccount,
  SkeletonAutobookings,
  SkeletonStore,
  SkeletonTriggers,
  SkeletonReport,
  SkeletonPayments,
  SkeletonReschedules,
} from '../components/skeleton';

const router = useRouter();
const route = useRoute();

// Use skeleton composable for loading state management
const {
  showSkeleton,
  markRouterReady,
  onNavigationStart,
  onNavigationEnd,
  getEffectiveRouteName,
} = useSkeleton();

// Map route names to skeleton components
const routeSkeletonMap: Record<string, any> = {
  Account: SkeletonAccount,
  Autobooking: SkeletonAutobookings,
  AutobookingList: SkeletonAutobookings,
  AutobookingCreate: SkeletonAutobookings,
  AutobookingUpdate: SkeletonAutobookings,
  Reschedules: SkeletonReschedules,
  ReschedulesList: SkeletonReschedules,
  ReschedulesCreate: SkeletonReschedules,
  ReschedulesUpdate: SkeletonReschedules,
  Triggers: SkeletonTriggers,
  TriggersList: SkeletonTriggers,
  TriggerCreate: SkeletonTriggers,
  Reports: SkeletonReport,
  Store: SkeletonStore,
  StoreSubscription: SkeletonStore,
  StoreBookings: SkeletonStore,
  Payments: SkeletonPayments,
  default: SkeletonAccount,
};

// Get the appropriate skeleton for current route
// Uses getEffectiveRouteName which falls back to path-based detection when route name is null/undefined
const currentRouteSkeleton = computed(() => {
  const routeName = getEffectiveRouteName(route.name as string);
  return routeSkeletonMap[routeName] || routeSkeletonMap.default;
});

// Setup router hooks to handle navigation loading state
router.beforeEach(() => {
  onNavigationStart();
});

router.afterEach(() => {
  onNavigationEnd();
});

// Wait for router to resolve initial navigation
onMounted(async () => {
  await router.isReady();
  markRouterReady();
  // View remains in loading state until component calls viewReady()
});
</script>

<style>
body {
  @apply bg-white dark:bg-[#171819];
}
</style>
