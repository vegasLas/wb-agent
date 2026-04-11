import apiClient from './client';
import type {
  Autobooking,
  AutobookingCreateData,
  AutobookingUpdateData,
} from '../types';

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

export const autobookingAPI = {
  /**
   * GET /api/v1/autobooking
   * Get user's autobookings with counts
   */
  async fetchAutobookings(page?: number): Promise<AutobookingsResponse> {
    console.log('fetchAutobookings');
    const response = await apiClient.get<AutobookingsResponse>('/autobooking', {
      params: { page },
    });
    return response.data;
  },

  /**
   * POST /api/v1/autobooking
   * Create new autobooking
   */
  async createAutobooking(data: AutobookingCreateData): Promise<Autobooking> {
    const response = await apiClient.post<CreateAutobookingResponse>(
      '/autobooking',
      data,
    );
    // Handle both response structures: { success, data } or direct Autobooking
    const result = response.data?.data ?? response.data;
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from server');
    }
    return result as Autobooking;
  },

  /**
   * PUT /api/v1/autobooking
   * Update autobooking
   */
  async updateAutobooking(
    id: string,
    data: AutobookingUpdateData,
  ): Promise<Autobooking> {
    const response = await apiClient.put<UpdateAutobookingResponse>(
      '/autobooking',
      { id, ...data },
    );
    // Handle both response structures: { success, data } or direct Autobooking
    const result = response.data?.data ?? response.data;
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response from server');
    }
    return result as Autobooking;
  },

  /**
   * DELETE /api/v1/autobooking
   * Delete autobooking
   */
  async deleteAutobooking(id: string): Promise<DeleteAutobookingResponse> {
    const response = await apiClient.delete<DeleteAutobookingResponse>(
      '/autobooking',
      { data: { id } },
    );
    return response.data;
  },

  /**
   * PATCH /api/v1/autobooking/:id/coefficient
   * Update autobooking coefficient
   */
  async updateBookingCoefficient(
    id: string,
    maxCoefficient: number,
  ): Promise<Autobooking> {
    const response = await apiClient.patch<UpdateAutobookingResponse>(
      `/autobooking/${id}/coefficient`,
      { maxCoefficient },
    );
    return response.data.data;
  },
};
