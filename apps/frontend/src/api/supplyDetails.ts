import apiClient from './client';
import type { SupplyDetails, SupplyGood } from '../types';

export interface SupplyDetailsResponse {
  success: boolean;
  data?: {
    goods: SupplyGood[];
    supply: SupplyDetails;
  };
  error?: string;
}

export const supplyDetailsAPI = {
  async fetchSupplyDetails(supplyId: string): Promise<SupplyDetailsResponse> {
    const response = await apiClient.get('/supplies/supply-details', { params: { supplyId } });
    return response.data;
  },
};
