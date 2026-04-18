import apiClient from '../client';
import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionRecoveryParams,
  TimelineParams,
  DetailParams,
  ExcelParams,
} from './types';

/**
 * Promotions API
 * Endpoints for WB promotions calendar
 */

const MAX_EXCEL_RETRIES = 1;
const EXCEL_RETRY_DELAY_MS = 5000;

export const promotionsAPI = {
  /**
   * GET /api/v1/promotions/timeline
   * Get promotions timeline
   */
  async fetchTimeline(
    params?: TimelineParams,
  ): Promise<PromotionsTimelineResponse> {
    const response = await apiClient.get<{ data: PromotionsTimelineResponse }>(
      '/promotions/timeline',
      {
        params,
      },
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/promotions/detail
   * Get promotion detail by promoID
   */
  async fetchDetail(params: DetailParams): Promise<PromotionDetailResponse> {
    const response = await apiClient.get<{ data: PromotionDetailResponse }>(
      '/promotions/detail',
      {
        params,
      },
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/promotions/excel
   * Create and fetch promotion Excel report.
   * Automatically retries once if the report is still pending.
   */
  async fetchExcel(
    params: ExcelParams,
    retryCount = MAX_EXCEL_RETRIES,
  ): Promise<PromotionApiPayload> {
    const response = await apiClient.post<{ data: PromotionApiPayload }>(
      '/promotions/excel',
      params,
    );
    const payload = response.data.data;

    if (
      payload.reportPending &&
      retryCount > 0
    ) {
      const waitMs = (payload.estimatedWaitTime || 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.fetchExcel(params, retryCount - 1);
    }

    return payload;
  },

  /**
   * POST /api/v1/promotions/recovery
   * Apply promotion recovery with selected items
   */
  async applyRecovery(params: PromotionRecoveryParams): Promise<void> {
    await apiClient.post('/promotions/recovery', params);
  },
};
