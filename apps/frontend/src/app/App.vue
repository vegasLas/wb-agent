<template>
  <TechnicalMaintenanceError v-if="showTechnicalMaintenance" />
  <NotFound
    v-else-if="showSessionExpired"
    title="Сессия истекла"
    message="Пожалуйста, переоткройте кабинет для обновления данных авторизации"
  />
  <NotFound
    v-else-if="isTgClient === false"
    title="Пользователь не найден"
    message="Произошла ошибка при загрузке данных пользователя"
  />
  <SkeletonMain v-else-if="!isLoaded" :view="viewStore.currentView" />
  <AppMain
    v-else-if="isClientSide && isTgClient && userStore.isFetched"
    :show-main="isLoaded && isTgClient"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useColorMode } from '@vueuse/core';

// Stores
import { useUserStore } from '../stores/user';
import { useAutobookingListStore } from '../stores/autobookingList';
import { useViewStore } from '../stores/view';
import { useWarehousesStore } from '../stores/warehouses';
import { useCoefficientsStore } from '../stores/coefficients';
import { useTriggerStore } from '../stores/triggers';
import { useAccountSupplierModalStore } from '../stores/accountSupplierModal';
import { useRescheduleStore } from '../stores/reschedule';

// Components
import TechnicalMaintenanceError from '../components/TechnicalMaintenanceError.vue';
import NotFound from '../components/NotFound.vue';
import SkeletonMain from '../components/skeleton/SkeletonMain.vue';
import AppMain from './AppMain.vue';

// Types
import type { ViewType } from '../types';

// Store instances
const userStore = useUserStore();
const listAutobookingStore = useAutobookingListStore();
const viewStore = useViewStore();
const warehouseStore = useWarehousesStore();
const coefficientsStore = useCoefficientsStore();
const triggerStore = useTriggerStore();
const accountModalStore = useAccountSupplierModalStore();
const rescheduleStore = useRescheduleStore();

// Computed loading state
const isLoaded = computed(() => {
  if (!userStore.isFetched || !warehouseStore.isFetched) return false;
  switch (viewStore.currentView) {
    case 'autobookings-main':
      return listAutobookingStore.isFetched;
    case 'triggers-main':
      return triggerStore.isFetched;
    default:
      return true;
  }
});

// State refs
const isTgClient = ref(true);
const isClientSide = ref(false);
const showTechnicalMaintenance = ref(false);
const showSessionExpired = ref(false);

// Route handling
const route = useRoute();
const view = route.query.view as ViewType;

// Initialize view from query param
if (
  view &&
  ['triggers-main', 'store', 'autobookings-main', 'account'].includes(view)
) {
  viewStore.setView(view);
}

if (view === 'auth') {
  accountModalStore.showModal = true;
}

// Initialize app on mount
onMounted(async () => {
  try {
    await userStore.fetchUser();
    
    // Fetch supplies if not loaded
    rescheduleStore.fetchReschedules();
    coefficientsStore.loadCoefficients();
    warehouseStore.fetchWarehouses();
    
    // Initialize Telegram WebApp
    const vueTg = await import('vue-tg');
    const { colorScheme } = vueTg.useWebAppTheme();
    useColorMode().preference = colorScheme.value;
    
    const initData = vueTg.useWebApp().initData;
    isTgClient.value = Boolean(initData);
    isClientSide.value = true;
  } catch (error: any) {
    // Check if it's a session expired error (expired init data)
    if (error?.data?.data?.expired === true) {
      showSessionExpired.value = true;
    }
    // Check if it's a technical maintenance error (503)
    else if (error?.status === 503 || error?.statusCode === 503) {
      showTechnicalMaintenance.value = true;
    } else {
      isTgClient.value = false;
      // Handle other errors as before
      console.error('App initialization error:', error);
    }
  }
});
</script>

<style>
body {
  @apply bg-white dark:bg-[#171819];
}
</style>
