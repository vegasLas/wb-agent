import apiClient from './client';
import type { Supplier } from '../types';

export const accountsAPI = {
  async updateAccountSupplier(
    accountId: string,
    supplierId: string
  ): Promise<void> {
    await apiClient.patch('/accounts/supplier', { accountId, supplierId });
  },

  async refreshAccountSuppliers(accountId: string): Promise<{
    success: boolean;
    suppliers: Supplier[];
  }> {
    const response = await apiClient.post('/accounts/refresh-suppliers', { accountId });
    return response.data;
  },

  async deleteAccount(accountId: string): Promise<void> {
    await apiClient.delete('/accounts', { data: { accountId } });
  },
};
