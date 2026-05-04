/**
 * usePromotionsUnified Composable
 *
 * A high-level composable that combines all promotion-related functionality
 * into a single, easy-to-use interface. This is the recommended way to work
 * with promotions in components.
 *
 * Combines:
 * - usePromotions (data fetching, filtering, dialogs)
 * - usePromotionsTimeline (calendar navigation, date logic, timeline layout)
 * - usePromotionItem (item display logic)
 * - usePromotionDetail (detail display logic)
 */

import { computed, type ComputedRef, type Ref } from 'vue';
import { usePromotions, type FilterTab } from './main';
import type { PromotionFilter } from '@/types';
import {
  usePromotionsTimeline,
  type GroupedPromotions,
} from './timeline';
import {
  usePromotionItem,
  usePromotionDetail,
  type UsePromotionItemReturn,
  type UsePromotionDetailReturn,
} from './item';
import type { PromotionItem, PromotionDetail } from '@/types';

export interface UsePromotionsUnifiedOptions {
  /** Initial filter value (defaults to 'AVAILABLE') */
  initialFilter?: PromotionFilter;
  /** Auto-fetch on mount */
  immediate?: boolean;
}

export interface EmptyStateConfig {
  message: string;
  icon: string;
}

export interface UsePromotionsUnifiedReturn {
  // ==================== STATE ====================

