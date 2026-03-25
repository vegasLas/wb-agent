import apiClient from './client';
import type { Reschedule, RescheduleCreateData, RescheduleUpdateData } from '../types';

export const reschedulesAPI = {
  async fetchReschedules(): Promise<Reschedule[]> {
    const response = await apiClient.get('/reschedules');
    return response.data.data;
  },

  async createReschedule(data: RescheduleCreateData): Promise<Reschedule> {
    const response = await apiClient.post('/reschedules', data);
    return response.data.data;
  },

  async updateReschedule(id: string, data: RescheduleUpdateData): Promise<Reschedule> {
    const response = await apiClient.patch(`/reschedules/${id}`, data);
    return response.data.data;
  },

  async deleteReschedule(id: string): Promise<void> {
    await apiClient.delete(`/reschedules/${id}`);
  },
};
