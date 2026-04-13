import apiClient from '../client';
import type {
  AdvertsResponse,
  AdvertPresetInfoResponse,
  FetchAdvertsParams,
  FetchAdvertPresetInfoParams,
} from './types';

/**
 * Adverts API
 * Endpoints for WB adverts management
 */

export const advertsAPI = {
  /**
   * GET /api/v1/adverts
   * Get adverts list
   */
  async fetchAdverts(params?: FetchAdvertsParams): Promise<AdvertsResponse> {
    const response = await apiClient.get<{ data: AdvertsResponse }>(
      '/adverts',
      {
        params,
      },
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/adverts/:advertId/preset-info
   * Get advert preset info
   */
  async fetchAdvertPresetInfo(
    params: FetchAdvertPresetInfoParams,
  ): Promise<AdvertPresetInfoResponse> {
    const { advertId, ...queryParams } = params;
    const response = await apiClient.get<{ data: AdvertPresetInfoResponse }>(
      `/adverts/${advertId}/preset-info`,
      {
        params: queryParams,
      },
    );
    return response.data.data;
  },
};
