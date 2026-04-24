import type { AxiosRequestConfig } from 'axios';
import apiClient from './client';

export { apiClient };

// Domain exports
export * from './auth';
export * from './accounts';
export * from './user';
export * from './autobooking';
export * from './triggers';
export * from './reschedules';
export * from './warehouses';
export * from './supplies';
export * from './drafts';
export * from './reports';
export * from './payments';
export * from './promotions';
export * from './adverts';
export * from './suppliers';
export * from './coefficients';
export * from './mpstats';
export * from './content-cards';
export * from './feedbacks';
export * from './ai';

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
