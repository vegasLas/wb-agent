import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core';
import apiClient, { setAuthToken } from '@/api/client';
import { useUserStore } from '@/stores/user';
import { resetAppState } from '@/router';

/**
 * Browser authentication store for JWT-based auth
 * Used when the app is accessed from a regular browser
 */
export const useBrowserAuthStore = defineStore('browserAuth', () => {
  const router = useRouter();

  // Use VueUse useStorage for automatic localStorage sync
  const token = useStorage<string | null>('auth_token', null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  /**
   * Login with credentials
   */
  async function login(login: string, password: string): Promise<boolean> {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiClient.post('/auth/login', {
        login,
        password,
      });

      if (response.data.success) {
        // VueUse useStorage automatically syncs to localStorage
        token.value = response.data.token;
        setAuthToken(response.data.token);

        // Fetch full user data from userStore (includes subscription, accounts, etc.)
        try {
          const userStore = useUserStore();
          await userStore.fetchUser();
          console.log('[BrowserAuth] UserStore populated after login');
        } catch (error) {
          console.error('[BrowserAuth] Failed to populate userStore after login:', error);
          // Still return true since login succeeded, but user data fetch failed
        }

        return true;
      }

      return false;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Ошибка входа';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Logout and clear session
   */
  async function logout(): Promise<void> {
    try {
      // Optionally notify backend about logout
      if (token.value) {
        await apiClient.post('/auth/logout').catch(() => {
          // Ignore errors during logout
        });
      }
    } finally {
      // VueUse useStorage automatically clears localStorage
      token.value = null;
      setAuthToken(null);
      
      // Reset userStore as well
      const userStore = useUserStore();
      userStore.reset();
      
      // Reset router auth state to allow re-initialization on next login
      resetAppState();
      
      await router.push('/login');
    }
  }

  /**
   * Initialize auth state from storage
   * @param skipUserFetch If true, skip fetching user data (use when already fetched)
   */
  async function initAuth(skipUserFetch = false): Promise<boolean> {
    if (!token.value) {
      setAuthToken(null);
      return false;
    }

    // Ensure token is set in API client for subsequent requests
    setAuthToken(token.value);
    console.log('[BrowserAuth] Token restored from storage, validating...');

    // If we're skipping fetch, just return true (token exists)
    if (skipUserFetch) {
      return true;
    }

    // Fetch full user data from userStore (includes subscription, accounts, etc.)
    try {
      const userStore = useUserStore();
      await userStore.fetchUser();
      console.log('[BrowserAuth] UserStore populated with full user data');
      return true;
    } catch (error: any) {
      console.error('[BrowserAuth] Failed to fetch user data:', error);
      
      // On 401, clear auth
      if (error?.response?.status === 401) {
        token.value = null;
        setAuthToken(null);
        resetAppState();
      }
      return false;
    }
  }

  /**
   * Refresh JWT token
   */
  async function refreshToken(): Promise<boolean> {
    try {
      const response = await apiClient.post('/auth/refresh');

      if (response.data.success) {
        token.value = response.data.token; // Auto-syncs to localStorage
        setAuthToken(response.data.token);
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  return {
    // State (readonly) - useStorage refs are already reactive
    token: readonly(token),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Getters
    isAuthenticated,

    // Actions
    login,
    logout,
    initAuth,
    refreshToken,
    clearError,
  };
});
