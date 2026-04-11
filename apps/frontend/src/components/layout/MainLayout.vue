<template>
  <div class="min-h-screen bg-deep-bg flex flex-col lg:flex-row">
    <!-- Main Content -->
    <main
      class="flex-1 container mx-auto px-4 py-6 lg:mx-0 lg:max-w-none lg:px-8 lg:py-6 overflow-y-auto relative pb-24"
    >
      <!-- Top Bar with Account (left) and Plus (right) buttons -->
      <div class="flex items-center justify-between mb-4 lg:hidden">
        <!-- Account Button (Left) -->
        <Button
          :severity="isAccountRoute ? 'primary' : 'secondary'"
          variant="outlined"
          class="rounded"
          aria-label="Профиль"
          @click="navigateToAccount"
        >
          <i class="pi pi-user" />
        </Button>

        <!-- Plus Button with Entity Selection (Right) -->
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

      <!-- Content skeleton overlay during view loading/navigation -->
      <div v-if="showContentSkeleton" class="absolute inset-0 bg-deep-bg z-10">
        <component :is="currentRouteSkeleton" />
      </div>

      <RouterView />
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
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';
import { MainHelpModal } from '../help';
import { AccountManagementView } from '../account-management';
import { useSkeleton } from '../../composables/useSkeleton';
import BottomNavigation from '../BottomNavigation.vue';
import AutobookingCreateDialog from '../autobooking/CreateDialog.vue';
import TriggerCreateDialog from '../triggers/CreateDialog.vue';
import type { MenuItem } from 'primevue/menu';
import { useAutobookingListStore } from '../../stores/autobookingList';
import { useTriggerStore } from '../../stores/triggers';

const accountModalStore = useAccountSupplierModalStore();
const showHelpModal = ref(false);

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
