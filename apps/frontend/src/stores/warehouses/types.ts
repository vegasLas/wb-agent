export interface Warehouse {
  ID: number;
  name: string;
  address?: string;
  isActive?: boolean;
}

export interface TransitItem {
  transitWarehouseId: number;
  transitWarehouseName: string;
  storeBox: boolean;
  storePallet: boolean;
  storeSupersafe: boolean;
}
