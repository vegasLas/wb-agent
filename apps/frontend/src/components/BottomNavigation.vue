<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-50 bg-deep-card border-t border-deep-border pb-safe"
  >
    <div class="flex items-end justify-around px-2 pb-2">
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

      <!-- WB with submenu -->
      <button
        :class="[
          'flex flex-col items-center justify-center min-w-[64px] gap-1 rounded-xl px-2 py-1 transition-colors',
          isWbActive
            ? 'text-purple-700 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="toggleWbMenu"
      >
        <i class="pi pi-shopping-bag text-xl" />
        <span class="text-[11px] font-medium">WB</span>
      </button>
      <Menu ref="wbMenu" :model="wbMenuItems" :popup="true" />

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

      <!-- Reports -->
      <button
        :class="[
          'flex flex-col items-center justify-center min-w-[64px] gap-1 rounded-xl px-2 py-1 transition-colors',
          isActive('/reports')
            ? 'text-purple-700 dark:text-purple-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
        ]"
        @click="navigate('/reports')"
      >
        <i class="pi pi-chart-pie text-xl" />
        <span class="text-[11px] font-medium">Отчеты</span>
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
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menu';

const route = useRoute();
const router = useRouter();

const wbRoutes = ['/promotions', '/tariffs', '/adverts', '/region-sales', '/wb'];

const isWbActive = computed(() => wbRoutes.includes(route.path));

function isActive(path: string) {
  return route.path === path;
}

function navigate(path: string) {
  router.push(path);
}

// WB submenu
const wbMenu = ref<InstanceType<typeof Menu> | null>(null);

const wbMenuItems: MenuItem[] = [
  {
    label: 'Акции',
    icon: 'pi pi-tags',
    command: () => navigate('/promotions'),
  },
  {
    label: 'Тарифы',
    icon: 'pi pi-percentage',
    command: () => navigate('/tariffs'),
  },
  {
    label: 'Реклама',
    icon: 'pi pi-megaphone',
    command: () => navigate('/adverts'),
  },
  {
    label: 'Продажи по регионам',
    icon: 'pi pi-map',
    command: () => navigate('/region-sales'),
  },
];

const toggleWbMenu = (event: MouseEvent) => {
  wbMenu.value?.toggle(event);
};
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
