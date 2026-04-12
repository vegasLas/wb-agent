import type {
  Autobooking,
  AutobookingCreateData,
  AutobookingUpdateData,
} from '../../types';

export interface StatusCounts {
  ACTIVE: number;
  COMPLETED: number;
  ARCHIVED: number;
  ERROR: number;
  [key: string]: number;
}

export interface AutobookingsResponse {
  success: boolean;
  items: Autobooking[];
  counts: StatusCounts;
  currentPage: number;
  nextPage: number | null;
}

export interface CreateAutobookingResponse {
  success: boolean;
  data: Autobooking;
}

export interface UpdateAutobookingResponse {
  success: boolean;
  data: Autobooking;
}

export interface DeleteAutobookingResponse {
  success: boolean;
  message: string;
  returnedCredits: number;
}

export interface AutobookingErrorResponse {
  success: false;
  error: string;
  code: string;
}

export { Autobooking, AutobookingCreateData, AutobookingUpdateData };
