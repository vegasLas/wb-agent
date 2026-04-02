import apiClient from './client';

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
   * GET /api/v1/suppliers/balances
   * Get warehouse balances for the selected account
   */
  async fetchWarehouseBalances(accountId?: string): Promise<WarehouseBalance[]> {
    const params: Record<string, string> = {};
    if (accountId) params.accountId = accountId;
    
    const response = await apiClient.get<WarehouseBalance[]>('/suppliers/balances', { params });
    return response.data || [];
  },
};
