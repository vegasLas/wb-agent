import apiClient from './client';
import type { SupplyDetails } from '../types';

export const supplyDetailsAPI = {
  async fetchSupplyDetails(supplyId: string): Promise<SupplyDetails> {
    const response = await apiClient.get(`/supplies/${supplyId}`);
    return response.data.data;
  },
};
