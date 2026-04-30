import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useBrowserAuthStore } from './browser';

/**
 * Unified authentication store (browser-only)
 */
export const useUnifiedAuthStore = defineStore('unifiedAuth', () => {
  const browserStore = useBrowserAuthStore();

  const isAuthenticated = computed(() => browserStore.isAuthenticated);
  const isSubscriptionActive = computed(() => browserStore.subscriptionActive);

  async function initialize(): Promise<void> {
    await browserStore.initAuth();
  }

  async function logout(): Promise<void> {
    await browserStore.logout();
  }

  async function refreshAuth(): Promise<boolean> {
    return browserStore.refreshToken();
  }

  return {
    isAuthenticated,
    isSubscriptionActive,
    initialize,
    logout,
    refreshAuth,
  };
});
