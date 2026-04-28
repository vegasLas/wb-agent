/**
 * Calculate how many slots an autobooking or reschedule consumes.
 *
 * - CUSTOM_DATES          → 1 slot per selected date
 * - CUSTOM_DATES_SINGLE   → 1 slot total
 * - WEEK / MONTH / CUSTOM_PERIOD → 1 slot
 */
export function calculateSlotCount(
  dateType: string,
  customDates?: Date[] | null,
): number {
  if (dateType === 'CUSTOM_DATES') {
    return customDates?.length || 0;
  }
  return 1;
}
