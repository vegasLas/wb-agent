export interface Supply {
  supplyId: number;
  supplyDate: string;
  warehouseId: number;
  warehouseName: string;
  boxTypeName: string;
  statusId: number;
  statusName: string;
}

export interface SuppliesResponse {
  success: boolean;
  data: Supply[];
  totalCount: number;
}

export interface ListSuppliesRequest {
  accountId: string;
  supplierId: string;
}

// From supplyDetails.ts (merged)
export interface SupplyDetails {
  id: number;
  supplyId: number;
  supplyDate: string;
  warehouseId: number;
  warehouseName: string;
  boxTypeName: string;
  statusId: number;
  statusName: string;
}

export interface SupplyGood {
  imgSrc?: string;
  imtName?: string;
  quantity?: number;
  barcode?: string;
  brandName?: string;
  subjectName?: string;
  colorName?: string;
}

export interface SupplyDetailsResponse {
  success: boolean;
  data?: {
    goods: SupplyGood[];
    supply: SupplyDetails;
    totalCount: number;
  };
  error?: string;
}
