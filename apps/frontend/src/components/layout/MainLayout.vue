<template>
  <div class="min-h-screen bg-deep-bg text-theme flex flex-col lg:flex-row">
    <!-- Main Content -->
    <AppSidebar
      class="hidden lg:block"
      @show-help="showHelpModal = true"
      @show-accounts="accountModalStore.showModal = true"
    />

    <!-- Main Content -->
    <main
      class="flex-1 px-4 py-6 lg:px-8 lg:py-6 overflow-y-auto relative pb-24 lg:pb-6 min-h-screen"
    >
      <!-- Top Bar with Account (left) and Plus (right) buttons -->
      <!-- This is always visible once router is ready - not part of skeleton -->
      <div class="flex items-center justify-between mb-4 lg:hidden">
        <!-- Account Button and Supplier Name (Left) -->
        <div class="flex items-center gap-2">
          <Button
            :severity="isAccountRoute ? 'primary' : 'secondary'"
            variant="outlined"
            class="rounded"
            aria-label="Профиль"
            @click="navigateToAccount"
          >
            <i class="pi pi-user" />
          </Button>
          <Button
            v-if="currentSupplierName"
            severity="secondary"
            variant="text"
            class="rounded max-w-[140px]"
            :title="currentSupplierName"
            @click="accountModalStore.showModal = true"
          >
            <span class="truncate">{{ currentSupplierName }}</span>
          </Button>
        </div>

        <!-- Action Buttons (Right) -->
        <div class="flex items-center gap-2">
          <Button
            severity="secondary"
            variant="outlined"
            class="rounded"
            aria-label="Переключить тему"
            @click="toggleTheme"
          >
            <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
          </Button>

          <!-- Plus Button with Entity Selection -->
          <Button
            severity="primary"
            class="rounded"
            aria-label="Добавить"
            @click="toggleAddMenu"
          >
            <i class="pi pi-plus" />
          </Button>
          <Menu ref="addMenu" :model="addMenuItems" :popup="true" />
        </div>
      </div>

      <!-- Content Area -->
      <div class="relative">
        <!-- Content skeleton overlay during view loading/navigation -->
        <!-- Positioned to only cover content below the header -->
        <div 
          v-if="showContentSkeleton" 
          class="absolute inset-0 bg-deep-bg text-theme z-10"
        >
          <component :is="currentRouteSkeleton" />
        </div>

        <div class="max-w-7xl mx-auto w-full">
          <RouterView />
        </div>
      </div>
    </main>

    <!-- Bottom Navigation (Mobile) -->
    <BottomNavigation class="lg:hidden" />

    <!-- Global Modals -->
    <MainHelpModal v-model="showHelpModal" />
    <AccountManagementView v-model="accountModalStore.showModal" />

    <!-- Create Dialogs -->
    <AutobookingCreateDialog
      v-model:show="showAutobookingDialog"
      @created="handleAutobookingCreated"
    />
    <TriggerCreateDialog
      v-model:show="showTriggerDialog"
      @created="handleTriggerCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useColorMode } from '@vueuse/core';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { useAccountSupplierModalStore } from '@/stores/ui';
import { useUserStore } from '@/stores/user';
import { MainHelpModal } from '../help';
import { AccountManagementView } from '../account-management';
import { useSkeleton } from '../../composables/ui';
import BottomNavigation from '../BottomNavigation.vue';
import AppSidebar from './AppSidebar.vue';
import AutobookingCreateDialog from '../autobooking/CreateDialog.vue';
import TriggerCreateDialog from '../triggers/CreateDialog.vue';
import type { MenuItem } from 'primevue/menu';
import { useAutobookingListStore } from '@/stores/autobooking';
import { useTriggerStore } from '@/stores/triggers';

const accountModalStore = useAccountSupplierModalStore();
const userStore = useUserStore();
const showHelpModal = ref(false);

// Theme toggle
const colorMode = useColorMode({
  attribute: 'class',
  selector: 'html',
});

const isDark = computed(() => colorMode.value === 'dark');

const toggleTheme = () => {
  colorMode.value = isDark.value ? 'light' : 'dark';
};

// Computed property to get current supplier name
const currentSupplierName = computed(() => {
  return userStore.activeSupplier?.supplierName || '';
});

const currentRouteSkeleton = inject('currentRouteSkeleton');
const { showSkeleton, isRouterInitializing } = useSkeleton();

const showContentSkeleton = computed(
  () => showSkeleton.value && !isRouterInitializing.value,
);

const route = useRoute();
const router = useRouter();

// Account navigation
const isAccountRoute = computed(() => route.name === 'Account');
const navigateToAccount = () => router.push({ name: 'Account' });

// Add menu
const addMenu = ref<InstanceType<typeof Menu> | null>(null);
const showAutobookingDialog = ref(false);
const showTriggerDialog = ref(false);

const autobookingListStore = useAutobookingListStore();
const triggerStore = useTriggerStore();

const addMenuItems: MenuItem[] = [
  {
    label: 'автобронирование',
    icon: 'pi pi-calendar',
    command: () => {
      showAutobookingDialog.value = true;
    },
  },
  {
    label: 'таймслот',
    icon: 'pi pi-clock',
    command: () => {
      showTriggerDialog.value = true;
    },
  },
];

const toggleAddMenu = (event: MouseEvent) => {
  addMenu.value?.toggle(event);
};

// Handle created events
const handleAutobookingCreated = () => {
  autobookingListStore.fetchData();
};

const handleTriggerCreated = () => {
  triggerStore.fetchTriggers();
};
</script>
