import apiClient from './client';
import type { Draft } from '../types';

export const draftsAPI = {
  async fetchDrafts(): Promise<Draft[]> {
    const response = await apiClient.get('/drafts');
    return response.data.data;
  },
};
