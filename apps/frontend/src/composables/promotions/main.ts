/**
 * usePromotions Composable
 *
 * Main composable for managing promotions state, filtering, and interactions.
 * Encapsulates complex logic for the promotions feature including:
 * - Timeline fetching with date ranges
 * - Filter management (ALL, PARTICIPATING, SKIPPED)
 * - Dialog state management
 * - Detail and Excel data fetching with retry logic
 * - User change watchers
 *
 * @example
 * const {
 *   // State
 *   promotions,
 *   loading,
 *   error,
 *   currentFilter,
 *
 *   // Dialogs
 *   showDetailDialog,
 *   showParticipantsDialog,
 *   selectedPromotion,
 *   selectedPromotionId,
 *
 *   // Actions
 *   setFilter,
 *   refreshData,
 *   handleShowDetails,
 *   handleShowParticipants,
 *   handleParticipantsRetry,
 * } = usePromotions();
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { usePromotionsStore } from '@/stores/promotions';
import { useUserStore } from '@/stores/user';
import type { PromotionItem, PromotionDetail, PromotionFilter } from '@/types';

export interface FilterTab {
  label: string;
  value: PromotionFilter;
}

export interface UsePromotionsOptions {
  /** Initial filter value (defaults to 'PARTICIPATING') */
  initialFilter?: PromotionFilter;
  /** Auto-fetch on mount */
  immediate?: boolean;
}

export interface UsePromotionsReturn {
  // State
  promotions: ComputedRef<readonly PromotionItem[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  currentFilter: Ref<PromotionFilter>;
  filterTabs: FilterTab[];

  // Detail state
  promotionDetail: ComputedRef<PromotionDetail | null>;
  detailLoading: ComputedRef<boolean>;
  detailError: ComputedRef<string | null>;

  // Excel/Participants state
  excelItems: ComputedRef<readonly Record<string, unknown>[]>;
  excelLoading: ComputedRef<boolean>;
  excelError: ComputedRef<string | null>;
  reportPending: ComputedRef<boolean>;
  estimatedWaitTime: ComputedRef<number | null>;

  // Dialogs
  showDetailDialog: Ref<boolean>;
  showParticipantsDialog: Ref<boolean>;
  selectedPromotionId: Ref<number | null>;
  selectedPromotion: ComputedRef<PromotionItem | null>;

  // Stats
  participationCounts: ComputedRef<Record<PromotionFilter, number>>;
  hasPromotions: ComputedRef<boolean>;

  // Actions
  setFilter: (filter: PromotionFilter) => Promise<void>;
  refreshData: () => Promise<void>;
  fetchForDateRange: (startDate: Date, endDate: Date) => Promise<void>;
  handleShowDetails: (promoID: number) => Promise<void>;
  handleShowParticipants: (
    promoID: number,
    isRecovery?: boolean,
    hasStarted?: boolean,
  ) => Promise<void>;
  handleParticipantsRetry: () => Promise<void>;
  closeDetailDialog: () => void;
  closeParticipantsDialog: () => void;
  clearErrors: () => void;
  applyRecovery: (
    selectedItems: string[],
    isRecovery: boolean,
  ) => Promise<boolean>;
}

const filterTabs: FilterTab[] = [
  { label: 'Доступные', value: 'AVAILABLE' },
  { label: 'Участвую', value: 'PARTICIPATING' },
  { label: 'Не участвую', value: 'SKIPPING' },
];

export function usePromotions(
  options: UsePromotionsOptions = {},
): UsePromotionsReturn {
  const { initialFilter = 'AVAILABLE', immediate = false } = options;

  const promotionsStore = usePromotionsStore();
  const userStore = useUserStore();

  // Local state
  const currentFilter = ref<PromotionFilter>(initialFilter);
  const showDetailDialog = ref(false);
  const showParticipantsDialog = ref(false);
  const selectedPromotionId = ref<number | null>(null);

  // Store state refs
  const promotions = computed(() => promotionsStore.promotions);
  const loading = computed(() => promotionsStore.loading);
  const error = computed(() => promotionsStore.error);
  const promotionDetail = computed(() => promotionsStore.promotionDetail);
  const detailLoading = computed(() => promotionsStore.detailLoading);
  const detailError = computed(() => promotionsStore.detailError);
  const excelItems = computed(() => promotionsStore.excelItems);
  const excelLoading = computed(() => promotionsStore.excelLoading);
  const excelError = computed(() => promotionsStore.excelError);
  const reportPending = computed(() => promotionsStore.reportPending);
  const estimatedWaitTime = computed(() => promotionsStore.estimatedWaitTime);
  const hasPromotions = computed(() => promotionsStore.hasPromotions);

  // Selected promotion computed
  const selectedPromotion = computed(() => {
    if (!selectedPromotionId.value) return null;
    return (
      promotions.value.find((p) => p.promoID === selectedPromotionId.value) ||
      null
    );
  });

  // Participation counts from API response
  const participationCounts = computed(() => {
    const counts = promotionsStore.participationCounts;
    if (!counts) {
      return { AVAILABLE: 0, PARTICIPATING: 0, SKIPPING: 0 };
    }
    return {
      AVAILABLE: counts.available,
      PARTICIPATING: counts.participating,
      SKIPPING: counts.skipped,
    };
  });

  /**
   * Fetch promotions for a specific date range
   */
  async function fetchForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    await promotionsStore.fetchTimeline(
      startDate.toISOString(),
      endDate.toISOString(),
      currentFilter.value,
    );
  }

