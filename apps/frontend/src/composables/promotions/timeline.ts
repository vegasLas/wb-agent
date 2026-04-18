/**
 * usePromotionsTimeline Composable
 *
 * Unified calendar + timeline logic for the promotions view.
 * Handles month navigation, date calculations, pixel positioning,
 * and promotion row grouping.
 */

import { ref, computed, type ComputedRef, type Ref } from 'vue';
import type { PromotionItem } from '@/types';

// ─── Types ──────────────────────────────────────────────────────────────────

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

export interface DateRange {
  start: Date;
  end: Date;
}

export interface GroupedPromotions {
  currentMonth: PromotionItem[];
  nextMonth: PromotionItem[];
  other: PromotionItem[];
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

  // Calendar labels
  currentMonthLabel: ComputedRef<string>;
  todayLabel: ComputedRef<string>;
  weekDays: string[];

  // Navigation
  navigateMonth: (direction: number) => void;
  goToToday: () => void;

  // Utilities
  isToday: (monthDate: Date, day: number) => boolean;
  getPromotionStyle: (promotion: PromotionItem) => PromotionPosition;
  groupPromotionsIntoRows: (promotions: PromotionItem[]) => PromotionItem[][];

  // Calendar grouping
  groupByMonth: (promotions: PromotionItem[]) => GroupedPromotions;
  getDateRange: () => DateRange;
  formatDateRange: (startDate: string, endDate: string) => string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COLUMN_WIDTH = 40;

const WEEK_DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

const MONTH_NAMES_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function createMonthInfo(date: Date): MonthInfo {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    daysInMonth: getDaysInMonth(date),
    date: new Date(date),
  };
}

function parsePromotionDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

// ─── Composable ─────────────────────────────────────────────────────────────

