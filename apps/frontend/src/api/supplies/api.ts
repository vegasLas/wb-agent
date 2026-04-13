import apiClient from '../client';
import type {
  Supply,
  SuppliesResponse,
  SupplyDetailsResponse,
} from './types';

export const suppliesAPI = {
  /**
   * POST /api/v1/supplies/list
   * List supplies for an account
   */
  async listSupplies(
    accountId: string,
    supplierId: string,
  ): Promise<SuppliesResponse> {
    const response = await apiClient.post<SuppliesResponse>('/supplies/list', {
      accountId,
      supplierId,
    });
    return response.data;
  },

  /**
   * GET /api/v1/supplies/supply-details
   * Get details for a specific supply
   */
  async fetchSupplyDetails(
    supplyId: string | number,
  ): Promise<SupplyDetailsResponse> {
    const response = await apiClient.get<SupplyDetailsResponse>(
      '/supplies/supply-details',
      {
        params: { supplyId },
      },
    );
    return response.data;
  },
};
