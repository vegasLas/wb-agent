import apiClient from './client';
import type { Warehouse } from '../types';

export interface TransitItem {
  transitWarehouseId: number;
  transitWarehouseName: string;
  storeBox: boolean;
  storePallet: boolean;
  storeSupersafe: boolean;
}

export interface TransitsResponse {
  success: boolean;
  data: TransitItem[];
}

export interface ValidationRequest {
  accountId?: string;
  draftID: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
  supplierId?: string;
}

export interface ValidationResponse {
  success: boolean;
  data?: {
    result?: {
      metaInfo?: {
        monoMixQuantity: number;
        palletQuantity: number;
        supersafeQuantity: number;
      };
    };
  };
}

export const warehousesAPI = {
  async fetchWarehouses(accountId: string): Promise<Warehouse[]> {
    const response = await apiClient.get('/warehouses', { params: { accountId } });
    return response.data.data;
  },

  async fetchTransits(accountId: string, warehouseId: number): Promise<TransitItem[]> {
    const response = await apiClient.post<TransitsResponse>('/warehouses/transits', {
      accountId,
      warehouseId,
    });
    return response.data.data;
  },

  async validateWarehouse(data: ValidationRequest): Promise<ValidationResponse> {
    const response = await apiClient.post<ValidationResponse>('/warehouses/validate', data);
    return response.data;
  },
};
