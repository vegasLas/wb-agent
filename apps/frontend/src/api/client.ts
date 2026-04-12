import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { isTelegramMode } from '../composables/useTelegramSafe';

// Token storage key for browser auth
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Get authentication token based on current auth mode
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  if (isTelegramMode()) {
    return window.__TELEGRAM_INIT_DATA__ || null;
  }
  
  return localStorage.getItem(AUTH_TOKEN_KEY);
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
    
    if (token && config.headers) {
      if (isTelegramMode()) {
        config.headers['x-init-data'] = token;
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (!isTelegramMode()) {
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
