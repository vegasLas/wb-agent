/**
 * Shared helper functions for WB Official API services.
 */

/**
 * Parse a WB numeric string into a number.
 * WB returns values like "48", "11,2", "0,14", "35.65".
 * We normalize commas to dots and remove whitespace before parsing.
 */
export function parseWbNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Format a numeric cost value into a Russian locale currency string.
 */
export function formatWbCost(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  const formatted = rounded.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ₽`;
}
