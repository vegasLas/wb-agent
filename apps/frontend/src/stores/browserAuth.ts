import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core';
import apiClient, { setAuthToken } from '../api/client';

export interface BrowserUser {
  id: number;
  login: string;
  name: string;
}

/**
 * Browser authentication store for JWT-based auth
 * Used when the app is accessed from a regular browser
 */
export const useBrowserAuthStore = defineStore('browserAuth', () => {
  const router = useRouter();

  // Use VueUse useStorage for automatic localStorage sync
  const token = useStorage<string | null>('auth_token', null);
  const user = useStorage<BrowserUser | null>('auth_user', null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

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
        user.value = response.data.user;
        setAuthToken(response.data.token);

        // Fetch full user data (accounts, etc.) and update storage
        await fetchCurrentUser();

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
      user.value = null;
      setAuthToken(null);
      await router.push('/login');
    }
  }

  /**
   * Fetch current user data from API
   */
  async function fetchCurrentUser(): Promise<boolean> {
    try {
      const response = await apiClient.get('/user'); // Fixed: was '/user/me'

      if (response.data) {
        // Update user with fresh data - automatically syncs to localStorage
        user.value = {
          id: response.data.id,
          login: response.data.login || response.data.username || '',
          name: response.data.name,
        };
        return true;
      }

      return false;
    } catch (err: any) {
      // Only clear auth on 401 Unauthorized
      if (err?.response?.status === 401) {
        token.value = null;
        user.value = null;
        setAuthToken(null);
      }
      return false;
    }
  }

  /**
   * Initialize auth state from storage
   */
  async function initAuth(): Promise<boolean> {
    if (!token.value) {
      user.value = null;
      setAuthToken(null);
      return false;
    }

    // Ensure token is set in API client for subsequent requests
    setAuthToken(token.value);
    console.log('[BrowserAuth] Token restored from storage, validating...');

    // Try to fetch fresh user data
    const isValid = await fetchCurrentUser();

    // Return true if we have user (either from storage or API)
    const hasAuth = isValid || !!user.value;
    console.log('[BrowserAuth] initAuth result:', { isValid, hasUser: !!user.value, hasAuth });
    return hasAuth;
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
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Getters
    isAuthenticated,

    // Actions
    login,
    logout,
    fetchCurrentUser,
    initAuth,
    refreshToken,
    clearError,
  };
});
