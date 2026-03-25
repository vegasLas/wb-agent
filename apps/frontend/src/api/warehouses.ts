import apiClient from './client';
import type { Warehouse } from '../types';

export const warehousesAPI = {
  async fetchWarehouses(): Promise<Warehouse[]> {
    const response = await apiClient.get('/warehouses');
    return response.data.data;
  },
};
