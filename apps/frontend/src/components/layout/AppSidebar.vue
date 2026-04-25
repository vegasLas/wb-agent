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
        <div class="font-semibold text-theme text-sm leading-none">OI</div>
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
            @click="handleProfile"
          >
            <i class="pi pi-user text-base" />
            <span>Профиль</span>
          </button>
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
import { computed, ref, inject, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useColorMode } from '@vueuse/core';
import Popover from 'primevue/popover';
import { useUserStore } from '@/stores/user';
import { useNavigation } from '@/composables/useNavigation';

const emit = defineEmits<{
  'show-help': [];
  'show-accounts': [];
}>();

const router = useRouter();
const pendingRouteName = inject<Ref<string | null>>(
  'pendingRouteName',
  ref(null),
);
const { primaryNav, secondaryNav, isActive } = useNavigation(pendingRouteName);
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

const handleProfile = () => {
  profileMenu.value?.hide();
  router.push({ name: 'Account' });
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
</script>

<style scoped>
aside {
  /* Ensure the sidebar stacks above any z-10 content overlays */
  z-index: 20;
}
</style>
