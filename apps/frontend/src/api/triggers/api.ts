import apiClient from '../client';
import type {
  SupplyTrigger,
  CreateTriggerRequest,
  UpdateTriggerRequest,
  TriggersResponse,
} from './types';

export const triggersAPI = {
  /**
   * GET /api/v1/triggers
   * Get all triggers for the authenticated user
   */
  async fetchTriggers(): Promise<SupplyTrigger[]> {
    const response = await apiClient.get<SupplyTrigger[]>('/triggers');
    return response.data;
  },

  /**
   * POST /api/v1/triggers
   * Create a new trigger
   */
  async createTrigger(data: CreateTriggerRequest): Promise<SupplyTrigger> {
    const response = await apiClient.post<SupplyTrigger>('/triggers', data);
    return response.data;
  },

  /**
   * PUT /api/v1/triggers
   * Update an existing trigger
   */
  async updateTrigger(
    id: string,
    data: Omit<UpdateTriggerRequest, 'triggerId'>,
  ): Promise<SupplyTrigger> {
    const response = await apiClient.put<SupplyTrigger>('/triggers', {
      triggerId: id,
      ...data,
    });
    return response.data;
  },

  /**
   * PATCH /api/v1/triggers
   * Toggle trigger active status
   */
  async toggleTrigger(id: string): Promise<SupplyTrigger> {
    const response = await apiClient.patch<SupplyTrigger>('/triggers', {
      triggerId: id,
    });
    return response.data;
  },

  /**
   * DELETE /api/v1/triggers
   * Delete a trigger
   */
  async deleteTrigger(id: string): Promise<void> {
    await apiClient.delete('/triggers', { data: { triggerId: id } });
  },
};
