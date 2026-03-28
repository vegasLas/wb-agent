import apiClient from './client';

export interface GoodBalance {
  goodName: string;
  brand: string;
  subject: string;
  supplierArticle: string;
  quantity: number;
}

export interface BalancesResponse {
  success: boolean;
  data: Record<number, GoodBalance[]>;
}

export const supplierAPI = {
  /**
   * GET /api/v1/suppliers/balances
   * Get warehouse balances for the selected account
   */
  async fetchWarehouseBalances(accountId?: string, supplierId?: string): Promise<Record<number, GoodBalance[]>> {
    const params: Record<string, string> = {};
    if (accountId) params.accountId = accountId;
    if (supplierId) params.supplierId = supplierId;
    
    const response = await apiClient.get<BalancesResponse>('/suppliers/balances', { params });
    return response.data.data || {};
  },
};
