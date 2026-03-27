import apiClient from './client';

export interface Coefficient {
  warehouseId: number;
  warehouseName: string;
  boxTypeId: number;
  boxTypeName: string;
  coefficient: number;
  date: string;
}

export const coefficientsAPI = {
  async fetchCoefficients(warehouseIDs?: number[]): Promise<Coefficient[]> {
    const params = warehouseIDs ? { warehouseIDs: warehouseIDs.join(',') } : undefined;
    const response = await apiClient.get('/coefficients', { params });
    return response.data.data;
  },
};
