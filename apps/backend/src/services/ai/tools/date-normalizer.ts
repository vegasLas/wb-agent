/**
 * Normalize a date string to DD.MM.YY format expected by Wildberries APIs.
 * Accepts:
 * - DD.MM.YY (already correct, returned as-is)
 * - DD.MM.YYYY (converted to DD.MM.YY)
 * - YYYY-MM-DD (converted to DD.MM.YY)
 * Returns empty string if input is empty/undefined.
 */
export function normalizeWbDate(date: string | undefined): string {
  if (!date) return '';

  // Already DD.MM.YY or DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{2,4}$/.test(date)) {
    if (date.length === 10) {
      // DD.MM.YYYY → DD.MM.YY
      return date.slice(0, 6) + date.slice(8);
    }
    return date; // DD.MM.YY
  }

  // YYYY-MM-DD → DD.MM.YY
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year.slice(2)}`;
  }

  // Try parsing as Date object
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(2);
    return `${day}.${month}.${year}`;
  }

  // Unrecognized format, return as-is and let downstream handle error
  return date;
}
