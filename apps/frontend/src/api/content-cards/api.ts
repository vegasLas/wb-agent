import apiClient from '../client';
import type {
  ContentCardTableListResponse,
  ContentCardCommissionsResponse,
  ContentCardTariffsResponse,
} from './types';

/**
 * Content Cards API
 * Endpoints for WB content-card, commissions, and tariffs
 */

export const contentCardsAPI = {
  /**
   * GET /api/v1/content-cards
   * Get content cards table list
   */
  async fetchContentCardsTableList(
    n = 20,
    cursor?: { n: number; nmID: number },
  ): Promise<ContentCardTableListResponse> {
    const response = await apiClient.get<{ data: ContentCardTableListResponse }>(
      '/content-cards',
      {
        params: {
          n,
          ...(cursor ? { cursor: JSON.stringify(cursor) } : {}),
        },
      },
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/content-cards/:nmID/commissions
   * Get commissions for a specific card (backend resolves subject/parent via getImt)
   */
  async fetchContentCardCommissions(nmID: number): Promise<ContentCardCommissionsResponse> {
    const response = await apiClient.post<{ data: ContentCardCommissionsResponse }>(
      `/content-cards/${nmID}/commissions`,
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/content-cards/:nmID/tariffs
   * Get tariffs for a specific card (backend resolves dimensions and subjectId via getImt)
   */
  async fetchContentCardTariffsByNmID(nmID: number): Promise<ContentCardTariffsResponse> {
    const response = await apiClient.post<{ data: ContentCardTariffsResponse }>(
      `/content-cards/${nmID}/tariffs`,
    );
    return response.data.data;
  },
};
