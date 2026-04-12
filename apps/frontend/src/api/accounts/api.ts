import apiClient from '../client';
import type {
  AccountsResponse,
  AccountResponse,
  UpdateSupplierResponse,
  SyncSuppliersResponse,
} from './types';

export const accountsAPI = {
  /**
   * GET /api/v1/accounts
   * Get all accounts for the current user
   */
  async getAccounts(): Promise<AccountsResponse> {
    const response = await apiClient.get<AccountsResponse>('/accounts');
    return response.data;
  },

  /**
   * GET /api/v1/accounts/:id
   * Get a single account by ID
   */
  async getAccount(id: string): Promise<AccountResponse> {
    const response = await apiClient.get<AccountResponse>(`/accounts/${id}`);
    return response.data;
  },

  /**
   * DELETE /api/v1/accounts/:id
   * Delete an account
   */
  async deleteAccount(
    accountId: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/accounts/${accountId}`);
    return response.data;
  },

  /**
   * PATCH /api/v1/accounts/supplier
   * Update selected supplier for an account
   */
  async updateAccountSupplier(
    accountId: string,
    supplierId: string,
  ): Promise<UpdateSupplierResponse> {
    const response = await apiClient.patch<UpdateSupplierResponse>(
      '/accounts/supplier',
      {
        accountId,
        supplierId,
      },
    );
    return response.data;
  },

  /**
   * GET /api/v1/accounts/:accountId/suppliers
   * Sync and get suppliers for an account
   */
  async syncAccountSuppliers(
    accountId: string,
  ): Promise<SyncSuppliersResponse> {
    const response = await apiClient.get<SyncSuppliersResponse>(
      `/accounts/${accountId}/suppliers`,
    );
    return response.data;
  },

  /**
   * POST /api/v1/accounts/:accountId/suppliers/sync
   * Explicitly sync suppliers for an account
   */
  async explicitSyncSuppliers(
    accountId: string,
  ): Promise<SyncSuppliersResponse> {
    const response = await apiClient.post<SyncSuppliersResponse>(
      `/accounts/${accountId}/suppliers/sync`,
    );
    return response.data;
  },
};
