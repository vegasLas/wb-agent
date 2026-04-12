import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import { useWarehousesStore } from '../stores/warehouses';
import { useRescheduleStore } from '../stores/reschedules';
import { useAccountSupplierModalStore } from '../stores/accountSupplierModal';
import router from './index';
import { isTelegramWebApp, getTelegramColorScheme, getInitData } from '../utils/telegram';

// Reactive state for components that need it
const isInitializing = ref(false);
const telegramColorScheme = ref('light');

/**
 * Detect if running in Telegram Mini App
 * Uses the flag set by early detection script in index.html
 * Falls back to utility function if needed
 */
function detectTelegramMode(): boolean {
  // Primary: Check global flag set in index.html early detection script
  // This is the most reliable source as it runs before Vue Router
  if (window.__IS_TELEGRAM_WEBAPP__ === true) {
    return true;
  }

  // Fallback: Use utility function to check URL/hash
  return isTelegramWebApp();
}

export function useAppState() {
  const userStore = useUserStore();
  const warehouseStore = useWarehousesStore();
  const rescheduleStore = useRescheduleStore();
  const accountModalStore = useAccountSupplierModalStore();

  // Initialize Telegram mode (just check URL params, no WebApp object needed)
  async function initTelegram(): Promise<{
    isTgClient: boolean;
    colorScheme: string;
  }> {
    // Detect Telegram mode based on URL params
    const isTg = detectTelegramMode();
    const forceBrowser = window.__FORCE_BROWSER_MODE__ === true;

    if (forceBrowser || !isTg) {
      // Browser mode - use system color scheme
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      const scheme = prefersDark ? 'dark' : 'light';
      telegramColorScheme.value = scheme;

      console.log('[AppState] Browser mode detected, colorScheme:', scheme);

      return {
        isTgClient: false,
        colorScheme: scheme,
      };
    }

    // Telegram mode - we have initData from URL or localStorage
    const initData = getInitData();

    if (initData) {
      console.log('[AppState] Telegram mode with initData');
      
      // Use utility to get color scheme from Telegram theme params
      const scheme = getTelegramColorScheme();
      telegramColorScheme.value = scheme;

      return {
        isTgClient: true,
        colorScheme: scheme,
      };
    }

    // No initData available - fallback to browser mode
    console.warn(
      '[AppState] Telegram mode detected but no initData, falling back to browser',
    );
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    const scheme = prefersDark ? 'dark' : 'light';
    telegramColorScheme.value = scheme;

    // Update global flag since we're falling back
    window.__AUTH_MODE__ = 'browser';
    window.__IS_TELEGRAM_WEBAPP__ = false;

    return {
      isTgClient: false,
      colorScheme: scheme,
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
