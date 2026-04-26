import { ref, onMounted, type Ref } from 'vue';
import { confirmPromise } from '@/utils/ui';

// Telegram WebApp types (subset we need)
interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface WebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

// Window interface is already declared by vue-tg
// We use type assertions when accessing window.Telegram

// Return type for useTelegram
interface UseTelegramReturn {
  isReady: Ref<boolean>;
  isTelegram: Ref<boolean>;
  initData: string;
  initDataUnsafe: WebAppInitData | undefined;
  version: string | undefined;
  platform: string | undefined;
  colorScheme: Ref<string | undefined>;
  themeParams: Ref<ThemeParams | undefined>;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  hapticFeedback: (
    type: 'light' | 'medium' | 'heavy' | 'success' | 'error',
  ) => void;
  getUser: () => TelegramUser | undefined;
  getInitData: () => string | undefined;
}

// Telegram WebApp composable for easy access to Telegram features
export function useTelegram(): UseTelegramReturn {
  const isReady = ref(false);
  const isTelegram = ref(false);

  // Reactive refs for theme
  const colorScheme = ref<string | undefined>(undefined);
  const themeParams = ref<ThemeParams | undefined>(undefined);

  // Raw values from Telegram WebApp
  let initData = '';
  let initDataUnsafe: WebAppInitData | undefined = undefined;
  let version: string | undefined = undefined;
  let platform: string | undefined = undefined;

  // Initialize Telegram WebApp
  onMounted(() => {
    const tg = window.Telegram?.WebApp;

    // Check for initData from URL (set by index.html) as fallback
    const initDataFromURL = window.__TELEGRAM_INIT_DATA__;
    const isTelegramMode = window.__IS_TELEGRAM_WEBAPP__ === true;

    if (tg) {
      // Full Telegram WebApp is available
      isTelegram.value = true;
      isReady.value = true;

      // Store values
      initData = tg.initData || '';
      initDataUnsafe = tg.initDataUnsafe as unknown as WebAppInitData;
      version = tg.version;
      platform = tg.platform;
      colorScheme.value = tg.colorScheme;
      themeParams.value = tg.themeParams;

      // Expand the WebApp to full height
      if (tg.expand) {
        tg.expand();
      }

      // Notify Telegram that the app is ready
      if (tg.ready) {
        tg.ready();
      }
    } else if (isTelegramMode && initDataFromURL) {
      // Telegram mode detected via URL but WebApp not loaded
      // This happens when testing with tgWebAppData in URL outside Telegram
      isTelegram.value = true;
      isReady.value = true;
      initData = initDataFromURL;
      // Note: initDataUnsafe won't be available without the WebApp object
    } else {
      // Not running in Telegram (dev mode)
      isTelegram.value = false;
      isReady.value = true;
    }
  });

  // Show alert popup
  const showAlert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg?.showAlert) {
        // Telegram WebApp showAlert returns a Promise, not using callback
        tg.showAlert(message).then(() => resolve());
      } else {
        alert(message);
        resolve();
      }
    });
  };

  // Show confirm popup
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg?.showConfirm) {
        // Telegram WebApp showConfirm returns a Promise<boolean>, not using callback
        tg.showConfirm(message).then((confirmed: boolean) => {
          resolve(confirmed);
        });
      } else {
        confirmPromise({ header: 'Подтверждение', message }).then((confirmed) => {
          resolve(confirmed);
        });
      }
    });
  };

  // Haptic feedback
  const hapticFeedback = (
    type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light',
  ) => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: {
      impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
      notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
    } } } }).Telegram?.WebApp;
    const haptic = tg?.HapticFeedback;

    if (!haptic) return;

    switch (type) {
      case 'light':
        haptic.impactOccurred('light');
        break;
      case 'medium':
        haptic.impactOccurred('medium');
        break;
      case 'heavy':
        haptic.impactOccurred('heavy');
        break;
      case 'success':
        haptic.notificationOccurred('success');
        break;
      case 'error':
        haptic.notificationOccurred('error');
        break;
    }
  };

  // Get user from init data
  const getUser = (): TelegramUser | undefined => {
    return initDataUnsafe?.user;
  };

  // Get init data string for backend verification
  // Falls back to window.__TELEGRAM_INIT_DATA__ if local initData is empty
  const getInitData = (): string | undefined => {
    return initData || window.__TELEGRAM_INIT_DATA__ || undefined;
  };

  return {
    // State
    isReady,
    isTelegram,

    // WebApp data
    initData,
    initDataUnsafe,
    version,
    platform,

    // Theme
    colorScheme,
    themeParams,

    // Methods
    showAlert,
    showConfirm,
    hapticFeedback,
    getUser,
    getInitData,
  };
}

