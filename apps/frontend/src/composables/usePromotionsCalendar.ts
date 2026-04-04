/**
 * usePromotionsCalendar Composable
 * 
 * Complex calendar logic for promotions timeline view.
 * Handles:
 * - Month navigation (current, previous, next)
 * - Date calculations (days in month, offsets)
 * - Bi-monthly view (current + next month)
 * - Promotion grouping by month
 * - Today highlighting
 * - Week day localization
 * 
 * @example
 * const {
 *   // Current view
 *   currentDate,
 *   currentMonthLabel,
 *   todayLabel,
 *   visibleMonths,
 *   
 *   // Calendar data
 *   currentMonthDays,
 *   currentMonthOffset,
 *   nextMonthDays,
 *   nextMonthOffset,
 *   weekDays,
 *   
 *   // Navigation
 *   navigateMonth,
 *   goToToday,
 *   goToMonth,
 *   
 *   // Utilities
 *   isToday,
 *   getDaysInMonth,
 *   getMonthOffset,
 *   isDateInMonth,
 * } = usePromotionsCalendar();
 * 
 * // Group promotions by month
 * const { groupByMonth } = usePromotionsCalendar();
 * const grouped = groupByMonth(promotions);
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type { PromotionItem } from '../types';

export interface MonthInfo {
  key: string;
  label: string;
  date: Date;
  year: number;
  month: number;
  daysInMonth: number;
  firstDayOffset: number;
}

export interface GroupedPromotions {
  currentMonth: PromotionItem[];
  nextMonth: PromotionItem[];
  other: PromotionItem[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface UsePromotionsCalendarReturn {
  // Current state
  currentDate: Ref<Date>;
  currentMonthLabel: ComputedRef<string>;
  todayLabel: ComputedRef<string>;
  
  // Month info
  currentMonthInfo: ComputedRef<MonthInfo>;
  nextMonthInfo: ComputedRef<MonthInfo>;
  visibleMonths: ComputedRef<Array<{ key: string; label: string }>>;
  
  // Calendar grid data
  currentMonthDays: ComputedRef<number>;
  currentMonthOffset: ComputedRef<number>;
  nextMonthDays: ComputedRef<number>;
  nextMonthOffset: ComputedRef<number>;
  weekDays: string[];
  
  // Navigation
  navigateMonth: (direction: number) => void;
  goToToday: () => void;
  goToMonth: (year: number, month: number) => void;
  
  // Utilities
  isToday: (monthDate: Date, day: number) => boolean;
  isCurrentMonth: (date: Date) => boolean;
  isNextMonth: (date: Date) => boolean;
  getDaysInMonth: (date: Date) => number;
  getMonthOffset: (date: Date) => number;
  
  // Promotion grouping
  groupByMonth: (promotions: PromotionItem[]) => GroupedPromotions;
  filterByMonth: (promotions: PromotionItem[], monthDate: Date) => PromotionItem[];
  getDateRange: () => DateRange;
  
  // Formatting
  formatMonthLabel: (date: Date) => string;
  formatShortDate: (dateString: string) => string;
  formatDateRange: (startDate: string, endDate: string) => string;
}

// Russian week days (starting from Monday)
const WEEK_DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

// Month names in Russian
const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
];

// Month names in genitive case (for dates)
const MONTH_NAMES_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export function usePromotionsCalendar(): UsePromotionsCalendarReturn {
  // Current date state (represents the first month in the bi-monthly view)
  const currentDate = ref(new Date());
  
  // Today reference (static)
  const today = new Date();
  
  /**
   * Format month label (e.g., "январь 2024 г.")
   */
  function formatMonthLabel(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    });
  }
  
  /**
   * Get number of days in a month
   */
  function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
  
  /**
   * Get the offset (day of week) for the first day of month
   * Returns 0 for Monday, 6 for Sunday
   */
  function getMonthOffset(date: Date): number {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // Convert Sunday (0) to 6, Monday (1) to 0, etc.
    return (firstDay.getDay() + 6) % 7;
  }
  
  /**
   * Create month info object
   */
  function createMonthInfo(date: Date): MonthInfo {
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: formatMonthLabel(date),
      date: new Date(date),
      year: date.getFullYear(),
      month: date.getMonth(),
      daysInMonth: getDaysInMonth(date),
      firstDayOffset: getMonthOffset(date),
    };
  }
  
  // Computed month info
  const currentMonthInfo = computed(() => createMonthInfo(currentDate.value));
  
  const nextMonthInfo = computed(() => {
    const nextDate = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 1,
      1
    );
    return createMonthInfo(nextDate);
  });
  
  // Calendar labels
  const currentMonthLabel = computed(() => currentMonthInfo.value.label);
  
  const todayLabel = computed(() => {
    return today.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  });
  
  // Visible months for headers
  const visibleMonths = computed(() => [
    { key: 'current', label: formatMonthLabel(currentDate.value) },
    { key: 'next', label: formatMonthLabel(nextMonthInfo.value.date) },
  ]);
  
  // Calendar grid data
  const currentMonthDays = computed(() => currentMonthInfo.value.daysInMonth);
  const currentMonthOffset = computed(() => currentMonthInfo.value.firstDayOffset);
  const nextMonthDays = computed(() => nextMonthInfo.value.daysInMonth);
  const nextMonthOffset = computed(() => nextMonthInfo.value.firstDayOffset);
  
  /**
   * Check if a specific day is today
   */
  function isToday(monthDate: Date, day: number): boolean {
    return (
      today.getDate() === day &&
      today.getMonth() === monthDate.getMonth() &&
      today.getFullYear() === monthDate.getFullYear()
    );
  }
  
  /**
   * Check if a date is in the current displayed month
   */
  function isCurrentMonth(date: Date): boolean {
    return (
      date.getMonth() === currentDate.value.getMonth() &&
      date.getFullYear() === currentDate.value.getFullYear()
    );
  }
  
  /**
   * Check if a date is in the next displayed month
   */
  function isNextMonth(date: Date): boolean {
    return (
      date.getMonth() === nextMonthInfo.value.month &&
      date.getFullYear() === nextMonthInfo.value.year
    );
  }
  
  /**
   * Check if a promotion date falls within a specific month
   */
  function isDateInMonth(dateString: string, monthDate: Date): boolean {
    const date = new Date(dateString);
    return (
      date.getMonth() === monthDate.getMonth() &&
      date.getFullYear() === monthDate.getFullYear()
    );
  }
  
  /**
   * Navigate to a different month
   */
  function navigateMonth(direction: number): void {
    currentDate.value = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + direction,
      1
    );
  }
  
  /**
   * Go to today's month
   */
  function goToToday(): void {
    currentDate.value = new Date();
  }
  
  /**
   * Go to a specific month
   */
  function goToMonth(year: number, month: number): void {
    currentDate.value = new Date(year, month, 1);
  }
  
  /**
   * Filter promotions by month
   */
  function filterByMonth(promotions: PromotionItem[], monthDate: Date): PromotionItem[] {
    return promotions.filter(p => isDateInMonth(p.startDate, monthDate));
  }
  
  /**
   * Group promotions by current and next month
   */
  function groupByMonth(promotions: PromotionItem[]): GroupedPromotions {
    return {
      currentMonth: filterByMonth(promotions, currentDate.value),
      nextMonth: filterByMonth(promotions, nextMonthInfo.value.date),
      other: promotions.filter(p => {
        const date = new Date(p.startDate);
        return !isCurrentMonth(date) && !isNextMonth(date);
      }),
    };
  }
  
  /**
   * Get date range for API calls (current month start to next month end)
   */
  function getDateRange(): DateRange {
    const start = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth(),
      1
    );
    const end = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 2,
      0
    );
    return { start, end };
  }
  
  /**
   * Format short date (e.g., "15 января")
   */
  function formatShortDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = MONTH_NAMES_GENITIVE[date.getMonth()];
    return `${day} ${month}`;
  }
  
  /**
   * Format date range (e.g., "15 января - 20 февраля")
   */
  function formatDateRange(startDate: string, endDate: string): string {
    const start = formatShortDate(startDate);
    const end = formatShortDate(endDate);
    return `${start} - ${end}`;
  }
  
  return {
    // State
    currentDate,
    currentMonthLabel,
    todayLabel,
    
    // Month info
    currentMonthInfo,
    nextMonthInfo,
    visibleMonths,
    
    // Calendar grid
    currentMonthDays,
    currentMonthOffset,
    nextMonthDays,
    nextMonthOffset,
    weekDays: WEEK_DAYS,
    
    // Navigation
    navigateMonth,
    goToToday,
    goToMonth,
    
    // Utilities
    isToday,
    isCurrentMonth,
    isNextMonth,
    getDaysInMonth,
    getMonthOffset,
    
    // Promotion grouping
    groupByMonth,
    filterByMonth,
    getDateRange,
    
    // Formatting
    formatMonthLabel,
    formatShortDate,
    formatDateRange,
  };
}
