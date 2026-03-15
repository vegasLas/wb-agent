import type { SupplyTrigger } from '@prisma/client';

export type BoxTypeId = 2 | 5 | 6;

export interface WarehouseAvailability {
  warehouseId: number;
  warehouseName: string;
  boxTypeID: BoxTypeId;
  availableDates: {
    date: string;
    coefficient: number;
  }[];
}

export interface MonitoringUser {
  userId: number;
  userAgent: string;
  proxy: {
    ip: string;
    port: string;
    username: string;
    password: string;
  };
  chatId?: string;
  supplyTriggers: SupplyTrigger[];
}
