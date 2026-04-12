import type { Draft, DraftGood } from '../../types';

export interface DraftsResponse {
  success: boolean;
  data: Draft[];
}

export interface DraftGoodsResponse {
  success: boolean;
  data: DraftGood[];
}

export type { Draft, DraftGood };

export interface FetchDraftGoodsOptions {
  search?: string;
  brands?: string[];
  subjects?: string[];
  limit?: number;
  offset?: number;
}
