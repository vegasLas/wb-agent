export interface Coefficient {
  warehouseId: number;
  warehouseName: string;
  boxTypeId: number;
  boxTypeName: string;
  coefficient: number;
  date: string;
}

export interface CoefficientsResponse {
  success: boolean;
  data: Coefficient[];
}
