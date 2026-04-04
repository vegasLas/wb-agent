import type { AxiosRequestConfig } from 'axios';
import apiClient from './client';

// Re-export the client for direct use
export { apiClient };

// Export all API modules
export * from './auth';
export * from './user';
export * from './accounts';
export * from './supplier-api-keys';
export * from './supplier';
export * from './autobooking';
export * from './warehouses';
export * from './coefficients';
export * from './drafts';
export * from './supplies';
export * from './supplyDetails';
export * from './triggers';
export * from './reschedules';
export * from './reports';
export * from './payments';
export * from './promotions';

// Generic API methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};
