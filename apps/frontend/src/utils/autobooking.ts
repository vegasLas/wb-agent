/**
 * Calculate how many slots an autobooking consumes.
 * Mirrors the backend logic in apps/backend/src/utils/slot-utils.ts
 *
 * - CUSTOM_DATES          → 1 slot per selected date
 * - CUSTOM_DATES_SINGLE   → 1 slot total
 * - WEEK / MONTH / CUSTOM_PERIOD → 1 slot
 */
export function calculateSlotCount(
  dateType: string,
  customDates?: (string | Date)[] | null,
): number {
  if (dateType === 'CUSTOM_DATES') {
    return customDates?.length || 0;
  }
  return 1;
}
