<template>
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
    <div class="bg-gray-900 dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg">
      <div class="flex items-center">
        <!-- Home -->
        <button
          :class="[
            'flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors',
            isActive('/') ? 'text-white' : 'text-gray-400 hover:text-gray-200',
          ]"
          @click="navigate('/')"
        >
          <i class="pi pi-home text-lg" />
          <span class="text-[10px]">Главная</span>
        </button>

        <!-- Tasks -->
        <button
          :class="[
            'flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors',
            isActive('/tasks')
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-200',
          ]"
          @click="navigate('/tasks')"
        >
          <i class="pi pi-check-square text-lg" />
          <span class="text-[10px]">Задачи</span>
        </button>

        <!-- WB -->
        <button
          :class="[
            'flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors',
            isActive('/wb')
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-200',
          ]"
          @click="navigate('/wb')"
        >
          <i class="pi pi-shopping-bag text-lg" />
          <span class="text-[10px]">WB</span>
        </button>

        <!-- MPStats -->
        <button
          :class="[
            'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors',
            isActive('/mpstats')
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-200',
          ]"
          @click="navigate('/mpstats')"
        >
          <i class="pi pi-chart-bar text-lg" />
          <span class="text-[10px]">MPStats</span>
        </button>

        <!-- Account -->
        <button
          :class="[
            'flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors',
            isActive('/account')
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-200',
          ]"
          @click="navigate('/account')"
        >
          <i class="pi pi-user text-lg" />
          <span class="text-[10px]">Профиль</span>
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
