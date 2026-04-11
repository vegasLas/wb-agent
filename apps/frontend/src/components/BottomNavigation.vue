<template>
  <div class="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
    <div
      class="bg-deep-card border border-deep-border rounded-full px-5 py-3 shadow-lg"
    >
      <div class="flex items-center">
        <!-- Home -->
        <button
          :class="[
            'flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-colors',
            isActive('/')
              ? 'text-purple-700'
              : 'text-gray-500 hover:text-gray-300',
          ]"
          @click="navigate('/')"
        >
          <i class="pi pi-home text-xl" />
          <span class="text-xs">Главная</span>
        </button>

        <!-- Tasks -->
        <button
          :class="[
            'flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-colors',
            isActive('/tasks')
              ? 'text-purple-700'
              : 'text-gray-500 hover:text-gray-300',
          ]"
          @click="navigate('/tasks')"
        >
          <i class="pi pi-check-square text-xl" />
          <span class="text-xs">Задачи</span>
        </button>

        <!-- WB -->
        <button
          :class="[
            'flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-colors',
            isActive('/wb')
              ? 'text-purple-700'
              : 'text-gray-500 hover:text-gray-300',
          ]"
          @click="navigate('/wb')"
        >
          <i class="pi pi-shopping-bag text-xl" />
          <span class="text-xs">WB</span>
        </button>

        <!-- MPStats -->
        <button
          :class="[
            'flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-colors',
            isActive('/mpstats')
              ? 'text-purple-700'
              : 'text-gray-500 hover:text-gray-300',
          ]"
          @click="navigate('/mpstats')"
        >
          <i class="pi pi-chart-bar text-xl" />
          <span class="text-xs">MPStats</span>
        </button>
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
