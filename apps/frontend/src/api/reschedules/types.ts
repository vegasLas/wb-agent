import type {
  AutobookingReschedule,
  CreateAutobookingRescheduleRequest,
  UpdateAutobookingRescheduleRequest,
  SupplyGood,
  SupplyDetails,
} from '../../types';

export interface ReschedulesResponse {
  success: boolean;
  items: AutobookingReschedule[];
  counts: {
    ACTIVE: number;
    COMPLETED: number;
    ARCHIVED: number;
    [key: string]: number;
  };
  currentPage: number;
  nextPage: number | null;
  total: number;
}

export interface CreateRescheduleResponse {
  success: boolean;
  data: AutobookingReschedule;
}

export interface UpdateRescheduleResponse {
  success: boolean;
  data: AutobookingReschedule;
}

export interface DeleteRescheduleResponse {
  success: boolean;
  message: string;
  returnedCredits: number;
}

export interface RescheduleSupplyDetailsResponse {
  success: boolean;
  data?: {
    goods: SupplyGood[];
    supply: SupplyDetails;
    totalCount: number;
  };
  error?: string;
}

export type {
  AutobookingReschedule,
  CreateAutobookingRescheduleRequest,
  UpdateAutobookingRescheduleRequest,
};

// Note: SupplyGood and SupplyDetails are NOT re-exported here
// to avoid conflicts with supplies/ domain. Import them from '@/types' or '../types' directly.
