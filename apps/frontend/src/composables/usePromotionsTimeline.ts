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
import { usePromotionItem } from './usePromotionItem';
import type { PromotionItem } from '../types';

export interface MonthInfo {
  year: number;
  month: number;
  daysInMonth: number;
  date: Date;
}

export interface PromotionPosition {
  left: string;
  width: string;
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

  // Calculate promotion position style using pixel-based positioning
  function getPromotionStyle(promotion: PromotionItem): PromotionPosition {
    const display = usePromotionItem(() => promotion);
    const startDate = display.startDate.value;
    const endDate = display.endDate.value;

    if (!startDate || !endDate) {
      return { display: 'none' } as unknown as PromotionPosition;
    }

    const timelineStart = new Date(timelineStartDate.value);
    timelineStart.setHours(0, 0, 0, 0);

    const promoStart = new Date(startDate);
    promoStart.setHours(0, 0, 0, 0);

    const promoEnd = new Date(endDate);
    promoEnd.setHours(0, 0, 0, 0);

    // Calculate days from timeline start
    const msPerDay = 1000 * 60 * 60 * 24;
    const startOffsetDays = Math.floor(
      (promoStart.getTime() - timelineStart.getTime()) / msPerDay,
    );
    const durationDays =
      Math.floor((promoEnd.getTime() - promoStart.getTime()) / msPerDay) + 1;

    // Calculate pixel positions
    let leftPx = startOffsetDays * COLUMN_WIDTH;
    let widthPx = durationDays * COLUMN_WIDTH;

    // Ensure minimum visibility (at least 200px width so content is readable)
    widthPx = Math.max(widthPx, 200);

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
      width: `${Math.max(widthPx, 180)}px`,
    };
  }

  // Group promotions into rows to avoid overlaps
  function groupPromotionsIntoRows(
    promotions: PromotionItem[],
  ): PromotionItem[][] {
    const sorted = [...promotions].sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    const rows: PromotionItem[][] = [];

    for (const promotion of sorted) {
      const display = usePromotionItem(() => promotion);
      const start = display.startDate.value?.getTime() ?? 0;
      const end = display.endDate.value?.getTime() ?? 0;

      // Find a row that doesn't overlap
      let placed = false;
      for (const row of rows) {
        const hasOverlap = row.some((existing) => {
          const existingDisplay = usePromotionItem(() => existing);
          const existingStart = existingDisplay.startDate.value?.getTime() ?? 0;
          const existingEnd = existingDisplay.endDate.value?.getTime() ?? 0;

          // Check for overlap
          return start <= existingEnd && end >= existingStart;
        });

        if (!hasOverlap) {
          row.push(promotion);
          placed = true;
          break;
        }
      }

      // If no row found, create new row
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
