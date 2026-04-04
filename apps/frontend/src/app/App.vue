<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!--
      Route-based Skeleton Loading
      - Shown during: router guard initialization (Telegram + user data)
      - Hidden when: view component signals ready via useViewReady()
    -->
    <!--
      Full-screen skeleton only during initial app initialization.
      After that, MainLayout handles content-area skeleton so the header remains visible.
    -->
    <LoadingLayout v-if="isRouterInitializing">
      <component :is="currentRouteSkeleton" />
    </LoadingLayout>

    <!-- Main Router View - always mounted -->
    <RouterView />

    <!-- Global Components -->
    <Toast position="top-right" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, provide } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useColorMode } from '@vueuse/core';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import LoadingLayout from '../components/layout/LoadingLayout.vue';
import { useSkeleton } from '../composables/useSkeleton';
import { useTelegram } from '../composables/useTelegram';
import {
  SkeletonAccount,
  SkeletonAutobookings,
  SkeletonStore,
  SkeletonTriggers,
  SkeletonReport,
  SkeletonPayments,
  SkeletonReschedules,
  SkeletonPromotions,
} from '../components/skeleton';

// Initialize color mode with proper configuration for class-based dark mode
const colorMode = useColorMode({
  attribute: 'class',
  selector: 'html',
});

// Watch Telegram's color scheme and apply it
const { colorScheme: telegramColorScheme } = useTelegram();
watch(
  telegramColorScheme,
  (newScheme) => {
    if (newScheme) {
      colorMode.value = newScheme;
    }
  },
  { immediate: true },
);

const router = useRouter();
const route = useRoute();

// Use skeleton composable for loading state management
const {
  showSkeleton,
  isRouterInitializing,
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
  Promotions: SkeletonPromotions,
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

// Provide the skeleton component so MainLayout can render it in the content area
provide('currentRouteSkeleton', currentRouteSkeleton);

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
