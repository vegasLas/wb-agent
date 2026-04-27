import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { getInitData } from '../utils/telegram';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'auth_token_expires_at';

/**
 * Check if current mode is Telegram
 * Uses window.__AUTH_MODE__ or checks localStorage for cached initData
 */
function isTelegramMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Check global flag first
  if (window.__AUTH_MODE__ === 'telegram') return true;

  // Fallback: check if we have cached initData in localStorage
  // This handles sub-route reloads where URL hash is lost
  return getInitData() !== null;
}

/**
 * Get authentication token based on current auth mode
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  if (isTelegramMode()) {
    // Use utility that checks window global and localStorage
    return getInitData();
  }

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
 * Set or remove the auth token (for browser mode)
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
    const mode = isTelegramMode() ? 'telegram' : 'browser';

    // For browser mode, check if token is expiring soon and refresh proactively
    // Skip refresh for the refresh endpoint itself to avoid loops
    if (!isTelegramMode() && config.url !== '/auth/refresh' && isTokenExpiringSoon()) {
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
      if (isTelegramMode()) {
        config.headers['x-init-data'] = token;
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      console.log(
        '[API Client] Request without auth:',
        config.url,
        'mode:',
        mode,
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

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // In Telegram mode, just propagate the error
      if (isTelegramMode()) {
        return Promise.reject(error);
      }

      // If this was the refresh endpoint itself, refresh token is dead — redirect to login
      if (originalRequest?.url === '/auth/refresh') {
        console.log('[API Client] Refresh token invalid, redirecting to login');
        clearAllTokens();
        if (window.location.pathname !== '/login') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(error);
      }

      // If we haven't already retried this request, attempt one silent refresh
      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

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

    return Promise.reject(error);
  },
);

export default apiClient;
