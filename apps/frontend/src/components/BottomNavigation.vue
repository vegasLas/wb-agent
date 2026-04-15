<template>
  <div class="fixed bottom-10 z-50 pointer-events-none" style="width: 100vw; left: 0;">
    <div class="flex justify-center">
      <div
        class="bg-deep-card border border-deep-border rounded-full px-4 py-3 shadow-lg pointer-events-auto"
      >
        <div class="flex items-center gap-2">
          <!-- Home -->
          <button
            :class="[
              'flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-200/80 dark:bg-gray-700/80 transition-colors',
              isActive('/')
                ? 'text-purple-700 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600',
            ]"
            @click="navigate('/')"
          >
            <i class="pi pi-home text-xl" />
          </button>

          <!-- Tasks -->
          <button
            :class="[
              'flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-200/80 dark:bg-gray-700/80 transition-colors',
              isActive('/tasks')
                ? 'text-purple-700 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600',
            ]"
            @click="navigate('/tasks')"
          >
            <i class="pi pi-check-square text-xl" />
          </button>

          <!-- Chat -->
          <button
            :class="[
              'flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-200/80 dark:bg-gray-700/80 transition-colors',
              isActive('/chat')
                ? 'text-purple-700 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600',
            ]"
            @click="navigate('/chat')"
          >
            <i class="pi pi-comments text-xl" />
          </button>

          <!-- WB -->
          <button
            :class="[
              'flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-200/80 dark:bg-gray-700/80 transition-colors font-semibold text-sm',
              isActive('/wb')
                ? 'text-purple-700 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600',
            ]"
            @click="navigate('/wb')"
          >
            wb
          </button>

          <!-- MPStats -->
          <button
            :class="[
              'flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-200/80 dark:bg-gray-700/80 transition-colors',
              isActive('/mpstats')
                ? 'text-purple-700 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600',
            ]"
            @click="navigate('/mpstats')"
          >
            <i class="pi pi-chart-bar text-xl" />
          </button>
        </div>
      </div>
    </div>
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