// Return type for MainButton
interface UseMainButtonReturn {
  setMainButton: (params: {
    text: string;
    color?: string;
    textColor?: string;
    isVisible?: boolean;
    isActive?: boolean;
  }) => void;
  onMainButtonClick: (callback: () => void) => void;
  offMainButtonClick: (callback: () => void) => void;
  showMainButton: () => void;
  hideMainButton: () => void;
  setMainButtonProgress: (leaveActive?: boolean) => void;
  hideMainButtonProgress: () => void;
}

// Composable for Telegram MainButton
export function useMainButton(): UseMainButtonReturn {
  const getMainButton = () => {
    return window.Telegram?.WebApp?.MainButton;
  };

  const setMainButton = (params: {
    text: string;
    color?: string;
    textColor?: string;
    isVisible?: boolean;
    isActive?: boolean;
  }) => {
    const btn = getMainButton();
    if (!btn) return;

    if (params.text !== undefined) btn.setText(params.text);
    // MainButton uses direct property assignment, not setParams
    if (params.color !== undefined) btn.color = params.color;
    if (params.textColor !== undefined) btn.textColor = params.textColor;
    if (params.isVisible !== undefined) {
      if (params.isVisible) {
        btn.show();
      } else {
        btn.hide();
      }
    }
    if (params.isActive !== undefined) {
      if (params.isActive) {
        btn.enable();
      } else {
        btn.disable();
      }
    }
  };

  const onMainButtonClick = (callback: () => void) => {
    getMainButton()?.onClick(callback);
  };

  const offMainButtonClick = (callback: () => void) => {
    getMainButton()?.offClick(callback);
  };

  const showMainButton = () => {
    getMainButton()?.show();
  };

  const hideMainButton = () => {
    getMainButton()?.hide();
  };

  const setMainButtonProgress = (leaveActive = false) => {
    getMainButton()?.showProgress(leaveActive);
  };

  const hideMainButtonProgress = () => {
    getMainButton()?.hideProgress();
  };

  return {
    setMainButton,
    onMainButtonClick,
    offMainButtonClick,
    showMainButton,
    hideMainButton,
    setMainButtonProgress,
    hideMainButtonProgress,
  };
}

// Return type for BackButton
interface UseBackButtonReturn {
  showBackButton: () => void;
  hideBackButton: () => void;
  onBackButtonClick: (callback: () => void) => void;
  offBackButtonClick: (callback: () => void) => void;
}

// Composable for Telegram BackButton
export function useBackButton(): UseBackButtonReturn {
  const getBackButton = () => {
    return window.Telegram?.WebApp?.BackButton;
  };

  const showBackButton = () => {
    getBackButton()?.show();
  };

  const hideBackButton = () => {
    getBackButton()?.hide();
  };

  const onBackButtonClick = (callback: () => void) => {
    getBackButton()?.onClick(callback);
  };

  const offBackButtonClick = (callback: () => void) => {
    getBackButton()?.offClick(callback);
  };

  return {
    showBackButton,
    hideBackButton,
    onBackButtonClick,
    offBackButtonClick,
  };
}