  /**
   * Refresh data with current filter
   */
  async function refreshData(): Promise<void> {
    // Default to current month + next month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    await fetchForDateRange(startDate, endDate);
  }

  /**
   * Set filter and refresh data
   */
  async function setFilter(filter: PromotionFilter): Promise<void> {
    if (currentFilter.value === filter) return;
    currentFilter.value = filter;
    await refreshData();
  }

  /**
   * Show promotion details
   */
  async function handleShowDetails(promoID: number): Promise<void> {
    selectedPromotionId.value = promoID;
    showDetailDialog.value = true;
    await promotionsStore.fetchDetail(promoID);
  }

  /**
   * Show promotion participants
   */
  async function handleShowParticipants(
    promoID: number,
    isRecovery = true,
    hasStarted?: boolean,
  ): Promise<void> {
    selectedPromotionId.value = promoID;
    showParticipantsDialog.value = true;
    await promotionsStore.selectPromotionAndLoadExcel(
      promoID,
      isRecovery,
      hasStarted,
    );
  }

  /**
   * Retry fetching participants data
   */
  async function handleParticipantsRetry(): Promise<void> {
    if (!selectedPromotionId.value) return;
    const detail = promotionsStore.promotionDetail;
    if (detail?.periodID) {
      await promotionsStore.fetchExcel(detail.periodID);
    }
  }

  /**
   * Close detail dialog
   */
  function closeDetailDialog(): void {
    showDetailDialog.value = false;
    selectedPromotionId.value = null;
  }

  /**
   * Close participants dialog
   */
  function closeParticipantsDialog(): void {
    showParticipantsDialog.value = false;
    selectedPromotionId.value = null;
  }

  /**
   * Clear all errors
   */
  function clearErrors(): void {
    promotionsStore.$patch({
      error: null,
      detailError: null,
      excelError: null,
    });
  }

  // Watch for user changes
  watch(
    () => userStore.user.selectedAccountId,
    () => {
      if (userStore.user.selectedAccountId) {
        refreshData();
      }
    },
  );

  watch(
    () => userStore.activeSupplier?.supplierId,
    () => {
      if (userStore.activeSupplier?.supplierId) {
        refreshData();
      }
    },
  );

  // Immediate fetch if requested
  if (immediate) {
    refreshData();
  }

  return {
    // State
    promotions,
    loading,
    error,
    currentFilter,
    filterTabs,

    // Detail
    promotionDetail,
    detailLoading,
    detailError,

    // Excel
    excelItems,
    excelLoading,
    excelError,
    reportPending,
    estimatedWaitTime,

    // Dialogs
    showDetailDialog,
    showParticipantsDialog,
    selectedPromotionId,
    selectedPromotion,

    // Stats
    participationCounts,
    hasPromotions,

    // Actions
    setFilter,
    refreshData,
    fetchForDateRange,
    handleShowDetails,
    handleShowParticipants,
    handleParticipantsRetry,
    closeDetailDialog,
    closeParticipantsDialog,
    clearErrors,
    applyRecovery: promotionsStore.applyRecovery,
  };
}