export function usePromotionsTimeline(): UsePromotionsTimelineReturn {
  const currentDate = ref(new Date());
  const today = new Date();

  // ── Month Info ───────────────────────────────────────────────────────────

  const currentMonthInfo = computed((): MonthInfo =>
    createMonthInfo(currentDate.value),
  );

  const nextMonthInfo = computed((): MonthInfo => {
    const date = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 1,
      1,
    );
    return createMonthInfo(date);
  });

  const visibleMonthsInfo = computed(() => [
    {
      key: 'current',
      label: formatMonthLabel(currentDate.value),
    },
    {
      key: 'next',
      label: formatMonthLabel(nextMonthInfo.value.date),
    },
  ]);

  // ── Calendar Labels ──────────────────────────────────────────────────────

  const currentMonthLabel = computed(() => currentMonthInfo.value.label);

  const todayLabel = computed(() =>
    today.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    }),
  );

  // ── Day Lists ────────────────────────────────────────────────────────────

  const currentMonthDaysList = computed(() =>
    Array.from(
      { length: currentMonthInfo.value.daysInMonth },
      (_, i) => i + 1,
    ),
  );

  const nextMonthDaysList = computed(() =>
    Array.from(
      { length: nextMonthInfo.value.daysInMonth },
      (_, i) => i + 1,
    ),
  );

  // ── Timeline Dimensions ──────────────────────────────────────────────────

  const totalTimelineDays = computed(
    () => currentMonthInfo.value.daysInMonth + nextMonthInfo.value.daysInMonth,
  );

  const timelineStartDate = computed(
    () =>
      new Date(
        currentMonthInfo.value.year,
        currentMonthInfo.value.month,
        1,
      ),
  );

  const totalWidth = computed(() => totalTimelineDays.value * COLUMN_WIDTH);

  // ── Navigation ───────────────────────────────────────────────────────────

  function navigateMonth(direction: number): void {
    currentDate.value = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + direction,
      1,
    );
  }

  function goToToday(): void {
    currentDate.value = new Date();
  }

  // ── Today Check ──────────────────────────────────────────────────────────

  function isToday(monthDate: Date, day: number): boolean {
    return (
      today.getDate() === day &&
      today.getMonth() === monthDate.getMonth() &&
      today.getFullYear() === monthDate.getFullYear()
    );
  }

  // ── Promotion Positioning ────────────────────────────────────────────────

  function getPromotionStyle(promotion: PromotionItem): PromotionPosition {
    const startDate = parsePromotionDate(promotion.startDate);
    const endDate = parsePromotionDate(promotion.endDate);

    if (!startDate || !endDate) {
      return { display: 'none' } as unknown as PromotionPosition;
    }

    const timelineStart = new Date(timelineStartDate.value);
    timelineStart.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const startOffsetDays = Math.floor(
      (startDate.getTime() - timelineStart.getTime()) / msPerDay,
    );
    const durationDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    let leftPx = startOffsetDays * COLUMN_WIDTH;
    let widthPx = durationDays * COLUMN_WIDTH;

    widthPx = Math.max(widthPx, COLUMN_WIDTH);

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

  // ── Row Grouping ─────────────────────────────────────────────────────────

  function groupPromotionsIntoRows(
    promotions: PromotionItem[],
  ): PromotionItem[][] {
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

      if (!start || !end || end < start) {
        rows.push([promotion]);
        continue;
      }

      let placed = false;
      for (const row of rows) {
        const hasOverlap = row.some((existing) => {
          const existingDates = dateMap.get(existing);
          const existingStart = existingDates?.start?.getTime() ?? 0;
          const existingEnd = existingDates?.end?.getTime() ?? 0;
          return start <= existingEnd && end >= existingStart;
        });

        if (!hasOverlap) {
          row.push(promotion);
          placed = true;
          break;
        }
      }

      if (!placed) {
        rows.push([promotion]);
      }
    }

    return rows;
  }

  // ── Month Grouping ───────────────────────────────────────────────────────

  function isDateInMonth(dateString: string, monthDate: Date): boolean {
    const date = new Date(dateString);
    return (
      date.getMonth() === monthDate.getMonth() &&
      date.getFullYear() === monthDate.getFullYear()
    );
  }

  function isCurrentMonth(date: Date): boolean {
    return (
      date.getMonth() === currentDate.value.getMonth() &&
      date.getFullYear() === currentDate.value.getFullYear()
    );
  }

  function isNextMonth(date: Date): boolean {
    return (
      date.getMonth() === nextMonthInfo.value.month &&
      date.getFullYear() === nextMonthInfo.value.year
    );
  }

  function filterByMonth(
    promotions: PromotionItem[],
    monthDate: Date,
  ): PromotionItem[] {
    return promotions.filter((p) => isDateInMonth(p.startDate, monthDate));
  }

  function groupByMonth(promotions: PromotionItem[]): GroupedPromotions {
    return {
      currentMonth: filterByMonth(promotions, currentDate.value),
      nextMonth: filterByMonth(promotions, nextMonthInfo.value.date),
      other: promotions.filter((p) => {
        const date = new Date(p.startDate);
        return !isCurrentMonth(date) && !isNextMonth(date);
      }),
    };
  }

  // ── Date Range ───────────────────────────────────────────────────────────

  function getDateRange(): DateRange {
    const start = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth(),
      1,
    );
    const end = new Date(
      currentDate.value.getFullYear(),
      currentDate.value.getMonth() + 2,
      0,
    );
    return { start, end };
  }

  // ── Formatting ───────────────────────────────────────────────────────────

  function formatShortDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = MONTH_NAMES_GENITIVE[date.getMonth()];
    return `${day} ${month}`;
  }

  function formatDateRange(startDate: string, endDate: string): string {
    const start = formatShortDate(startDate);
    const end = formatShortDate(endDate);
    return `${start} - ${end}`;
  }

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    currentMonthInfo,
    nextMonthInfo,
    visibleMonthsInfo,
    currentMonthDaysList,
    nextMonthDaysList,
    totalTimelineDays,
    timelineStartDate,
    totalWidth,
    columnWidth: COLUMN_WIDTH,
    currentMonthLabel,
    todayLabel,
    weekDays: WEEK_DAYS,
    navigateMonth,
    goToToday,
    isToday,
    getPromotionStyle,
    groupPromotionsIntoRows,
    groupByMonth,
    getDateRange,
    formatDateRange,
  };
}
