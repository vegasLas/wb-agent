import apiClient from './client';
import type { SupplierInfo } from '../types';
import { supplierApiKeysAPI } from './supplier-api-keys';
import type { ApiKeyStatus } from './supplier-api-keys';

export interface GoodBalance {
  goodName: string;
  brand: string;
  subject: string;
  supplierArticle: string;
  quantity: number;
}

export interface WarehouseBalance {
  warehouseId: number;
  goods: GoodBalance[];
}

export const supplierAPI = {
  /**
   * GET /api/v1/suppliers/info
   * Get supplier info for the selected account
   */
  async fetchSupplierInfo(accountId?: string): Promise<SupplierInfo> {
    const params: Record<string, string> = {};
    if (accountId) params.accountId = accountId;

    const response = await apiClient.get<SupplierInfo>('/suppliers/info', {
      params,
    });
    return response.data;
  },

  /**
   * GET /api/v1/suppliers/balances
   * Get warehouse balances for the selected account
   */
  async fetchWarehouseBalances(
    accountId?: string,
  ): Promise<WarehouseBalance[]> {
    const params: Record<string, string> = {};
    if (accountId) params.accountId = accountId;

    const response = await apiClient.get<WarehouseBalance[]>(
      '/suppliers/balances',
      { params },
    );
    return response.data || [];
  },

  /**
   * GET /api/v1/supplier-api-keys
   * Check API key status
   */
  async checkApiKeyStatus(): Promise<ApiKeyStatus> {
    return supplierApiKeysAPI.getApiKeyStatus();
  },

  /**
   * POST /api/v1/supplier-api-keys
   * Update supplier API key
   */
  async updateSupplierApiKey(apiKey: string): Promise<{
    success: boolean;
    message: string;
    data: {
      isExistAPIKey: boolean;
      isActive?: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return supplierApiKeysAPI.createOrUpdateApiKey(apiKey);
  },

  /**
   * DELETE /api/v1/supplier-api-keys
   * Delete supplier API key
   */
  async deleteSupplierApiKey(): Promise<{ success: boolean; message: string }> {
    return supplierApiKeysAPI.deleteApiKey();
  },
};
