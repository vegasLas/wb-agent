import apiClient from './client';
import type {
  AutobookingReschedule,
  CreateAutobookingRescheduleRequest,
  UpdateAutobookingRescheduleRequest,
  SupplyGood,
  SupplyDetails,
} from '../types';

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

export const reschedulesAPI = {
  /**
   * GET /api/v1/reschedule
   * Get user's reschedules with counts
   */
  async fetchReschedules(page = 1): Promise<ReschedulesResponse> {
    const response = await apiClient.get<ReschedulesResponse>('/reschedule', {
      params: { page },
    });
    return response.data;
  },

  /**
   * POST /api/v1/reschedule
   * Create new reschedule
   */
  async createReschedule(
    data: CreateAutobookingRescheduleRequest,
  ): Promise<AutobookingReschedule> {
    const response = await apiClient.post<CreateRescheduleResponse>(
      '/reschedule',
      data,
    );
    return response.data.data;
  },

  /**
   * PUT /api/v1/reschedule
   * Update reschedule
   */
  async updateReschedule(
    data: UpdateAutobookingRescheduleRequest,
  ): Promise<AutobookingReschedule> {
    const response = await apiClient.put<UpdateRescheduleResponse>(
      '/reschedule',
      data,
    );
    return response.data.data;
  },

  /**
   * DELETE /api/v1/reschedule
   * Delete reschedule
   */
  async deleteReschedule(id: string): Promise<DeleteRescheduleResponse> {
    const response = await apiClient.delete<DeleteRescheduleResponse>(
      '/reschedule',
      { data: { id } },
    );
    return response.data;
  },

  /**
   * GET /api/v1/supplies/supply-details
   * Get supply details (used in reschedules)
   */
  async getSupplyDetails(
    supplyId: string | number,
  ): Promise<RescheduleSupplyDetailsResponse> {
    const response = await apiClient.get<RescheduleSupplyDetailsResponse>(
      '/supplies/supply-details',
      { params: { supplyId } },
    );
    return response.data;
  },
};