  // Promotions data
  promotions: Ref<readonly PromotionItem[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  hasPromotions: Ref<boolean>;

  // Detail data
  promotionDetail: Ref<PromotionDetail | null>;
  detailLoading: Ref<boolean>;
  detailError: Ref<string | null>;

  // Goods data
  goodsItems: Ref<readonly Record<string, unknown>[]>;
  goodsLoading: Ref<boolean>;
  goodsError: Ref<string | null>;
  reportPending: Ref<boolean>;
  estimatedWaitTime: Ref<number | null>;

  // ==================== FILTERING ====================

  currentFilter: Ref<PromotionFilter>;
  filterTabs: FilterTab[];
  participationCounts: Ref<Record<PromotionFilter, number>>;
  emptyState: ComputedRef<EmptyStateConfig>;

  // ==================== CALENDAR / TIMELINE ====================

  currentDate: ComputedRef<Date>;
  currentMonthLabel: ComputedRef<string>;
  todayLabel: ComputedRef<string>;
  visibleMonths: ComputedRef<Array<{ key: string; label: string }>>;

  // Timeline grid
  currentMonthDaysList: ComputedRef<number[]>;
  nextMonthDaysList: ComputedRef<number[]>;
  totalTimelineDays: ComputedRef<number>;
  totalWidth: ComputedRef<number>;
  columnWidth: number;
  weekDays: string[];

  // Grouped promotions
  groupedPromotions: ComputedRef<GroupedPromotions>;
  currentMonthPromotions: ComputedRef<PromotionItem[]>;
  nextMonthPromotions: ComputedRef<PromotionItem[]>;

  // ==================== DIALOGS ====================

  showDetailDialog: Ref<boolean>;
  showParticipantsDialog: Ref<boolean>;
  selectedPromotionId: Ref<number | null>;
  selectedPromotion: Ref<PromotionItem | null>;
  selectedPromotionDisplay: ComputedRef<UsePromotionItemReturn | null>;
  selectedPromotionDetailDisplay: ComputedRef<UsePromotionDetailReturn | null>;

  // ==================== ACTIONS ====================

  /** Set filter and refresh data */
  setFilter: (filter: PromotionFilter) => Promise<void>;
  /** Refresh data for current date range */
  refreshData: () => Promise<void>;
  /** Navigate to different month (direction: -1 for prev, 1 for next) */
  navigateMonth: (direction: number) => Promise<void>;
  /** Go to today's month */
  goToToday: () => Promise<void>;
  /** Show promotion details dialog */
  handleShowDetails: (promoID: number) => Promise<void>;
  /** Show participants dialog */
  handleShowParticipants: (promoID: number) => Promise<void>;
  /** Retry fetching participants */
  handleParticipantsRetry: () => Promise<void>;
  /** Close detail dialog */
  closeDetailDialog: () => void;
  /** Close participants dialog */
  closeParticipantsDialog: () => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Check if a day is today */
  isToday: (monthDate: Date, day: number) => boolean;
  /** Format date range */
  formatDateRange: (startDate: string, endDate: string) => string;
  /** Get promotion card style for timeline positioning */
  getPromotionStyle: (promotion: PromotionItem) => { left: string; width?: string };
  /** Group promotions into non-overlapping rows */
  groupPromotionsIntoRows: (promotions: PromotionItem[]) => PromotionItem[][];
  /** Apply management for selected items */
  applyManagement: (
    selectedItems: string[],
    isRecovery: boolean,
  ) => Promise<boolean>;
}

// Empty state messages
const EMPTY_STATE_MESSAGES: Record<PromotionFilter, EmptyStateConfig> = {
  PARTICIPATING: {
    message: 'У вас пока нет акций, в которых вы участвуете',
    icon: 'pi pi-calendar-times',
  },
  SKIPPING: {
    message: 'У вас нет пропущенных акций',
    icon: 'pi pi-calendar-minus',
  },
  AVAILABLE: {
    message: 'Нет доступных акций',
    icon: 'pi pi-calendar',
  },
};

export function usePromotionsUnified(
  options: UsePromotionsUnifiedOptions = {},
): UsePromotionsUnifiedReturn {
  const { initialFilter = 'AVAILABLE', immediate = false } = options;

  // Initialize sub-composables
  const promotions = usePromotions({ initialFilter, immediate: false });
  const timeline = usePromotionsTimeline();

  // Computed wrapper for current filter
  const currentFilter = computed(() => promotions.currentFilter.value);

  // Empty state based on current filter
  const emptyState = computed(() => EMPTY_STATE_MESSAGES[currentFilter.value]);

  // Grouped promotions
  const groupedPromotions = computed(() =>
    timeline.groupByMonth([...promotions.promotions.value]),
  );

  const currentMonthPromotions = computed(
    () => groupedPromotions.value.currentMonth,
  );

  const nextMonthPromotions = computed(
    () => groupedPromotions.value.nextMonth,
  );

  // Selected promotion display helpers
  const selectedPromotionDisplay = computed(() => {
    if (!promotions.selectedPromotion.value) return null;
    return usePromotionItem(promotions.selectedPromotion.value);
  });

  const selectedPromotionDetailDisplay = computed(() =>
    usePromotionDetail(promotions.promotionDetail.value),
  );

  /**
   * Navigate month and refresh data
   */
  async function navigateMonth(direction: number): Promise<void> {
    timeline.navigateMonth(direction);
    const { start, end } = timeline.getDateRange();
    await promotions.fetchForDateRange(start, end);
  }

  /**
   * Go to today and refresh data
   */
  async function goToToday(): Promise<void> {
    timeline.goToToday();
    const { start, end } = timeline.getDateRange();
    await promotions.fetchForDateRange(start, end);
  }

  /**
   * Refresh data for current date range
   */
  async function refreshData(): Promise<void> {
    const { start, end } = timeline.getDateRange();
    await promotions.fetchForDateRange(start, end);
  }

  /**
   * Set filter and refresh
   */
  async function setFilter(filter: PromotionFilter): Promise<void> {
    await promotions.setFilter(filter);
  }

  // Initial fetch if requested
  if (immediate) {
    refreshData();
  }

  return {
    // State
    promotions: promotions.promotions,
    loading: promotions.loading,
    error: promotions.error,
    hasPromotions: promotions.hasPromotions,

    // Detail
    promotionDetail: promotions.promotionDetail,
    detailLoading: promotions.detailLoading,
    detailError: promotions.detailError,

    // Goods
    goodsItems: promotions.goodsItems,
    goodsLoading: promotions.goodsLoading,
    goodsError: promotions.goodsError,
    reportPending: promotions.reportPending,
    estimatedWaitTime: promotions.estimatedWaitTime,

    // Filtering
    currentFilter,
    filterTabs: promotions.filterTabs,
    participationCounts: promotions.participationCounts,
    emptyState,

    // Calendar / Timeline
    currentDate: computed(() => timeline.currentMonthInfo.value.date),
    currentMonthLabel: timeline.currentMonthLabel,
    todayLabel: timeline.todayLabel,
    visibleMonths: timeline.visibleMonthsInfo,

    // Timeline grid
    currentMonthDaysList: timeline.currentMonthDaysList,
    nextMonthDaysList: timeline.nextMonthDaysList,
    totalTimelineDays: timeline.totalTimelineDays,
    totalWidth: timeline.totalWidth,
    columnWidth: timeline.columnWidth,
    weekDays: timeline.weekDays,

    // Grouped
    groupedPromotions,
    currentMonthPromotions,
    nextMonthPromotions,

    // Dialogs
    showDetailDialog: promotions.showDetailDialog,
    showParticipantsDialog: promotions.showParticipantsDialog,
    selectedPromotionId: promotions.selectedPromotionId,
    selectedPromotion: promotions.selectedPromotion,
    selectedPromotionDisplay,
    selectedPromotionDetailDisplay,

    // Actions
    setFilter,
    refreshData,
    navigateMonth,
    goToToday,
    handleShowDetails: promotions.handleShowDetails,
    handleShowParticipants: promotions.handleShowParticipants,
    handleParticipantsRetry: promotions.handleParticipantsRetry,
    closeDetailDialog: promotions.closeDetailDialog,
    closeParticipantsDialog: promotions.closeParticipantsDialog,
    clearErrors: promotions.clearErrors,
    isToday: timeline.isToday,
    formatDateRange: timeline.formatDateRange,
    getPromotionStyle: timeline.getPromotionStyle,
    groupPromotionsIntoRows: timeline.groupPromotionsIntoRows,
    applyManagement: promotions.applyManagement,
  };
}
