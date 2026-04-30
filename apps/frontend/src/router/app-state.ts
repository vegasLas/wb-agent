import { ref } from 'vue';
import { useUserStore } from '@/stores/user';
import { useWarehousesStore } from '@/stores/warehouses';
import { useNotificationsStore } from '@/stores/notifications';
import { useAccountSupplierModalStore } from '@/stores/ui';
import router from './index';

// Reactive state for components that need it
const isInitializing = ref(false);
const appColorScheme = ref('light');

export function useAppState() {
  const userStore = useUserStore();
  const warehouseStore = useWarehousesStore();
  const notificationsStore = useNotificationsStore();
  const accountModalStore = useAccountSupplierModalStore();

  // Initialize app (browser mode only)
  async function initApp(): Promise<{
    colorScheme: string;
  }> {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    const scheme = prefersDark ? 'dark' : 'light';
    appColorScheme.value = scheme;

    console.log('[AppState] Browser mode detected, colorScheme:', scheme);

    return {
      colorScheme: scheme,
    };
  }

  // Initialize user data
  async function initUserData(): Promise<void> {
    await userStore.fetchUser();

    // Fetch background data
    warehouseStore.fetchWarehouses();
    notificationsStore.fetchUnreadCount();

    // Handle auth query param
    const query = router.currentRoute.value.query;
    if (query.auth === 'true') {
      accountModalStore.showModal = true;
    }
  }

  return {
    isInitializing,
    appColorScheme,
    initApp,
    initUserData,
  };
}

// For use in router guards (non-component context)
export function createAppState() {
  return useAppState();
}
