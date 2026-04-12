import apiClient from '../client';
import type {
  Draft,
  DraftGood,
  DraftsResponse,
  DraftGoodsResponse,
  FetchDraftGoodsOptions,
} from './types';

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
    options?: FetchDraftGoodsOptions,
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
