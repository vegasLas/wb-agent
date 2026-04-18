<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-50 bg-deep-card border-t border-deep-border pb-safe"
  >
    <div class="flex items-end justify-around px-2 pb-2">
      <!-- Home -->
      <button
        :class="[
          'flex flex-col items-center justify-center min-w-[64px] gap-1 rounded-xl px-2 py-1 transition-colors',
          isActive('/')
            ? 'text-purple-700 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="navigate('/')"
      >
        <i class="pi pi-home text-xl" />
        <span class="text-[11px] font-medium">Главная</span>
      </button>

      <!-- Tasks -->
      <button
        :class="[
          'flex flex-col items-center justify-center min-w-[64px] gap-1 rounded-xl px-2 py-1 transition-colors',
          isActive('/tasks')
            ? 'text-purple-700 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="navigate('/tasks')"
      >
        <i class="pi pi-check-square text-xl" />
        <span class="text-[11px] font-medium">Задачи</span>
      </button>

      <!-- Center Chat Button -->
      <button
        :class="[
          'relative -top-5 flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg transition-transform active:scale-95',
          isActive('/chat')
            ? 'bg-violet-400 text-white shadow-purple-900/20'
            : 'bg-purple-700 hover:bg-violet-400 text-white shadow-purple-900/20',
        ]"
        aria-label="AI Чат"
        @click="navigate('/chat')"
      >
        <i class="pi pi-comments text-2xl" />
      </button>

      <!-- WB -->
      <button
        :class="[
          'flex flex-col items-center justify-center min-w-[64px] gap-1 rounded-xl px-2 py-1 transition-colors',
          isActive('/wb')
            ? 'text-purple-700 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="navigate('/wb')"
      >
        <span class="text-lg font-bold leading-none">wb</span>
        <span class="text-[11px] font-medium">WB</span>
      </button>

      <!-- Tariffs -->
      <button
        :class="[
          'flex flex-col items-center justify-center min-w-[64px] gap-1 rounded-xl px-2 py-1 transition-colors',
          isActive('/tariffs')
            ? 'text-purple-700 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="navigate('/tariffs')"
      >
        <i class="pi pi-percentage text-xl" />
        <span class="text-[11px] font-medium">Тарифы</span>
      </button>

      <!-- MPStats -->
      <button
        :class="[
          'flex flex-col items-center justify-center min-w-[64px] gap-1 rounded-xl px-2 py-1 transition-colors',
          isActive('/mpstats')
            ? 'text-purple-700 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="navigate('/mpstats')"
      >
        <i class="pi pi-chart-bar text-xl" />
        <span class="text-[11px] font-medium">MPStats</span>
      </button>
    </div>

    <!-- Home indicator safe area spacer -->
    <div class="h-[env(safe-area-inset-bottom)]" />
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

function isActive(path: string) {
  return route.path === path;
}

function navigate(path: string) {
  router.push(path);
}
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
