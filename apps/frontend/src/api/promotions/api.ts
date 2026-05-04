import apiClient from '../client';
import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionManageParams,
  TimelineParams,
  DetailParams,
  GoodsParams,
} from './types';

/**
 * Promotions API
 * Endpoints for WB promotions calendar
 */

const MAX_GOODS_RETRIES = 1;
const GOODS_RETRY_DELAY_MS = 5000;

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
   * POST /api/v1/promotions/goods
   * Fetch promotion goods list
   */
  async fetchGoods(
    params: GoodsParams,
    retryCount = MAX_GOODS_RETRIES,
  ): Promise<PromotionApiPayload> {
    const response = await apiClient.post<{ data: PromotionApiPayload }>(
      '/promotions/goods',
      params,
    );
    const payload = response.data.data;

    if (payload.reportPending && retryCount > 0) {
      const waitMs = (payload.estimatedWaitTime || 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.fetchGoods(params, retryCount - 1);
    }

    return payload;
  },

  /**
   * POST /api/v1/promotions/manage
   * Include or exclude goods from a promotion
   */
  async applyManagement(params: PromotionManageParams): Promise<void> {
    await apiClient.post('/promotions/manage', params);
  },
};
