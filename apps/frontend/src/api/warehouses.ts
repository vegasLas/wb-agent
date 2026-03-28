import apiClient from './client';

export interface Warehouse {
  ID: number;
  name: string;
  address?: string;
  workTime?: string;
  acceptsQr?: boolean;
}

export interface TransitItem {
  transitWarehouseId: number;
  transitWarehouseName: string;
  storeBox: boolean;
  storePallet: boolean;
  storeSupersafe: boolean;
}

export interface WarehousesResponse {
  success: boolean;
  data: Warehouse[];
  cached?: boolean;
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

export interface CacheStatusResponse {
  success: boolean;
  data: {
    hasCache: boolean;
    cacheAge: number | null;
    cacheExpiry: number | null;
    warehouseCount: number;
  };
}

export const warehousesAPI = {
  /**
   * GET /api/v1/warehouses
   * Get all warehouses list with caching
   */
  async fetchWarehouses(): Promise<Warehouse[]> {
    const response = await apiClient.get<WarehousesResponse>('/warehouses');
    return response.data.data;
  },

  /**
   * POST /api/v1/warehouses/transits
   * Get transit offices for a warehouse
   */
  async fetchTransits(accountId: string, warehouseId: number): Promise<TransitItem[]> {
    const response = await apiClient.post<TransitsResponse>('/warehouses/transits', {
      accountId,
      warehouseId,
    });
    return response.data.data;
  },

  /**
   * POST /api/v1/warehouses/validate
   * Validate warehouse goods for a draft
   */
  async validateWarehouse(data: ValidationRequest): Promise<ValidationResponse> {
    const response = await apiClient.post<ValidationResponse>('/warehouses/validate', data);
    return response.data;
  },

  /**
   * GET /api/v1/warehouses/cache/status
   * Get warehouse cache status (admin/debug endpoint)
   */
  async getCacheStatus(): Promise<CacheStatusResponse> {
    const response = await apiClient.get<CacheStatusResponse>('/warehouses/cache/status');
    return response.data;
  },

  /**
   * POST /api/v1/warehouses/cache/clear
   * Clear warehouse cache (admin/debug endpoint)
   */
  async clearCache(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/warehouses/cache/clear');
    return response.data;
  },
};
