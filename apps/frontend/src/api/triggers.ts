import apiClient from './client';
import type { Trigger, TriggerCreateData, TriggerUpdateData } from '../types';

export const triggersAPI = {
  async fetchTriggers(): Promise<Trigger[]> {
    const response = await apiClient.get('/triggers');
    return response.data.data;
  },

  async createTrigger(data: TriggerCreateData): Promise<Trigger> {
    const response = await apiClient.post('/triggers', data);
    return response.data.data;
  },

  async updateTrigger(id: string, data: TriggerUpdateData): Promise<Trigger> {
    const response = await apiClient.put('/triggers', { triggerId: id, ...data });
    return response.data.data;
  },

  async deleteTrigger(id: string): Promise<void> {
    await apiClient.delete('/triggers', { data: { triggerId: id } });
  },

  async toggleTrigger(id: string): Promise<Trigger> {
    const response = await apiClient.patch('/triggers', { triggerId: id });
    return response.data.data;
  },
};
