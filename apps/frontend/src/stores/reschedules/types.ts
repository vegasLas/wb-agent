// Reschedule store types

export interface RescheduleFilters {
  status: string[];
  supplyType: string[];
  warehouseIds: number[];
  supplierIds: string[];
  dateFrom?: string;
  dateTo?: string;
}

export type RescheduleSortBy = 'createdAt' | 'updatedAt' | 'supplyId' | 'supplierId';
export type RescheduleSortOrder = 'asc' | 'desc';

export interface RescheduleFormData {
  warehouseId: number | null;
  dateType: string;
  startDate: string | null;
  endDate: string | null;
  customDates: string[];
  maxCoefficient: number;
  supplyType: string;
  supplyId: string | null;
  currentDate: string | null;
}

export interface RescheduleUpdateFormData {
  selectedDateType: string;
  startDateInput: string | Date;
  endDateInput: string | Date;
  customDates: (string | Date)[];
  maxCoefficientInput: number;
}

export interface OriginalRescheduleData {
  dateType: string;
  startDate: string;
  endDate: string;
  customDates: string[];
  maxCoefficient: number;
}
