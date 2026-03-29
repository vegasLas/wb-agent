import apiClient from './client';
import type { Draft, DraftGood } from '../types';

export interface DraftsResponse {
  success: boolean;
  data: Draft[];
}

export interface DraftGoodsResponse {
  success: boolean;
  data: DraftGood[];
}

export const draftsAPI = {
  /**
   * POST /api/v1/suppliers/drafts/list
   * List drafts for the selected account
   */
  async fetchDrafts(accountId: string, supplierId: string): Promise<Draft[]> {
    const response = await apiClient.post<DraftsResponse>(
      '/suppliers/drafts/list',
      {
        accountId,
        supplierId,
      },
    );
    return response.data.data || [];
  },

  /**
   * POST /api/v1/suppliers/goods/draft
   * List goods for a specific draft
   */
  async fetchDraftGoods(
    draftID: string,
    accountId?: string,
    supplierId?: string,
    options?: {
      search?: string;
      brands?: string[];
      subjects?: string[];
      limit?: number;
      offset?: number;
    },
  ): Promise<DraftGood[]> {
    const response = await apiClient.post<DraftGoodsResponse>(
      '/suppliers/goods/draft',
      {
        draftID,
        accountId,
        supplierId,
        ...options,
      },
    );
    return response.data.data || [];
  },
};
