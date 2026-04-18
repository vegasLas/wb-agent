<template>
  <aside
    class="w-[260px] h-screen sticky top-0 shrink-0 bg-card border-r border-deep-border flex flex-col"
  >
    <!-- Brand -->
    <div class="h-16 flex items-center gap-3 px-5 border-b border-deep-border">
      <div
        class="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shadow-lg shadow-purple-900/20"
      >
        <span class="text-white font-bold text-sm tracking-tight">WB</span>
      </div>
      <div>
        <div class="font-semibold text-theme text-sm leading-none">Agent</div>
        <div class="text-[11px] text-muted leading-none mt-1">
          Панель управления
        </div>
      </div>
    </div>

    <!-- Primary Navigation -->
    <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      <nav class="space-y-1">
        <RouterLink
          v-for="item in primaryNav"
          :key="item.route"
          :to="{ name: item.route }"
          :class="[
            'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            isActive(item)
              ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-md shadow-purple-900/20'
              : 'text-secondary hover:text-theme hover:bg-elevated hover:translate-x-0.5',
          ]"
        >
          <i
            :class="[
              item.icon,
              'text-base transition-transform duration-200',
              isActive(item) ? '' : 'group-hover:scale-110',
            ]"
          />
          <span>{{ item.label }}</span>
          <div
            v-if="isActive(item)"
            class="ml-auto w-1.5 h-1.5 rounded-full bg-white/80"
          />
        </RouterLink>
      </nav>

      <!-- Divider -->
      <div class="border-t border-deep-border" />

      <!-- Secondary Navigation -->
      <nav class="space-y-1">
        <RouterLink
          v-for="item in secondaryNav"
          :key="item.route"
          :to="{ name: item.route }"
          :class="[
            'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            isActive(item)
              ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-md shadow-purple-900/20'
              : 'text-secondary hover:text-theme hover:bg-elevated hover:translate-x-0.5',
          ]"
        >
          <i
            :class="[
              item.icon,
              'text-base transition-transform duration-200',
              isActive(item) ? '' : 'group-hover:scale-110',
            ]"
          />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <!-- Bottom Actions -->
    <div class="px-3 py-4 border-t border-deep-border">
      <!-- Profile Dropdown -->
      <button
        class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-theme hover:bg-elevated transition-all duration-200 hover:translate-x-0.5"
        @click="toggleProfileMenu"
      >
        <i
          class="pi pi-user text-base transition-transform duration-200 group-hover:scale-110"
        />
        <span class="truncate">{{ accountLabel }}</span>
        <i class="pi pi-chevron-down text-xs ml-auto" />
      </button>
      <Popover ref="profileMenu">
        <div class="flex flex-col gap-1 min-w-[180px]">
          <button
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-theme hover:bg-elevated transition-colors text-left w-full"
            @click="handleHelp"
          >
            <i class="pi pi-question-circle text-base" />
            <span>Помощь</span>
          </button>
          <button
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-theme hover:bg-elevated transition-colors text-left w-full"
            @click="handleTheme"
          >
            <i :class="[isDark ? 'pi pi-sun' : 'pi pi-moon', 'text-base']" />
            <span>{{ isDark ? 'Светлая тема' : 'Темная тема' }}</span>
          </button>
          <div class="border-t border-deep-border my-1" />
          <button
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-secondary hover:text-theme hover:bg-elevated transition-colors text-left w-full"
            @click="handleAccounts"
          >
            <i class="pi pi-users text-base" />
            <span>Аккаунты</span>
          </button>
        </div>
      </Popover>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useColorMode } from '@vueuse/core';
import Popover from 'primevue/popover';
import { useUserStore } from '@/stores/user';

const emit = defineEmits<{
  'show-help': [];
  'show-accounts': [];
}>();

const route = useRoute();
const userStore = useUserStore();

// Theme toggle
const colorMode = useColorMode({
  attribute: 'class',
  selector: 'html',
});

const isDark = computed(() => colorMode.value === 'dark');

const toggleTheme = () => {
  colorMode.value = isDark.value ? 'light' : 'dark';
};

// Profile menu
const profileMenu = ref<InstanceType<typeof Popover> | null>(null);

const toggleProfileMenu = (event: MouseEvent) => {
  profileMenu.value?.toggle(event);
};

const handleHelp = () => {
  profileMenu.value?.hide();
  emit('show-help');
};

const handleTheme = () => {
  profileMenu.value?.hide();
  toggleTheme();
};

const handleAccounts = () => {
  profileMenu.value?.hide();
  emit('show-accounts');
};

// Account label
const accountLabel = computed(() => {
  return userStore.activeSupplier?.supplierName || 'Профиль';
});

// Subscription label
const subscriptionLabel = computed(() => {
  if (userStore.subscriptionActive) {
    return `${userStore.subscriptionRemainingDays} дн.`;
  }
  return 'Не активна';
});

// Primary navigation
const primaryNav = [
  { id: 'chat', label: 'AI Чат', icon: 'pi pi-comments', route: 'Chat' },
  { id: 'tasks', label: 'Задачи', icon: 'pi pi-check-square', route: 'Tasks' },
  {
    id: 'autobooking',
    label: 'Автоброни',
    icon: 'pi pi-calendar',
    route: 'AutobookingList',
  },
  {
    id: 'triggers',
    label: 'Таймслоты',
    icon: 'pi pi-clock',
    route: 'TriggersList',
  },
  { id: 'promotions', label: 'Акции', icon: 'pi pi-tags', route: 'Promotions' },
  { id: 'reports', label: 'Отчеты', icon: 'pi pi-chart-pie', route: 'Reports' },
  {
    id: 'adverts',
    label: 'Реклама',
    icon: 'pi pi-megaphone',
    route: 'Adverts',
  },
  {
    id: 'regionSales',
    label: 'Продажи по регионам',
    icon: 'pi pi-map',
    route: 'RegionSales',
  },
  {
    id: 'reschedules',
    label: 'Перепланирования',
    icon: 'pi pi-calendar-clock',
    route: 'ReschedulesList',
  },
  {
    id: 'tariffs',
    label: 'Тарифы',
    icon: 'pi pi-percentage',
    route: 'Tariffs',
  },
  {
    id: 'mpstats',
    label: 'MPStats',
    icon: 'pi pi-chart-bar',
    route: 'MPStats',
  },
];

// Secondary navigation
const secondaryNav = [
  {
    id: 'payments',
    label: 'Магазин',
    icon: 'pi pi-shopping-cart',
    route: 'Payments',
  },
];

// Active state check
function isActive(item: { id: string; route: string }): boolean {
  const routeName = route.name?.toString() ?? '';
  const routePath = route.path;

  // Match by route name prefix
  if (routeName.startsWith(item.id)) {
    return true;
  }

  // Fallback: match by path for routes that share a base path
  if (routePath.startsWith(`/${item.id.toLowerCase()}`)) {
    return true;
  }

  return false;
}
</script>

<style scoped>
aside {
  /* Ensure the sidebar stacks above any z-10 content overlays */
  z-index: 20;
}
</style>
