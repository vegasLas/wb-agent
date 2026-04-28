// =============================================================================
// Date Formatters
// =============================================================================

/**
 * Format a date to a short string (DD.MM.YYYY)
 */
export function formatDateShort(
  date: string | Date | null | undefined,
): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date range
 */
export function formatDateRange(
  startDate: string | Date,
  endDate: string | Date,
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  return `${start.toLocaleDateString('ru-RU')} - ${end.toLocaleDateString('ru-RU')}`;
}

/**
 * Get the end date for a week period
 */
export function getWeekEndDate(startDate: string | Date): Date {
  const date =
    typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  date.setDate(date.getDate() + 6);
  return date;
}

/**
 * Get the end date for a month period
 */
export function getMonthEndDate(startDate: string | Date): Date {
  const date =
    typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  date.setMonth(date.getMonth() + 1);
  return date;
}

/**
 * Format a date as a relative "time ago" string in Russian
 */
export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffHour < 24) return `${diffHour} ч. назад`;
  if (diffDay < 7) return `${diffDay} дн. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
