import type { SupplierInfo } from '../../types';

export interface GoodBalance {
  goodName: string;
  brand: string;
  subject: string;
  supplierArticle: string;
  quantity: number;
}

export interface WarehouseBalance {
  warehouseId: number;
  goods: GoodBalance[];
}

export interface ApiKeyStatus {
  success: boolean;
  hasApiKey: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateApiKeyResponse {
  success: boolean;
  message: string;
  data: {
    isExistAPIKey: boolean;
    isActive?: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UpdateApiKeyResponse {
  success: boolean;
  message: string;
  isActive: boolean;
}

export { SupplierInfo };
