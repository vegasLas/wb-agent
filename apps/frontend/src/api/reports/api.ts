import apiClient from '../client';
import type {
  Report,
  ReportApiPayload,
  ReportRequestParams,
  RegionSaleData,
  RegionSaleRequestBody,
} from './types';

/**
 * Reports API
 * Endpoints for fetching sales reports from Wildberries
 */

export const reportsAPI = {
  /**
   * GET /api/v1/reports
   * Get user's legacy report data (booking stats)
   */
  async fetchReport(): Promise<Report> {
    const response = await apiClient.get<{ data: Report }>('/reports');
    return response.data.data;
  },

  /**
   * GET /api/v1/reports/sales
   * Get sales report for date range
   */
  async fetchSalesReport(
    params?: ReportRequestParams,
  ): Promise<ReportApiPayload> {
    const response = await apiClient.get<{ data: ReportApiPayload }>(
      '/reports/sales',
      { params },
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/reports/region-sales
   * Get region sales report for date range
   */
  async fetchRegionSales(body: RegionSaleRequestBody): Promise<RegionSaleData> {
    const response = await apiClient.post<{ data: RegionSaleData }>(
      '/reports/region-sales',
      body,
    );
    return response.data.data;
  },
};
