import apiClient from './client';
import type { Autobooking, AutobookingCreateData, AutobookingUpdateData } from '../types';

interface StatusCounts {
  [key: string]: number;
}

interface AutobookingsResponse {
  items: Autobooking[];
  counts: StatusCounts;
  currentPage: number;
  nextPage: number | null;
}

export const autobookingAPI = {
  async fetchAutobookings(page?: number): Promise<AutobookingsResponse> {
    const response = await apiClient.get('/autobooking', { params: { page } });
    return response.data;
  },

  async createAutobooking(data: AutobookingCreateData): Promise<Autobooking> {
    const response = await apiClient.post('/autobooking', data);
    return response.data.data;
  },

  async updateAutobooking(id: string, data: AutobookingUpdateData): Promise<Autobooking> {
    const response = await apiClient.put('/autobooking', { id, ...data });
    return response.data.data;
  },

  async deleteAutobooking(id: string): Promise<void> {
    await apiClient.delete('/autobooking', { data: { id } });
  },
};
