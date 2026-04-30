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
let refreshPromise: Promise<boolean> | null = null;
let lastRefreshTime = 0;
const REFRESH_GRACE_PERIOD_MS = 5000; // 5 seconds

/**
 * Perform token refresh using the refresh token
 */
async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.log('[API Client] No refresh token available');
    return false;
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
      return true;
    }

    return false;
  } catch (err: any) {
    console.error('[API Client] Token refresh failed:', err.response?.data?.message || err.message);
    return false;
  }
}

/**
 * Refresh access token with deduplication (promise lock)
 */
async function refreshAccessToken(): Promise<boolean> {
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
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // Refresh failed — clear tokens and let the request proceed (it will 401)
        clearAllTokens();
      }
      // Use the newly refreshed token (or old one if refresh failed)
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

    // Handle 500+ server errors
    if (error.response && error.response.status >= 500) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/error/server-error') {
        window.location.href = '/error/server-error';
      }
      return Promise.reject(normalized || error);
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

        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the original request with the new token
          const newToken = getAuthToken();
          if (newToken && originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        }

        // Refresh failed — clear everything and redirect
        console.log('[API Client] Silent refresh failed, redirecting to login');
        clearAllTokens();
        if (window.location.pathname !== '/login') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    }

    return Promise.reject(normalized || error);
  },
);

export default apiClient;
