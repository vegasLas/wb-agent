import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { useRouter } from 'vue-router';
import { useStorage } from '@vueuse/core';
import { setAuthToken } from '@/api/client';
import { useUserStore } from '@/stores/user';
import { resetAppState } from '@/router';
import { login, refresh as refreshEndpoint, logout as logoutEndpoint } from '@/api/auth/endpoints';
import { AuthAPIError, normalizeAuthError } from '@/api/auth/errors';
import { toastHelpers } from '@/utils/ui/toast';

// Storage keys
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'auth_token_expires_at';

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
  const error = ref<AuthAPIError | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value);
  const errorMessage = computed(() => error.value?.message ?? null);
  const errorCode = computed(() => error.value?.code ?? null);

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
   * Login with email + password
   */
  async function emailLogin(email: string, password: string): Promise<boolean> {
    try {
      isLoading.value = true;
      error.value = null;

      const data = await login(email, password);
      const result = await handleAuthResponse(data);

      if (result) {
        toastHelpers.success('Вход выполнен', `Добро пожаловать${data.user.name ? ', ' + data.user.name : ''}!`);
      }

      return result;
    } catch (err: unknown) {
      const normalized = normalizeAuthError(err);
      error.value = normalized ?? new AuthAPIError(500, 'Ошибка входа', 'INTERNAL_ERROR');
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Handle successful auth response (stores tokens & fetches user)
   */
  async function handleAuthResponse(data: {
    success: true;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }): Promise<boolean> {
    const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn } = data;

    // Store tokens
    accessToken.value = newAccessToken;
    refreshToken.value = newRefreshToken;
    tokenExpiresAt.value = Date.now() + expiresIn * 1000;

    // Set access token in API client
    setAuthToken(newAccessToken);

    // Fetch full user data from userStore
    try {
      const userStore = useUserStore();
      await userStore.fetchUser();
      console.log('[BrowserAuth] UserStore populated after login');
    } catch (fetchError) {
      console.error('[BrowserAuth] Failed to populate userStore after login:', fetchError);
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
        await logoutEndpoint(refreshToken.value).catch(() => {
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

      toastHelpers.info('Выход выполнен', 'Вы успешно вышли из аккаунта.');
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
      const data = await refreshEndpoint(refreshToken.value);

      if (data.success) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn } = data;

        accessToken.value = newAccessToken;
        refreshToken.value = newRefreshToken;
        tokenExpiresAt.value = Date.now() + expiresIn * 1000;
        setAuthToken(newAccessToken);

        console.log('[BrowserAuth] Tokens refreshed successfully');
        return true;
      }

      return false;
    } catch (err: unknown) {
      const normalized = normalizeAuthError(err);
      console.error(
        '[BrowserAuth] Token refresh failed:',
        normalized?.message || (err as Error)?.message,
      );

      // If refresh fails with 401, clear everything — token is revoked or expired
      if (normalized?.status === 401) {
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
    } catch (error: unknown) {
      console.error('[BrowserAuth] Failed to fetch user data:', error);

      const axiosError = error as { response?: { status?: number } } | undefined;
      // On 401, the axios response interceptor has already attempted a silent refresh
      // and retried the request. If we reach here, the refresh failed (e.g. expired
      // or revoked refresh token). Do not attempt another refresh — just clear state.
      if (axiosError?.response?.status === 401) {
        console.log('[BrowserAuth] Silent refresh already failed by interceptor, clearing auth');
        accessToken.value = null;
        refreshToken.value = null;
        tokenExpiresAt.value = null;
        setAuthToken(null);
        resetAppState();
        return false;
      }

      // On 500, re-throw so the router guard can show the maintenance page
      if (axiosError?.response?.status === 500) {
        throw error;
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
    errorMessage,
    errorCode,

    // Actions
    emailLogin,
    logout,
    doRefreshToken,
    initAuth,
    clearError,
  };
});
