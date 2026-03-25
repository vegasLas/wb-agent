import apiClient from './client';
import type { 
  AutobookingReschedule, 
  CreateAutobookingRescheduleRequest,
  UpdateAutobookingRescheduleRequest,
  SupplyGood,
  SupplyDetails 
} from '../types';

export interface RescheduleAPIResponse {
  success: boolean;
  message?: string;
  items?: AutobookingReschedule[];
  counts?: Record<string, number>;
  currentPage?: number;
  nextPage?: number | null;
  data?: {
    goods: SupplyGood[];
    supply: SupplyDetails;
  };
  error?: string;
}

export const reschedulesAPI = {
  async fetchReschedules(page: number = 1): Promise<RescheduleAPIResponse> {
    const response = await apiClient.get('/reschedule', { params: { page } });
    return response.data;
  },

  async createReschedule(data: CreateAutobookingRescheduleRequest): Promise<RescheduleAPIResponse> {
    const response = await apiClient.post('/reschedule', data);
    return response.data;
  },

  async updateReschedule(data: UpdateAutobookingRescheduleRequest): Promise<RescheduleAPIResponse> {
    const response = await apiClient.put('/reschedule', data);
    return response.data;
  },

  async deleteReschedule(id: string): Promise<RescheduleAPIResponse> {
    const response = await apiClient.delete('/reschedule', { data: { id } });
    return response.data;
  },

  async getSupplyDetails(supplyId: string): Promise<RescheduleAPIResponse> {
    const response = await apiClient.get('/supplies/supply-details', { params: { supplyId } });
    return response.data;
  },
};
