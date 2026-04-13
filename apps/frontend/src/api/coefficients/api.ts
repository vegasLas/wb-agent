import apiClient from '../client';
import type { Coefficient, CoefficientsResponse } from './types';

export const coefficientsAPI = {
  /**
   * GET /api/v1/coefficients
   * Get acceptance coefficients from WB API
   */
  async fetchCoefficients(warehouseIDs?: number[]): Promise<Coefficient[]> {
    const params = warehouseIDs
      ? { warehouseIDs: warehouseIDs.join(',') }
      : undefined;
    const response = await apiClient.get<CoefficientsResponse>(
      '/coefficients',
      { params },
    );
    return response.data.data;
  },
};
