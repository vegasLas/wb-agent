import { isTelegramMode } from './useTelegramSafe';

export { isTelegramMode, isBrowserMode } from './useTelegramSafe';

/**
 * Safe useMiniApp - only close() is used
 */
export function useMiniApp() {
  if (isTelegramMode()) {
    try {
      const vueTg = require('vue-tg');
      return vueTg.useMiniApp();
    } catch {
      // Fall through to mock
    }
  }
  
  // Browser mock - only close() is implemented
  return {
    close: () => window.history.length > 1 ? window.history.back() : window.close(),
  };
}

/**
 * Safe useWebAppPopup - uses native dialogs in browser
 */
export function useWebAppPopup() {
  if (isTelegramMode()) {
    try {
      const vueTg = require('vue-tg');
      return vueTg.useWebAppPopup();
    } catch {
      // Fall through to mock
    }
  }
  
  // Browser fallback
  return {
    showPopup: async (params: { title?: string; message: string }) => {
      alert(params.title ? `${params.title}\n\n${params.message}` : params.message);
    },
    showAlert: async (message: string) => alert(message),
    showConfirm: async (message: string) => confirm(message),
    onPopupClosed: () => ({ off: () => {} }),
  };
}
