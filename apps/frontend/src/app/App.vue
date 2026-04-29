<template>
  <div
    id="app"
    class="min-h-screen bg-deep-bg text-theme"
    :class="{
      'telegram-phone': isPhone && hasInitData,
    }"
  >
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
    <Toast
      position="top-center"
      :pt="{
        root: { style: { maxWidth: '280px' } },
        message: { style: { width: '100%' } },
      }"
    />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, provide, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useColorMode } from '@vueuse/core';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import LoadingLayout from '../components/layout/LoadingLayout.vue';
import { useSkeleton } from '../composables/ui';
import {
  SkeletonAccount,
  SkeletonAutobookings,

  SkeletonTriggers,
  SkeletonReport,
  SkeletonPayments,
  SkeletonReschedules,
  SkeletonPromotions,
  SkeletonTasks,
  SkeletonHome,
  SkeletonWB,
  SkeletonFeedbacks,
  SkeletonMPStats,
  SkeletonChat,
  SkeletonAdverts,
  SkeletonTariffs,
} from '../components/skeleton';
import {
  getTelegramColorScheme,
  isTelegramWebApp,
  getInitData,
} from '../utils/telegram';
import { requestFullscreen, readyWebApp } from '../utils/telegram/webApp';
import type { ColorScheme } from '../utils/telegram/theme';

// Initialize color mode with proper configuration for class-based dark mode
const colorMode = useColorMode({
  attribute: 'class',
  selector: 'html',
});

// Set up Telegram color scheme if available
// This works even when telegram-web-app.js is not loaded (uses URL initData detection)
const telegramColorScheme = ref<ColorScheme | undefined>(undefined);

// Check for Telegram mode and set color scheme
// Only apply Telegram theme on init if user hasn't manually set a preference
if (isTelegramWebApp()) {
  const manualPreference = localStorage.getItem('vueuse-color-scheme');
  const hasManualPreference = manualPreference && manualPreference !== 'auto';
  if (!hasManualPreference) {
    // Get color scheme from Telegram theme params (URL hash or sessionStorage)
    telegramColorScheme.value = getTelegramColorScheme();
  }
}

// Watch Telegram's color scheme and apply it
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
  pendingRouteName,
} = useSkeleton();

// Map route names to skeleton components
const routeSkeletonMap: Record<string, any> = {
  Account: SkeletonAccount,
  Autobooking: SkeletonAutobookings,
  AutobookingList: SkeletonAutobookings,
  Reschedules: SkeletonReschedules,
  ReschedulesList: SkeletonReschedules,
  ReschedulesCreate: SkeletonReschedules,
  ReschedulesUpdate: SkeletonReschedules,
  Triggers: SkeletonTriggers,
  TriggersList: SkeletonTriggers,
  Promotions: SkeletonPromotions,
  Reports: SkeletonReport,
  Payments: SkeletonPayments,
  Tasks: SkeletonTasks,
  Home: SkeletonHome,
  WB: SkeletonWB,
  Feedbacks: SkeletonFeedbacks,
  MPStats: SkeletonMPStats,
  Chat: SkeletonChat,
  Adverts: SkeletonAdverts,
  Tariffs: SkeletonTariffs,
  RegionSales: SkeletonReport,
  default: SkeletonAccount,
};

// Get the appropriate skeleton for current route
// During navigation, uses pendingRouteName (target route) to show correct skeleton immediately
// Uses getEffectiveRouteName which falls back to path-based detection when route name is null/undefined
const currentRouteSkeleton = computed(() => {
  const effectiveName =
    pendingRouteName.value || getEffectiveRouteName(route.name as string);
  return routeSkeletonMap[effectiveName] || routeSkeletonMap.default;
});

// Provide the skeleton component so MainLayout can render it in the content area
provide('currentRouteSkeleton', currentRouteSkeleton);

// Provide pending route name so sidebar can highlight target route during navigation
provide('pendingRouteName', pendingRouteName);

// Form routes that should not show skeleton during navigation
const formRouteNames = ['ReschedulesCreate', 'ReschedulesUpdate'];

// Setup router hooks to handle navigation loading state
router.beforeEach((to) => {
  // Skip skeleton for form views - they handle loading themselves
  if (!formRouteNames.includes(to.name as string)) {
    onNavigationStart(to.name as string);
  }
});

router.afterEach(() => {
  onNavigationEnd();
});

// Phone device detection
const isPhone = ref(false);

// Telegram initData detection (computed from utils)
const hasInitData = computed(() => !!getInitData());

// Initialize toast for global use
const toast = useToast();

// Initialize confirm for global use
const confirm = useConfirm();

// Wait for router to resolve initial navigation
onMounted(async () => {
  // Detect if device is a phone
  isPhone.value = /iPhone|iPad|Android|webOS|BlackBerry/i.test(
    navigator.userAgent,
  );

  // Expand and ready the WebApp when running inside Telegram
  if (hasInitData.value) {
    requestFullscreen();
    readyWebApp();
  }

  // Initialize toast for stores
  const { initToast } = await import('../utils/ui');
  initToast(toast);

  // Initialize confirm for stores
  const { setConfirmInstance } = await import('../utils/ui');
  setConfirmInstance(confirm);

  await router.isReady();
  markRouterReady();
  // View remains in loading state until component calls viewReady()
});
</script>

<style>
body {
  background-color: var(--color-bg);
}

#app {
  display: flex;
  flex-direction: column;
}

#app.telegram-phone {
  padding-top: 100px;
}
</style>
