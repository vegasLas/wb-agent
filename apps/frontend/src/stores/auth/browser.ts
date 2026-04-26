import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core';
import apiClient, { setAuthToken } from '@/api/client';
import { useUserStore } from '@/stores/user';
import { resetAppState } from '@/router';

// Storage keys
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'auth_token_expires_at';
const LEGACY_TOKEN_KEY = 'auth_token'; // For migration cleanup

/**
 * Browser authentication store for JWT-based auth
 * Uses dual tokens: short-lived access token + long-lived refresh token
 */
export const useBrowserAuthStore = defineStore('browserAuth', () => {
  const router = useRouter();

  // Use VueUse useStorage for automatic localStorage sync
  const accessToken = useStorage<string | null>(ACCESS_TOKEN_KEY, null);
  const refreshToken = useStorage<string | null>(REFRESH_TOKEN_KEY, null);
  const tokenExpiresAt = useStorage<number | null>(TOKEN_EXPIRES_AT_KEY, null);

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value);

  /**
   * Check if access token is expiring soon (default: within 60 seconds)
   */
  function isTokenExpiringSoon(thresholdMs = 60000): boolean {
    if (!tokenExpiresAt.value) return true;
    return Date.now() >= tokenExpiresAt.value - thresholdMs;
  }

  /**
   * Check if access token is already expired
   */
  function isTokenExpired(): boolean {
    if (!tokenExpiresAt.value) return true;
    return Date.now() >= tokenExpiresAt.value;
  }

  /**
   * Login with legacy bot-generated credentials
   */
  async function login(login: string, password: string): Promise<boolean> {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiClient.post('/auth/login', {
        login,
        password,
      });

      return handleAuthResponse(response.data);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Ошибка входа';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Login with email + password
   */
  async function emailLogin(email: string, password: string): Promise<boolean> {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiClient.post('/auth/email-login', {
        email,
        password,
      });

      return handleAuthResponse(response.data);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Ошибка входа';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Handle successful auth response (stores tokens & fetches user)
   */
  async function handleAuthResponse(data: any): Promise<boolean> {
    if (!data.success) return false;

    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    } = data;

    // Store tokens
    accessToken.value = newAccessToken;
    refreshToken.value = newRefreshToken;
    tokenExpiresAt.value = Date.now() + expiresIn * 1000;

    // Set access token in API client
    setAuthToken(newAccessToken);

    // Clean up legacy token
    localStorage.removeItem(LEGACY_TOKEN_KEY);

    // Fetch full user data from userStore
    try {
      const userStore = useUserStore();
      await userStore.fetchUser();
      console.log('[BrowserAuth] UserStore populated after login');
    } catch (error) {
      console.error('[BrowserAuth] Failed to populate userStore after login:', error);
    }

    return true;
  }

  /**
   * Logout and clear session
   */
  async function logout(): Promise<void> {
    try {
      // Notify backend about logout so refresh token can be revoked
      if (refreshToken.value) {
        await apiClient
          .post('/auth/logout', { refreshToken: refreshToken.value })
          .catch(() => {
            // Ignore errors during logout
          });
      }
    } finally {
      // Clear all token storage
      accessToken.value = null;
      refreshToken.value = null;
      tokenExpiresAt.value = null;
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
   * Refresh access token using refresh token
   */
  async function doRefreshToken(): Promise<boolean> {
    if (!refreshToken.value) {
      console.log('[BrowserAuth] No refresh token available');
      return false;
    }

    try {
      const response = await apiClient.post('/auth/refresh', {
        refreshToken: refreshToken.value,
      });

      if (response.data.success) {
        const {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn,
        } = response.data;

        accessToken.value = newAccessToken;
        refreshToken.value = newRefreshToken;
        tokenExpiresAt.value = Date.now() + expiresIn * 1000;
        setAuthToken(newAccessToken);

        console.log('[BrowserAuth] Tokens refreshed successfully');
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[BrowserAuth] Token refresh failed:', err.response?.data?.message || err.message);

      // If refresh fails with 401, clear everything — token is revoked or expired
      if (err.response?.status === 401) {
        accessToken.value = null;
        refreshToken.value = null;
        tokenExpiresAt.value = null;
        setAuthToken(null);
      }

      return false;
    }
  }

  /**
   * Initialize auth state from storage
   * @param skipUserFetch If true, skip fetching user data (use when already fetched)
   */
  async function initAuth(skipUserFetch = false): Promise<boolean> {
    // Migrate legacy single token if present
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken && !accessToken.value) {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      console.log('[BrowserAuth] Cleared legacy auth_token');
    }

    if (!accessToken.value || !refreshToken.value) {
      setAuthToken(null);
      return false;
    }

    // Ensure access token is set in API client for subsequent requests
    setAuthToken(accessToken.value);
    console.log('[BrowserAuth] Tokens restored from storage');

    // If access token is already expired, try to refresh immediately
    if (isTokenExpired()) {
      console.log('[BrowserAuth] Access token expired, attempting refresh...');
      const refreshed = await doRefreshToken();
      if (!refreshed) {
        console.log('[BrowserAuth] Refresh failed, clearing auth');
        resetAppState();
        return false;
      }
    }

    // If we're skipping fetch, just return true (token exists and is valid)
    if (skipUserFetch) {
      return true;
    }

    // Fetch full user data from userStore
    try {
      const userStore = useUserStore();
      await userStore.fetchUser();
      console.log('[BrowserAuth] UserStore populated with full user data');
      return true;
    } catch (error: any) {
      console.error('[BrowserAuth] Failed to fetch user data:', error);

      // On 401, try one refresh then retry
      if (error?.response?.status === 401) {
        const refreshed = await doRefreshToken();
        if (refreshed) {
          try {
            await userStore.fetchUser();
            return true;
          } catch {
            // Second attempt failed
          }
        }

        accessToken.value = null;
        refreshToken.value = null;
        tokenExpiresAt.value = null;
        setAuthToken(null);
        resetAppState();
      }
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
    // State (readonly)
    accessToken: readonly(accessToken),
    refreshToken: readonly(refreshToken),
    tokenExpiresAt: readonly(tokenExpiresAt),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Getters
    isAuthenticated,
    isTokenExpiringSoon,
    isTokenExpired,

    // Actions
    login,
    emailLogin,
    logout,
    doRefreshToken,
    initAuth,
    clearError,
  };
});
