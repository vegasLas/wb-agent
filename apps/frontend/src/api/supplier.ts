import apiClient from './client';
import type { SupplierInfo, ApiKeyStatus } from '../types';

export const supplierAPI = {
  async fetchSupplierInfo(): Promise<SupplierInfo> {
    const response = await apiClient.get('/supplier');
    return response.data.data;
  },

  async updateSupplierApiKey(apiKey: string): Promise<void> {
    await apiClient.patch('/supplier/api-key', { apiKey });
  },

  async checkApiKeyStatus(): Promise<ApiKeyStatus> {
    const response = await apiClient.get('/supplier/api-key/status');
    return response.data.data;
  },
};
