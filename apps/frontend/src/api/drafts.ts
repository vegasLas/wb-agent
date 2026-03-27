import apiClient from './client';
import type { Draft, DraftGood } from '../types';

export interface DraftGoodsResponse {
  success: boolean;
  data: DraftGood[];
}

export const draftsAPI = {
  async fetchDrafts(accountId?: string, supplierId?: string): Promise<Draft[]> {
    const response = await apiClient.post('/suppliers/drafts/list', {
      accountId,
      supplierId,
    });
    return response.data.data;
  },

  async fetchDraftGoods(draftID: string, accountId?: string, supplierId?: string): Promise<DraftGood[]> {
    const response = await apiClient.post<DraftGoodsResponse>('/suppliers/goods/draft', {
      draftID,
      accountId,
      supplierId,
    });
    return response.data.data;
  },
};
