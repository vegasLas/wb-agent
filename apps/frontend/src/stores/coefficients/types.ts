import type { Coefficient } from '@/api/coefficients';

export interface WarehouseCoefficient {
  warehouseId: number;
  warehouseName: string;
  maxCoefficient: number;
  date: string;
  supplyType: string;
  createdAt: string;
  updatedAt: string;
}

export { Coefficient };
