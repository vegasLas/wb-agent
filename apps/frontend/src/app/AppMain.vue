<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTelegram, useMainButton, useBackButton } from '../composables/useTelegram';

const route = useRoute();
const router = useRouter();
const { isTelegram, colorScheme } = useTelegram();
const { hideMainButton } = useMainButton();
const { hideBackButton } = useBackButton();

// Hide Telegram buttons on mount
hideMainButton();
hideBackButton();

// Navigation items
const navItems = [
  { name: 'Account', path: '/', icon: 'user' },
  { name: 'Autobooking', path: '/autobooking', icon: 'calendar' },
  { name: 'Triggers', path: '/triggers', icon: 'bell' },
  { name: 'Reschedules', path: '/reschedules', icon: 'clock' },
  { name: 'Reports', path: '/reports', icon: 'chart' },
  { name: 'Store', path: '/store', icon: 'store' },
];

// Check if route is active
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(path);
};

// Get current page title
const pageTitle = computed(() => {
  return (route.meta.title as string) || 'WB Agent';
});

// Theme-based styles
const isDarkTheme = computed(() => colorScheme.value === 'dark');

// Navigate to path
const navigate = (path: string) => {
  router.push(path);
};
</script>

<template>
  <div 
    class="min-h-screen flex flex-col"
    :class="{ 'bg-gray-900 text-white': isDarkTheme, 'bg-gray-50 text-gray-900': !isDarkTheme }"
  >
    <!-- Header -->
    <header 
      class="sticky top-0 z-10 px-4 py-3 border-b"
      :class="{ 
        'bg-gray-800 border-gray-700': isDarkTheme, 
        'bg-white border-gray-200': !isDarkTheme 
      }"
    >
      <div class="flex items-center justify-between max-w-7xl mx-auto">
        <h1 class="text-lg font-semibold">{{ pageTitle }}</h1>
        <div class="flex items-center gap-2">
          <!-- Theme indicator for Telegram -->
          <span v-if="isTelegram" class="text-xs opacity-50">
            {{ colorScheme }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <div class="max-w-7xl mx-auto p-4">
        <RouterView />
      </div>
    </main>

    <!-- Bottom Navigation -->
    <nav 
      class="sticky bottom-0 border-t"
      :class="{ 
        'bg-gray-800 border-gray-700': isDarkTheme, 
        'bg-white border-gray-200': !isDarkTheme 
      }"
    >
      <div class="max-w-7xl mx-auto">
        <div class="flex justify-around items-center">
          <button
            v-for="item in navItems"
            :key="item.path"
            class="flex flex-col items-center py-2 px-3 text-xs transition-colors"
            :class="{
              'text-blue-500': isActive(item.path),
              'text-gray-500 hover:text-gray-700': !isActive(item.path) && !isDarkTheme,
              'text-gray-400 hover:text-gray-300': !isActive(item.path) && isDarkTheme,
            }"
            @click="navigate(item.path)"
          >
            <!-- Icon placeholders - will be replaced with actual icons in UI-LIB plan -->
            <span class="w-6 h-6 mb-1 flex items-center justify-center rounded">
              {{ item.icon.charAt(0).toUpperCase() }}
            </span>
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>
