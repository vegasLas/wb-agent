import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { getInitData } from '../utils/telegramWebApp';

// Token storage key for browser auth
const AUTH_TOKEN_KEY = 'auth_token';

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

  // Always read fresh from localStorage
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token;
}

/**
 * Set or remove the auth token (for browser mode)
 */
export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
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
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAuthToken();
    const mode = isTelegramMode() ? 'telegram' : 'browser';

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
  (error: AxiosError) => {
    console.error(
      '[API Client] Error:',
      error.config?.url,
      'status:',
      error.response?.status,
      'message:',
      error.message,
    );

    if (error.response?.status === 401) {
      if (!isTelegramMode()) {
        console.log(
          '[API Client] 401 Unauthorized, clearing token and redirecting to login',
        );
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (window.location.pathname !== '/login') {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
