import apiClient from '../client';
import type {
  MpstatsCard,
  MpstatsItemFull,
  MpstatsSkuSummary,
  MpstatsTokenStatus,
} from './types';

export const mpstatsAPI = {
  /**
   * GET /api/v1/mpstats/token
   * Check MPStats token status
   */
  async getTokenStatus(): Promise<MpstatsTokenStatus> {
    const response = await apiClient.get<MpstatsTokenStatus>('/mpstats/token');
    return response.data;
  },

  /**
   * POST /api/v1/mpstats/token
   * Save/update MPStats token
   */
  async saveToken(token: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/mpstats/token',
      { token },
    );
    return response.data;
  },

  /**
   * DELETE /api/v1/mpstats/token
   * Remove MPStats token
   */
  async deleteToken(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      '/mpstats/token',
    );
    return response.data;
  },

  /**
   * GET /api/v1/mpstats/items/:nmId/full
   * Get MPStats full item info
   */
  async getItemFull(nmId: number): Promise<{ success: boolean; data: { nmID: number; name: string; brand: string; subjectName: string; image: string; favourite: boolean; full: MpstatsItemFull } }> {
    const response = await apiClient.get<{ success: boolean; data: { nmID: number; name: string; brand: string; subjectName: string; image: string; favourite: boolean; full: MpstatsItemFull } }>(
      `/mpstats/items/${nmId}/full`,
    );
    return response.data;
  },

  /**
   * POST /api/v1/mpstats/cards/save
   * Save a SKU card
   */
  async saveCard(card: MpstatsCard): Promise<{ success: boolean; data: unknown }> {
    const response = await apiClient.post<{ success: boolean; data: unknown }>(
      '/mpstats/cards/save',
      card,
    );
    return response.data;
  },

  /**
   * GET /api/v1/mpstats/favorites
   * Get favorite SKUs
   */
  async getFavorites(): Promise<{ success: boolean; data: MpstatsCard[] }> {
    const response = await apiClient.get<{ success: boolean; data: MpstatsCard[] }>(
      '/mpstats/favorites',
    );
    return response.data;
  },

  /**
   * POST /api/v1/mpstats/favorites
   * Add SKU to favorites
   */
  async addFavorite(nmID: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/mpstats/favorites',
      { nmID },
    );
    return response.data;
  },

  /**
   * DELETE /api/v1/mpstats/favorites/:nmId
   * Remove SKU from favorites
   */
  async removeFavorite(nmId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/mpstats/favorites/${nmId}`,
    );
    return response.data;
  },

  /**
   * GET /api/v1/mpstats/history
   * Get recently viewed SKUs
   */
  async getHistory(): Promise<{ success: boolean; data: MpstatsCard[] }> {
    const response = await apiClient.get<{ success: boolean; data: MpstatsCard[] }>(
      '/mpstats/history',
    );
    return response.data;
  },

  /**
   * GET /api/v1/mpstats/sku/:nmId/summary
   * Get combined MPStats data for a SKU
   */
  async getSkuSummary(nmId: number): Promise<{ success: boolean; data: MpstatsSkuSummary }> {
    const response = await apiClient.get<{ success: boolean; data: MpstatsSkuSummary }>(
      `/mpstats/sku/${nmId}/summary`,
    );
    return response.data;
  },

  /**
   * PATCH /api/v1/mpstats/favorites/:nmId/title
   * Update the custom title of a favorited SKU card
   */
  async updateFavoriteTitle(nmId: number, customTitle: string | null): Promise<{ success: boolean; data: MpstatsCard }> {
    const response = await apiClient.patch<{ success: boolean; data: MpstatsCard }>(
      `/mpstats/favorites/${nmId}/title`,
      { customTitle },
    );
    return response.data;
  },
};
