import apiClient from './client';

export interface Coefficient {
  warehouseId: number;
  warehouseName: string;
  boxTypeId: number;
  boxTypeName: string;
  coefficient: number;
  date: string;
}

export interface CoefficientsResponse {
  success: boolean;
  data: Coefficient[];
}

export const coefficientsAPI = {
  /**
   * GET /api/v1/coefficients
   * Get acceptance coefficients from WB API
   */
  async fetchCoefficients(warehouseIDs?: number[]): Promise<Coefficient[]> {
    const params = warehouseIDs ? { warehouseIDs: warehouseIDs.join(',') } : undefined;
    const response = await apiClient.get<CoefficientsResponse>('/coefficients', { params });
    return response.data.data;
  },
};
