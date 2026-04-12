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
  accountId: string;
  supplierId: string;
  draftID: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
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
