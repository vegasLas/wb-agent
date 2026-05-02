import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { normalizeAuthError } from './auth/errors';
import { toastHelpers } from '../utils/ui/toast';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'auth_token_expires_at';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from storage
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get token expiry timestamp from storage
 */
function getTokenExpiresAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
  return raw ? parseInt(raw, 10) : null;
}

/**
 * Check if access token is expiring soon (default: within 60 seconds)
 */
function isTokenExpiringSoon(thresholdMs = 60000): boolean {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - thresholdMs;
}

/**
 * Set or remove the auth token
 */
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;

  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/**
 * Clear all browser auth tokens from storage
 */
function clearAllTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
}

// Refresh promise lock to prevent concurrent refresh requests
let refreshPromise: Promise<RefreshResult> | null = null;
let lastRefreshTime = 0;
const REFRESH_GRACE_PERIOD_MS = 5000; // 5 seconds

export interface RefreshResult {
  success: boolean;
  isAuthError: boolean;
}

/**
 * Perform token refresh using the refresh token
 */
async function performRefresh(): Promise<RefreshResult> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.log('[API Client] No refresh token available');
    return { success: false, isAuthError: true };
  }

  try {
    // Use a fresh axios instance to avoid interceptors
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1'}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data?.success) {
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));

      lastRefreshTime = Date.now();
      console.log('[API Client] Tokens refreshed successfully');
      return { success: true, isAuthError: false };
    }

    return { success: false, isAuthError: false };
  } catch (err: any) {
    const status = err.response?.status as number | undefined;
    const errorMessage = err.response?.data?.message || err.message;
    const errorCode = err.response?.data?.code as string | undefined;
    console.error('[API Client] Token refresh failed:', errorMessage, errorCode);

    // Race-condition recovery: if the token was revoked or expired, another tab
    // or request may have already rotated it and stored a new one. If the
    // refresh token in storage is now different, trust it and treat as success.
    if (errorCode === 'TOKEN_REVOKED' || errorCode === 'TOKEN_EXPIRED') {
      const currentRefreshToken = getRefreshToken();
      if (currentRefreshToken && currentRefreshToken !== refreshToken) {
        console.log(
          '[API Client] Refresh token changed in storage, assuming another tab/request already refreshed'
        );
        lastRefreshTime = Date.now();
        return { success: true, isAuthError: false };
      }
    }

    // 401 from the server means the session is genuinely dead.
    // Anything else (network error, 500, timeout) is transient — keep tokens
    // so the user isn't logged out because of a flaky connection.
    const isAuthError = status === 401;
    return { success: false, isAuthError };
  }
}

/**
 * Refresh access token with deduplication (promise lock)
 */
export async function refreshAccessToken(): Promise<RefreshResult> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start a new refresh and store the promise
  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Create axios instance with base URL
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const token = getAuthToken();

    // Check if token is expiring soon and refresh proactively
    // Skip refresh for the refresh endpoint itself to avoid loops
    if (config.url !== '/auth/refresh' && isTokenExpiringSoon()) {
      const result = await refreshAccessToken();
      // Only clear tokens if the server explicitly rejected the session.
      // Network errors or 5xx should not log the user out.
      if (result.isAuthError) {
        clearAllTokens();
      }
      // Use the newly refreshed token (or existing one if refresh failed)
      const newToken = getAuthToken();
      if (newToken && config.headers) {
        config.headers['Authorization'] = `Bearer ${newToken}`;
      }
      return config;
    }

    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.log(
        '[API Client] Request without auth:',
        config.url,
      );
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    console.error(
      '[API Client] Error:',
      error.config?.url,
      'status:',
      error.response?.status,
      'message:',
      error.message,
    );

    const normalized = normalizeAuthError(error);

    // Handle specific error codes before generic 401 logic
    if (normalized) {
      if (normalized.code === 'TECHNICAL_MODE') {
        toastHelpers.error('Технические работы', normalized.message);
        if (typeof window !== 'undefined' && window.location.pathname !== '/error/maintenance') {
          window.location.href = '/error/maintenance';
        }
        return Promise.reject(normalized);
      }

      if (normalized.code === 'SESSION_EXPIRED') {
        toastHelpers.error('Сессия истекла', normalized.message);
        if (typeof window !== 'undefined' && window.location.pathname !== '/error/session-expired') {
          const redirect = encodeURIComponent(window.location.pathname);
          window.location.href = `/error/session-expired?redirect=${redirect}`;
        }
        return Promise.reject(normalized);
      }

      if (normalized.code === 'RATE_LIMITED') {
        toastHelpers.warn('Слишком много попыток', 'Пожалуйста, подождите немного перед следующей попыткой.');
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // If this was the refresh endpoint itself, refresh token is dead — redirect to login
      if (originalRequest?.url === '/auth/refresh') {
        console.log('[API Client] Refresh token invalid, redirecting to login');
        clearAllTokens();
        if (window.location.pathname !== '/login') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(normalized || error);
      }

      // If we haven't already retried this request, attempt one silent refresh
      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        // If a refresh just succeeded (within grace period), retry with current token
        // instead of triggering another refresh. This prevents race conditions when
        // multiple concurrent requests fail after a backend redeploy changes JWT_SECRET.
        if (Date.now() - lastRefreshTime < REFRESH_GRACE_PERIOD_MS) {
          const newToken = getAuthToken();
          if (newToken && originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            console.log('[API Client] Retrying with recently refreshed token');
            return apiClient(originalRequest);
          }
        }

        const result = await refreshAccessToken();
        if (result.success) {
          // Retry the original request with the new token
          const newToken = getAuthToken();
          if (newToken && originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        }

        // If the server rejected the session, clear everything and redirect.
        // For transient failures (network, 5xx) keep tokens and reject so the
        // caller can decide whether to retry.
        if (result.isAuthError) {
          console.log('[API Client] Silent refresh failed, redirecting to login');
          clearAllTokens();
          if (window.location.pathname !== '/login') {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }
        }
      }
    }

    return Promise.reject(normalized || error);
  },
);

export default apiClient;
