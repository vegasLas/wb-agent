import apiClient from './client';
import type { Report } from '../types';

export const reportsAPI = {
  async fetchReport(): Promise<Report> {
    const response = await apiClient.get('/reports');
    return response.data.data;
  },
};
