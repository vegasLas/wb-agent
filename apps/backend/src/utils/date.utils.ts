/**
 * Date formatting utilities
 */

/**
 * Format a Date to YYYY-MM-DD string
 */
export function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Get a default date range for MPStats queries.
 * d1 = today - daysBack (default 30)
 * d2 = today - 1 day
 */
export function getDefaultDateRange(daysBack = 30): { d1: string; d2: string } {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  return {
    d1: formatDateISO(new Date(now.getTime() - daysBack * msPerDay)),
    d2: formatDateISO(new Date(now.getTime() - 1 * msPerDay)),
  };
}
