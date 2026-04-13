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
   * Create and fetch promotion Excel report
   */
  async fetchExcel(params: ExcelParams): Promise<PromotionApiPayload> {
    const response = await apiClient.post<{ data: PromotionApiPayload }>(
      '/promotions/excel',
      params,
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/promotions/recovery
   * Apply promotion recovery with selected items
   */
  async applyRecovery(params: PromotionRecoveryParams): Promise<void> {
    await apiClient.post('/promotions/recovery', params);
  },
};
