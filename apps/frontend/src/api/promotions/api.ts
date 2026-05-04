import apiClient from '../client';
import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionManageParams,
  PromotionRecoveryParams,
  TimelineParams,
  DetailParams,
  GoodsParams,
  ExcelParams,
} from './types';

/**
 * Promotions API
 * Endpoints for WB promotions calendar
 */

const MAX_EXCEL_RETRIES = 1;

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

  async fetchGoods(params: GoodsParams): Promise<PromotionApiPayload> {
    const response = await apiClient.post<{ data: PromotionApiPayload }>(
      '/promotions/goods',
      params,
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/promotions/excel
   * @deprecated Use fetchGoods instead. Kept for backward compatibility.
   */
  async fetchExcel(
    params: ExcelParams,
    retryCount = MAX_EXCEL_RETRIES,
  ): Promise<PromotionApiPayload> {
    const goodsParams: GoodsParams = {
      promoID: params.periodID,
      periodID: params.periodID,
      mode: params.isRecovery === false ? 'excluded' : 'participating',
    };
    const payload = await this.fetchGoods(goodsParams);

    if (payload.reportPending && retryCount > 0) {
      const waitMs = (payload.estimatedWaitTime || 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.fetchExcel(params, retryCount - 1);
    }

    return payload;
  },

  async applyManagement(params: PromotionManageParams): Promise<void> {
    await apiClient.post('/promotions/manage', params);
  },

  /**
   * POST /api/v1/promotions/recovery
   * @deprecated Use applyManagement instead. Kept for backward compatibility.
   */
  async applyRecovery(params: PromotionRecoveryParams): Promise<void> {
    await this.applyManagement({
      promoID: params.periodID,
      periodID: params.periodID,
      selectedItems: params.selectedItems,
      isRecovery: params.isRecovery,
    });
  },
};
