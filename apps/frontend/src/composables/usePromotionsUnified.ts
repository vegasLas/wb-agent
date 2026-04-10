/**
 * usePromotionsUnified Composable
 *
 * A high-level composable that combines all promotion-related functionality
 * into a single, easy-to-use interface. This is the recommended way to work
 * with promotions in components.
 *
 * Combines:
 * - usePromotions (data fetching, filtering, dialogs)
 * - usePromotionsCalendar (calendar navigation, date logic)
 * - usePromotionItem (item display logic)
 * - usePromotionDetail (detail display logic)
 *
 * @example
 * // Basic usage
 * const promotions = usePromotionsUnified({ immediate: true });
 *
 * // Access state
 * console.log(promotions.currentMonthLabel.value);
 * console.log(promotions.filteredPromotions.value);
 *
 * // Navigate
 * promotions.navigateMonth(1);
 *
 * // Show dialogs
 * await promotions.handleShowDetails(promoId);
 *
 * // Use in template with promotion card
 * <PromotionCard
 *   v-for="promo in promotions.groupedPromotions.currentMonth"
 *   :key="promo.promoID"
 *   :promotion="promo"
 *   @show-details="promotions.handleShowDetails"
 * />
 */

import { computed, type ComputedRef, type Ref } from 'vue';
import {
  usePromotions,
  type PromotionFilter,
  type FilterTab,
} from './usePromotions';
import {
  usePromotionsCalendar,
  type MonthInfo,
  type GroupedPromotions,
} from './usePromotionsCalendar';
import {
  usePromotionItem,
  usePromotionDetail,
  type UsePromotionItemReturn,
  type UsePromotionDetailReturn,
} from './usePromotionItem';
import type { PromotionItem, PromotionDetail } from '../types';

export interface UsePromotionsUnifiedOptions {
  /** Initial filter value (defaults to 'PARTICIPATING') */
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

  // Excel data
  excelItems: Ref<readonly Record<string, unknown>[]>;
  excelLoading: Ref<boolean>;
  excelError: Ref<string | null>;
  reportPending: Ref<boolean>;
  estimatedWaitTime: Ref<number | null>;

  // ==================== FILTERING ====================

  currentFilter: Ref<PromotionFilter>;
  filterTabs: FilterTab[];
  participationCounts: Ref<Record<PromotionFilter, number>>;
  emptyState: ComputedRef<EmptyStateConfig>;

  // ==================== CALENDAR ====================

  currentDate: ComputedRef<Date>;
  currentMonthLabel: ComputedRef<string>;
  todayLabel: ComputedRef<string>;
  visibleMonths: ComputedRef<Array<{ key: string; label: string }>>;

  // Calendar grid
  currentMonthDays: ComputedRef<number>;
  currentMonthOffset: ComputedRef<number>;
  nextMonthDays: ComputedRef<number>;
  nextMonthOffset: ComputedRef<number>;
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
  /** Apply recovery/exclusion for selected items */
  applyRecovery: (selectedItems: string[], isRecovery: boolean) => Promise<boolean>;
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
  const calendar = usePromotionsCalendar();

  // Computed wrapper for current filter to make it readable
  const currentFilter = computed(() => promotions.currentFilter.value);

  // Empty state based on current filter
  const emptyState = computed(() => EMPTY_STATE_MESSAGES[currentFilter.value]);

  // Grouped promotions (re-computed when promotions or calendar changes)
  const groupedPromotions = computed(() =>
    calendar.groupByMonth([...promotions.promotions.value]),
  );

  // Current month promotions
  const currentMonthPromotions = computed(
    () => groupedPromotions.value.currentMonth,
  );

  // Next month promotions
  const nextMonthPromotions = computed(() => groupedPromotions.value.nextMonth);

  // Selected promotion display helpers
  const selectedPromotionDisplay = computed(() => {
    if (!promotions.selectedPromotion.value) return null;
    return usePromotionItem(promotions.selectedPromotion.value);
  });

  // Selected promotion detail display
  const selectedPromotionDetailDisplay = computed(() =>
    usePromotionDetail(promotions.promotionDetail.value),
  );

  /**
   * Navigate month and refresh data
   */
  async function navigateMonth(direction: number): Promise<void> {
    calendar.navigateMonth(direction);
    const { start, end } = calendar.getDateRange();
    await promotions.fetchForDateRange(start, end);
  }

  /**
   * Go to today and refresh data
   */
  async function goToToday(): Promise<void> {
    calendar.goToToday();
    const { start, end } = calendar.getDateRange();
    await promotions.fetchForDateRange(start, end);
  }

  /**
   * Refresh data for current date range
   */
  async function refreshData(): Promise<void> {
    const { start, end } = calendar.getDateRange();
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

    // Excel
    excelItems: promotions.excelItems,
    excelLoading: promotions.excelLoading,
    excelError: promotions.excelError,
    reportPending: promotions.reportPending,
    estimatedWaitTime: promotions.estimatedWaitTime,

    // Filtering
    currentFilter,
    filterTabs: promotions.filterTabs,
    participationCounts: promotions.participationCounts,
    emptyState,

    // Calendar
    currentDate: computed(() => calendar.currentDate.value),
    currentMonthLabel: calendar.currentMonthLabel,
    todayLabel: calendar.todayLabel,
    visibleMonths: calendar.visibleMonths,

    // Calendar grid
    currentMonthDays: calendar.currentMonthDays,
    currentMonthOffset: calendar.currentMonthOffset,
    nextMonthDays: calendar.nextMonthDays,
    nextMonthOffset: calendar.nextMonthOffset,
    weekDays: calendar.weekDays,

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
    isToday: calendar.isToday,
    formatDateRange: calendar.formatDateRange,
    applyRecovery: promotions.applyRecovery,
  };
}
