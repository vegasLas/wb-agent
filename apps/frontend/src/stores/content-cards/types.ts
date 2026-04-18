import type {
  ContentCardTableItem,
  CommissionCategory,
  TariffWarehouse,
} from '@/types';

export interface ContentCardsState {
  cards: ContentCardTableItem[];
  loading: boolean;
  error: string | null;
  selectedCard: ContentCardTableItem | null;

  commissionsData: CommissionCategory[];
  commissionsLoading: boolean;
  commissionsError: string | null;

  tariffsData: TariffWarehouse[];
  tariffsLoading: boolean;
  tariffsError: string | null;
}
