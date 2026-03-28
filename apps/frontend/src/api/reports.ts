import apiClient from './client';
import type { Report, ReportApiPayload, ReportRequestParams } from '../types';

/**
 * NOTE: The backend has an orders.controller.ts but no corresponding routes defined.
 * The /reports and /reports/sales endpoints need to be implemented in the backend.
 * 
 * For now, these API calls will fail until the backend routes are added.
 */

export const reportsAPI = {
  /**
   * GET /api/v1/reports
   * Get user's report data
   * 
   * TODO: Backend route not implemented
   */
  async fetchReport(): Promise<Report> {
    const response = await apiClient.get<{ data: Report }>('/reports');
    return response.data.data;
  },

  /**
   * GET /api/v1/reports/sales
   * Get sales report
   * 
   * TODO: Backend route not implemented
   */
  async fetchSalesReport(params?: ReportRequestParams): Promise<ReportApiPayload> {
    const response = await apiClient.get<{ data: ReportApiPayload }>('/reports/sales', { params });
    return response.data.data;
  },
};
