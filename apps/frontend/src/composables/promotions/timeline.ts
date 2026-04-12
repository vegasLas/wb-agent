/**
 * usePromotionsTimeline Composable
 *
 * Handles all timeline-related logic for the promotions calendar view.
 * Includes date calculations, positioning, and grouping of promotions.
 *
 * @example
 * const timeline = usePromotionsTimeline(promotions, currentDate);
 *
 * // Access computed values
 * console.log(timeline.currentMonthDays.value); // days in current month
 * console.log(timeline.getPromotionStyle(promotion)); // { left: '100px', width: '200px' }
 */

import { computed, type ComputedRef, type Ref } from 'vue';
import type { PromotionItem } from '@/types';

export interface MonthInfo {
  year: number;
  month: number;
  daysInMonth: number;
  date: Date;
}

export interface PromotionPosition {
  left: string;
  width?: string;
}

export interface UsePromotionsTimelineReturn {
  // Month info
  currentMonthInfo: ComputedRef<MonthInfo>;
  nextMonthInfo: ComputedRef<MonthInfo>;
  visibleMonthsInfo: ComputedRef<Array<{ key: string; label: string }>>;

  // Days lists
  currentMonthDaysList: ComputedRef<number[]>;
  nextMonthDaysList: ComputedRef<number[]>;

  // Timeline config
  totalTimelineDays: ComputedRef<number>;
  timelineStartDate: ComputedRef<Date>;
  totalWidth: ComputedRef<number>;
  columnWidth: number;

  // Utilities
  isToday: (monthDate: Date, day: number) => boolean;
  getPromotionStyle: (promotion: PromotionItem) => PromotionPosition;
  groupPromotionsIntoRows: (promotions: PromotionItem[]) => PromotionItem[][];
}

// Column width in pixels
const COLUMN_WIDTH = 40;

/**
 * Composable for promotions timeline functionality
 */
export function usePromotionsTimeline(
  currentDate: Ref<Date>,
): UsePromotionsTimelineReturn {
  // Get month info
  const currentMonthInfo = computed((): MonthInfo => {
    const date = currentDate.value;
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { year, month, daysInMonth, date: new Date(date) };
  });

  const nextMonthInfo = computed((): MonthInfo => {
    const date = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 1,
      1,
    );
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { year, month, daysInMonth, date };
  });

  const visibleMonthsInfo = computed(() => [
    {
      key: 'current',
      label: currentMonthInfo.value.date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      }),
    },
    {
      key: 'next',
      label: nextMonthInfo.value.date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      }),
    },
  ]);

  // Day lists for grid columns
  const currentMonthDaysList = computed(() =>
    Array.from({ length: currentMonthInfo.value.daysInMonth }, (_, i) => i + 1),
  );

  const nextMonthDaysList = computed(() =>
    Array.from({ length: nextMonthInfo.value.daysInMonth }, (_, i) => i + 1),
  );

  // Total timeline days
  const totalTimelineDays = computed(
    () => currentMonthInfo.value.daysInMonth + nextMonthInfo.value.daysInMonth,
  );

  // Timeline start date
  const timelineStartDate = computed(
    () =>
      new Date(currentMonthInfo.value.year, currentMonthInfo.value.month, 1),
  );

  // Total width for the timeline container
  const totalWidth = computed(() => totalTimelineDays.value * COLUMN_WIDTH);

  // Check if today
  function isToday(monthDate: Date, day: number): boolean {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === monthDate.getMonth() &&
      today.getFullYear() === monthDate.getFullYear()
    );
  }

  /**
   * Parse and normalize a promotion date string to midnight local time
   */
  function parsePromotionDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Calculate promotion position style using pixel-based positioning
  function getPromotionStyle(promotion: PromotionItem): PromotionPosition {
    const startDate = parsePromotionDate(promotion.startDate);
    const endDate = parsePromotionDate(promotion.endDate);

    if (!startDate || !endDate) {
      return { display: 'none' } as unknown as PromotionPosition;
    }

    const timelineStart = new Date(timelineStartDate.value);
    timelineStart.setHours(0, 0, 0, 0);

    // Calculate days from timeline start
    const msPerDay = 1000 * 60 * 60 * 24;
    const startOffsetDays = Math.floor(
      (startDate.getTime() - timelineStart.getTime()) / msPerDay,
    );
    const durationDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    // Calculate pixel positions
    let leftPx = startOffsetDays * COLUMN_WIDTH;
    let widthPx = durationDays * COLUMN_WIDTH;

    // Ensure minimum visibility (at least 1 day = 40px, max 3 days = 120px)
    // to prevent excessive overlap while keeping content readable
    widthPx = Math.max(widthPx, COLUMN_WIDTH);

    // Clamp to visible area
    if (leftPx < 0) {
      widthPx += leftPx;
      leftPx = 0;
    }
    const maxWidth = totalWidth.value - leftPx;
    if (widthPx > maxWidth) {
      widthPx = maxWidth;
    }

    return {
      left: `${leftPx}px`,
      width: `${Math.max(widthPx, COLUMN_WIDTH)}px`,
    };
  }

  // Group promotions into rows to avoid overlaps
  function groupPromotionsIntoRows(
    promotions: PromotionItem[],
  ): PromotionItem[][] {
    // Pre-parse and normalize all dates to midnight for consistent comparison
    const dateMap = new Map<
      PromotionItem,
      { start: Date | null; end: Date | null }
    >();

    for (const p of promotions) {
      dateMap.set(p, {
        start: parsePromotionDate(p.startDate),
        end: parsePromotionDate(p.endDate),
      });
    }

    // Sort by start date
    const sorted = [...promotions].sort((a, b) => {
      const aTime = dateMap.get(a)?.start?.getTime() ?? 0;
      const bTime = dateMap.get(b)?.start?.getTime() ?? 0;
      return aTime - bTime;
    });

    const rows: PromotionItem[][] = [];

    for (const promotion of sorted) {
      const dates = dateMap.get(promotion);
      const start = dates?.start?.getTime() ?? 0;
      const end = dates?.end?.getTime() ?? 0;

      // Skip promotions with invalid dates
      if (!start || !end || end < start) {
        rows.push([promotion]);
        continue;
      }

      // Find a row where this promotion doesn't overlap with any existing one
      let placed = false;
      for (const row of rows) {
        const hasOverlap = row.some((existing) => {
          const existingDates = dateMap.get(existing);
          const existingStart = existingDates?.start?.getTime() ?? 0;
          const existingEnd = existingDates?.end?.getTime() ?? 0;

          // Check for overlap (inclusive date ranges)
          return start <= existingEnd && end >= existingStart;
        });

        if (!hasOverlap) {
          row.push(promotion);
          placed = true;
          break;
        }
      }

      // If no non-overlapping row found, create a new row
      if (!placed) {
        rows.push([promotion]);
      }
    }

    return rows;
  }

  return {
    // Month info
    currentMonthInfo,
    nextMonthInfo,
    visibleMonthsInfo,

    // Days lists
    currentMonthDaysList,
    nextMonthDaysList,

    // Timeline config
    totalTimelineDays,
    timelineStartDate,
    totalWidth,
    columnWidth: COLUMN_WIDTH,

    // Utilities
    isToday,
    getPromotionStyle,
    groupPromotionsIntoRows,
  };
}
