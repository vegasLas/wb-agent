import apiClient from '../client';
import type {
  SupplierInfo,
  WarehouseBalance,
  ApiKeyStatus,
  CreateApiKeyResponse,
} from './types';

/**
 * Suppliers API
 * Merged from supplier.ts and supplier-api-keys.ts
 */

// Private helper for API key operations
const supplierApiKeysAPI = {
  /**
   * GET /api/v1/supplier-api-keys
   * Get user's API key info
   */
  async getApiKeyStatus(): Promise<ApiKeyStatus> {
    const response = await apiClient.get<ApiKeyStatus>('/supplier-api-keys');
    return response.data;
  },

  /**
   * POST /api/v1/supplier-api-keys
   * Create or update API key
   */
  async createOrUpdateApiKey(apiKey: string): Promise<CreateApiKeyResponse> {
    const response = await apiClient.post<CreateApiKeyResponse>(
      '/supplier-api-keys',
      { apiKey },
    );
    return response.data;
  },

  /**
   * DELETE /api/v1/supplier-api-keys
   * Delete API key
   */
  async deleteApiKey(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>('/supplier-api-keys');
    return response.data;
  },
};

export const suppliersAPI = {
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
