import apiClient from './client';

export interface Supply {
  supplyId: number;
  supplyDate: string;
  warehouseId: number;
  warehouseName: string;
  boxTypeName: string;
  statusId: number;
  statusName: string;
}

export interface SuppliesResponse {
  success: boolean;
  data: Supply[];
  totalCount: number;
}

export interface ListSuppliesRequest {
  accountId: string;
  supplierId: string;
}

export const suppliesAPI = {
  /**
   * POST /api/v1/supplies/list
   * List supplies for an account
   */
  async listSupplies(accountId: string, supplierId: string): Promise<SuppliesResponse> {
    const response = await apiClient.post<SuppliesResponse>('/supplies/list', {
      accountId,
      supplierId,
    });
    return response.data;
  },
};
