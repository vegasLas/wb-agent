import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { useMiniApp } from 'vue-tg';

/**
 * Get Telegram initData from WebApp using vue-tg
 */
function getInitData(): string {
  try {
    const miniApp = useMiniApp();
    return miniApp.initData || '';
  } catch {
    // Fallback if not in Telegram WebApp context
    return '';
  }
}

// Create axios instance with base URL
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Telegram initData
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Get initData from Telegram WebApp
    const initData = getInitData();
    console.log(initData);
    if (initData && config.headers) {
      config.headers['x-init-data'] = initData;
    }

    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  (error: AxiosError): Promise<AxiosError | AxiosResponse> => {
    if (error.response) {
      // Handle specific error status codes
      const status = error.response.status;

      switch (status) {
        case 401:
          // Unauthorized - clear token but don't reload
          // This prevents recursive reloads when API calls fail during app init
          localStorage.removeItem('auth_token');
          console.error('Unauthorized - authentication required');
          break;
        case 403:
          // Forbidden
          console.error('Access denied');
          break;
        case 404:
          // Not found
          console.error('Resource not found');
          break;
        case 500:
          // Server error
          console.error('Server error');
          break;
        default:
          console.error('API error:', error.message);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - no response received');
    } else {
      // Request setup error
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
