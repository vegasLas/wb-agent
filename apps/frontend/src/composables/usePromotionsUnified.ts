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

import { computed, type ComputedRef } from 'vue';
import { usePromotions, type PromotionFilter, type FilterTab } from './usePromotions';
import { usePromotionsCalendar, type MonthInfo, type GroupedPromotions } from './usePromotionsCalendar';
import { usePromotionItem, usePromotionDetail, type UsePromotionItemReturn, type UsePromotionDetailReturn } from './usePromotionItem';
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
  promotions: ComputedRef<readonly PromotionItem[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  hasPromotions: ComputedRef<boolean>;
  
  // Detail data
  promotionDetail: ComputedRef<PromotionDetail | null>;
  detailLoading: ComputedRef<boolean>;
  detailError: ComputedRef<string | null>;
  
  // Excel data
  excelItems: ComputedRef<readonly Record<string, unknown>[]>;
  excelLoading: ComputedRef<boolean>;
  excelError: ComputedRef<string | null>;
  reportPending: ComputedRef<boolean>;
  estimatedWaitTime: ComputedRef<number | null>;
  
  // ==================== FILTERING ====================
  
  currentFilter: ComputedRef<PromotionFilter>;
  filterTabs: FilterTab[];
  participationCounts: ComputedRef<Record<PromotionFilter, number>>;
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
  
  showDetailDialog: ComputedRef<boolean>;
  showParticipantsDialog: ComputedRef<boolean>;
  selectedPromotionId: ComputedRef<number | null>;
  selectedPromotion: ComputedRef<PromotionItem | null>;
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
}

// Empty state messages
const EMPTY_STATE_MESSAGES: Record<PromotionFilter, EmptyStateConfig> = {
  PARTICIPATING: {
    message: 'У вас пока нет акций, в которых вы участвуете',
    icon: 'pi pi-calendar-times',
  },
  SKIPPED: {
    message: 'У вас нет пропущенных акций',
    icon: 'pi pi-calendar-minus',
  },
  ALL: {
    message: 'Нет доступных акций',
    icon: 'pi pi-calendar',
  },
};

export function usePromotionsUnified(
  options: UsePromotionsUnifiedOptions = {}
): UsePromotionsUnifiedReturn {
  const { initialFilter = 'PARTICIPATING', immediate = false } = options;
  
  // Initialize sub-composables
  const promotions = usePromotions({ initialFilter, immediate: false });
  const calendar = usePromotionsCalendar();
  
  // Computed wrapper for current filter to make it readable
  const currentFilter = computed(() => promotions.currentFilter.value);
  
  // Empty state based on current filter
  const emptyState = computed(() => EMPTY_STATE_MESSAGES[currentFilter.value]);
  
  // Grouped promotions (re-computed when promotions or calendar changes)
  const groupedPromotions = computed(() => 
    calendar.groupByMonth([...promotions.promotions.value])
  );
  
  // Current month promotions
  const currentMonthPromotions = computed(() => groupedPromotions.value.currentMonth);
  
  // Next month promotions
  const nextMonthPromotions = computed(() => groupedPromotions.value.nextMonth);
  
  // Selected promotion display helpers
  const selectedPromotionDisplay = computed(() => {
    if (!promotions.selectedPromotion.value) return null;
    return usePromotionItem(promotions.selectedPromotion.value);
  });
  
  // Selected promotion detail display
  const selectedPromotionDetailDisplay = computed(() => 
    usePromotionDetail(promotions.promotionDetail.value)
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
  };
}
