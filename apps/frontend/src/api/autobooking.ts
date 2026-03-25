import apiClient from './client';
import type { Autobooking, AutobookingCreateData, AutobookingUpdateData } from '../types';

export const autobookingAPI = {
  async fetchAutobookings(): Promise<Autobooking[]> {
    const response = await apiClient.get('/autobookings');
    return response.data.data;
  },

  async createAutobooking(data: AutobookingCreateData): Promise<Autobooking> {
    const response = await apiClient.post('/autobookings', data);
    return response.data.data;
  },

  async updateAutobooking(id: string, data: AutobookingUpdateData): Promise<Autobooking> {
    const response = await apiClient.patch(`/autobookings/${id}`, data);
    return response.data.data;
  },

  async deleteAutobooking(id: string): Promise<void> {
    await apiClient.delete(`/autobookings/${id}`);
  },

  async toggleAutobooking(id: string, enabled: boolean): Promise<void> {
    await apiClient.patch(`/autobookings/${id}/toggle`, { enabled });
  },
};
