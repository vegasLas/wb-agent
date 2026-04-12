import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { useUserStore } from './user';
import { useBrowserAuthStore } from './browserAuth';
import { closeWebApp } from '../utils/telegramWebApp';

export type AuthMode = 'telegram' | 'browser';

/**
 * Unified authentication store
 * Handles both Telegram and Browser authentication modes transparently
 */
export const useUnifiedAuthStore = defineStore('unifiedAuth', () => {
  // Determine auth mode from window global (set in index.html)
  const authMode = ref<AuthMode>(typeof window !== 'undefined' ? window.__AUTH_MODE__ || 'browser' : 'browser');
  
  // Use appropriate store based on mode
  const telegramStore = useUserStore();
  const browserStore = useBrowserAuthStore();

  // Computed properties for mode checking
  const isTelegramMode = computed(() => authMode.value === 'telegram');
  const isBrowserMode = computed(() => authMode.value === 'browser');
  
  /**
   * Check if user is authenticated
   * Works for both Telegram and Browser modes
   */
  const isAuthenticated = computed(() => {
    return isTelegramMode.value 
      ? telegramStore.isAuthenticated 
      : browserStore.isAuthenticated;
  });

  /**
   * Get current user
   * Works for both Telegram and Browser modes
   */
  const currentUser = computed(() => {
    if (isTelegramMode.value) {
      const user = telegramStore.user;
      return {
        id: user.id,
        name: user.name,
        login: user.username || '',
        authType: 'telegram' as const,
      };
    } else {
      const user = browserStore.user;
      return user ? {
        id: user.id,
        name: user.name,
        login: user.login,
        authType: 'browser' as const,
      } : null;
    }
  });

  /**
   * Check if subscription is active
   */
  const isSubscriptionActive = computed(() => {
    if (isTelegramMode.value) {
      return telegramStore.subscriptionActive;
    }
    // For browser mode, this is checked server-side
    // We assume authenticated browser users have valid subscriptions
    return browserStore.isAuthenticated;
  });

  /**
   * Initialize authentication
   * Called once when app starts
   */
  async function initialize(): Promise<void> {
    if (isTelegramMode.value) {
      // Telegram mode - fetch user data
      try {
        await telegramStore.fetchUser();
      } catch (error) {
        console.error('[UnifiedAuth] Failed to initialize Telegram auth:', error);
        throw error;
      }
    } else {
      // Browser mode - init JWT auth
      await browserStore.initAuth();
    }
  }

  /**
   * Logout user
   */
  async function logout(): Promise<void> {
    if (isTelegramMode.value) {
      telegramStore.reset?.();
      // Close Telegram WebApp if available
      closeWebApp();
    } else {
      await browserStore.logout();
    }
  }

  /**
   * Refresh authentication
   * For Telegram: re-fetch user data
   * For Browser: refresh JWT token
   */
  async function refreshAuth(): Promise<boolean> {
    if (isTelegramMode.value) {
      try {
        await telegramStore.fetchUser();
        return true;
      } catch {
        return false;
      }
    } else {
      return browserStore.refreshToken();
    }
  }

  return {
    // State (readonly)
    authMode: readonly(authMode),
    
    // Getters
    isTelegramMode,
    isBrowserMode,
    isAuthenticated,
    currentUser,
    isSubscriptionActive,
    
    // Actions
    initialize,
    logout,
    refreshAuth,
  };
});
