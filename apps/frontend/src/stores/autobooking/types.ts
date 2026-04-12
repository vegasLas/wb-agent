import type { Autobooking, AutobookingReschedule, AutobookingCreateData, AutobookingUpdateData } from '../../types';
import type { BadgeColor, StatusCounts } from '../triggers/types';

// Form field types
export type DateType =
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM_PERIOD'
  | 'CUSTOM_DATES'
  | 'CUSTOM_DATES_SINGLE';
export type SupplyType = 'BOX' | 'MONOPALLETE' | 'SUPERSAFE' | '';

// Re-export from triggers types
export type { BadgeColor, StatusCounts };

// Validation result type
export interface ValidationResult {
  result: {
    metaInfo: {
      monoMixQuantity: number;
      palletQuantity: number;
      supersafeQuantity: number;
    };
    errors?: Array<{ message: string }>;
  };
}

export interface FormState {
  draftId: string;
  warehouseId: number | null;
  transitWarehouseId: number | null;
  transitWarehouseName: string | null;
  supplyType: SupplyType;
  dateType: DateType;
  startDate: string;
  endDate: string;
  customDates: (string | Date)[];
  maxCoefficient: number;
  monopalletCount: number | null;
}

export interface AutobookingsResponse {
  items: Autobooking[];
  counts: StatusCounts;
  currentPage: number;
  nextPage: number | null;
}

export {
  Autobooking,
  AutobookingReschedule,
  AutobookingCreateData,
  AutobookingUpdateData,
};
