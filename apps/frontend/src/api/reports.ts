import apiClient from './client';
import type { Report, ReportApiPayload, ReportRequestParams } from '../types';

export const reportsAPI = {
  async fetchReport(): Promise<Report> {
    const response = await apiClient.get('/reports');
    return response.data.data;
  },

  async fetchSalesReport(params?: ReportRequestParams): Promise<ReportApiPayload> {
    const response = await apiClient.get('/reports/sales', { params });
    return response.data.data;
  },
};
