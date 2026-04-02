import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import { useWarehousesStore } from '../stores/warehouses';
import { useRescheduleStore } from '../stores/reschedules';
import { useAccountSupplierModalStore } from '../stores/accountSupplierModal';
import router from './index';

// Reactive state for components that need it
const isInitializing = ref(false);
const telegramColorScheme = ref('light');

export function useAppState() {
  const userStore = useUserStore();
  const warehouseStore = useWarehousesStore();
  const rescheduleStore = useRescheduleStore();
  const accountModalStore = useAccountSupplierModalStore();

  // Initialize Telegram WebApp
  async function initTelegram(): Promise<{ isTgClient: boolean; colorScheme: string }> {
    const vueTg = await import('vue-tg');
    const { colorScheme } = vueTg.useWebAppTheme();
    const initData = vueTg.useWebApp().initData;
    
    telegramColorScheme.value = colorScheme.value;
    
    return {
      isTgClient: Boolean(initData),
      colorScheme: colorScheme.value,
    };
  }

  // Initialize user data
  async function initUserData(): Promise<void> {
    await userStore.fetchUser();
    
    // Fetch background data
    rescheduleStore.fetchReschedules();
    warehouseStore.fetchWarehouses();
    
    // Handle auth query param
    const query = router.currentRoute.value.query;
    if (query.auth === 'true') {
      accountModalStore.showModal = true;
    }
  }

  return {
    isInitializing,
    telegramColorScheme,
    initTelegram,
    initUserData,
  };
}

// For use in router guards (non-component context)
export function createAppState() {
  return useAppState();
}
