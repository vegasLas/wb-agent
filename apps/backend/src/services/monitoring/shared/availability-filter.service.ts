/**
 * Availability Filter Service
 * Phase 3: Availability Filtering - Date filtering logic for all date types
 *
 * Purpose: Filters warehouse availabilities based on booking criteria
 * including coefficient limits and date ranges
 *
 * NOTE: Uses regular local dates (NOT Moscow timezone) - same as deprecated project
 */

import { sharedBanService } from './ban.service';
import { createLogger } from '@/utils/logger';
const logger = createLogger('AvailabilityFilter');
import type {
  SchedulableItem,
  ISharedAvailabilityFilterService,
  BoxTypeId,
  DateType,
  WarehouseAvailability,
  FilteredMatch,
} from './interfaces/sharedInterfaces';

// Constants
const WEEK_DURATION_DAYS = 7;
const MONTH_DURATION_DAYS = 30;

// Box type mappings
const BOX_TYPE_MAPPINGS = {
  BOX: 2,
  MONOPALLETE: 5,
  SUPERSAFE: 6,
} as const;

/**
 * Service for filtering warehouse availabilities based on item criteria
 * Works with autobookings, reschedules, and triggers
 */
export class SharedAvailabilityFilterService
  implements ISharedAvailabilityFilterService
{
  /**
   * Generic method to filter matching availabilities for any schedulable item
   * @param item - The schedulable item (autobooking, reschedule, etc.)
   * @param availabilities - Available warehouse slots
   * @returns Array of matching availabilities with their matching dates
   */
  filterMatchingAvailabilities<T extends SchedulableItem>(
    item: T & { effectiveDates?: Date[] },
    availabilities: WarehouseAvailability[],
  ): FilteredMatch[] {
    const boxTypeId = this.getBoxTypeId(item.supplyType);
    const effectiveDates = this.getEffectiveDates(item);

    logger.debug(
      `[Filter] Processing item ${item.id}: warehouseId=${item.warehouseId}, ` +
        `supplyType=${item.supplyType}, boxTypeId=${boxTypeId}, ` +
        `maxCoefficient=${item.maxCoefficient}, dateType=${item.dateType}, ` +
        `effectiveDates=[${effectiveDates.map((d) => d.toISOString()).join(', ')}]`,
    );

    // Log all available availabilities for this warehouse/boxType
    const potentialMatches = availabilities.filter(
      (a) => a.warehouseId === item.warehouseId && a.boxTypeID === boxTypeId,
    );
    logger.debug(
      `[Filter] Found ${potentialMatches.length} potential warehouse matches for item ${item.id}`,
    );
    for (const pm of potentialMatches) {
      logger.debug(
        `[Filter]   Potential match: warehouseId=${pm.warehouseId}, boxTypeID=${pm.boxTypeID}, ` +
          `dates=[${pm.availableDates.map((d) => `${d.date}(coef:${d.coefficient})`).join(', ')}]`,
      );
    }

    const matchingAvailabilities = availabilities.filter((availability) =>
      this.isAvailabilityMatching(availability, item, boxTypeId),
    );

    logger.debug(
      `[Filter] Item ${item.id}: ${matchingAvailabilities.length} availabilities match warehouse/boxType ` +
        `(out of ${availabilities.length} total)`,
    );

    const results = matchingAvailabilities
      .map((availability) =>
        this.processAvailabilityDates(availability, item, effectiveDates),
      )
      .filter((result): result is FilteredMatch => result !== null);

    logger.debug(
      `[Filter] Item ${item.id}: ${results.length} final matches after date/coefficient filtering`,
    );
    for (const result of results) {
      logger.debug(
        `[Filter]   Final match: warehouseId=${result.availability.warehouseId}, ` +
          `dates=[${result.matchingDates.map((md) => `${md.effectiveDate.toISOString()}(coef:${md.availableDate.coefficient})`).join(', ')}]`,
      );
    }

    return results;
  }

  /**
   * Gets box type ID from supply type string
   * @param supplyType - Supply type (BOX, MONOPALLETE, SUPERSAFE)
   * @returns Box type ID (2, 5, or 6)
   */
  private getBoxTypeId(supplyType: string): BoxTypeId {
    return BOX_TYPE_MAPPINGS[supplyType as keyof typeof BOX_TYPE_MAPPINGS] || 2;
  }

  /**
   * Checks if availability matches item criteria
   * @param availability - Warehouse availability
   * @param item - Schedulable item
   * @param boxTypeId - Box type ID
   * @returns True if matching
   */
  private isAvailabilityMatching(
    availability: WarehouseAvailability,
    item: SchedulableItem,
    boxTypeId: BoxTypeId,
  ): boolean {
    return (
      availability.warehouseId === item.warehouseId &&
      availability.boxTypeID === boxTypeId
    );
  }

  /**
   * Gets effective dates for an item based on its configuration
   * Uses regular local dates (NOT Moscow timezone)
   *
   * @param item - Schedulable item with date configuration
   * @returns Array of effective dates
   */
  private getEffectiveDates(
    item: SchedulableItem & { effectiveDates?: Date[] },
  ): Date[] {
    // If effectiveDates is already provided (legacy AutobookingWithDates), use it
    if (item.effectiveDates && item.effectiveDates.length > 0) {
      logger.debug(
        `[EffectiveDates] Item ${item.id}: Using ${item.effectiveDates.length} pre-calculated effectiveDates`,
      );
      return item.effectiveDates;
    }

    // Otherwise, compute effective dates from item properties
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For items that have completed some dates, exclude them
    const completedDateStrings = item.completedDates.map((date) =>
      date.toDateString(),
    );

    logger.debug(
      `[EffectiveDates] Item ${item.id}: dateType=${item.dateType}, ` +
        `customDates=[${item.customDates?.map((d) => new Date(d).toISOString()).join(', ')}], ` +
        `completedDates=[${completedDateStrings.join(', ')}], today=${today.toISOString()}`,
    );

    let effectiveDates: Date[] = [];

    switch (item.dateType as DateType) {
      case 'CUSTOM_DATES':
      case 'CUSTOM_DATES_SINGLE':
        effectiveDates = item.customDates
          .filter((date) => {
            const dateObj = new Date(date);
            dateObj.setHours(0, 0, 0, 0);
            const isAfterToday = dateObj >= today;
            if (!isAfterToday) {
              logger.debug(
                `[EffectiveDates] Item ${item.id}: Filtering out date ${dateObj.toISOString()} (before today ${today.toISOString()})`,
              );
            }
            return isAfterToday;
          })
          .filter((date) => {
            const isCompleted = completedDateStrings.includes(
              date.toDateString(),
            );
            if (isCompleted) {
              logger.debug(
                `[EffectiveDates] Item ${item.id}: Filtering out date ${date.toDateString()} (already completed)`,
              );
            }
            return !isCompleted;
          });
        break;

      case 'WEEK':
        if (!item.startDate) return [];
        effectiveDates = this.generateDateRange(
          item.startDate,
          WEEK_DURATION_DAYS,
        ).filter((date) => !completedDateStrings.includes(date.toDateString()));
        break;

      case 'MONTH':
        if (!item.startDate) return [];
        effectiveDates = this.generateDateRange(
          item.startDate,
          MONTH_DURATION_DAYS,
        ).filter((date) => !completedDateStrings.includes(date.toDateString()));
        break;

      case 'CUSTOM_PERIOD': {
        if (!item.startDate || !item.endDate) return [];
        const daysDiff = Math.ceil(
          (item.endDate.getTime() - item.startDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        // Include both start and end dates: if start=15th, end=17th, we want 15th, 16th, 17th (3 days)
        effectiveDates = this.generateDateRange(
          item.startDate,
          daysDiff + 1,
        ).filter((date) => !completedDateStrings.includes(date.toDateString()));
        break;
      }

      default:
        return [];
    }

    // Apply currentDate exclusion filter if specified (skip current scheduled date)
    if (item.currentDate) {
      const currentDateString = new Date(item.currentDate).toDateString();
      effectiveDates = effectiveDates.filter(
        (date) => date.toDateString() !== currentDateString,
      );
    }

    return effectiveDates;
  }

  /**
   * Generates a range of dates starting from a date
   * @param startDate - Start date
   * @param days - Number of days to generate
   * @returns Array of dates from startDate
   */
  private generateDateRange(startDate: Date, days: number): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      if (date >= today) {
        dates.push(date);
      }
    }

    return dates;
  }

  /**
   * Processes availability dates and returns matching dates
   * @param availability - Warehouse availability
   * @param item - Schedulable item
   * @param effectiveDates - Effective dates for the item
   * @returns Matching availability with dates, or null if no matches
   */
  private processAvailabilityDates(
    availability: WarehouseAvailability,
    item: SchedulableItem & { effectiveDates?: Date[] },
    effectiveDates: Date[],
  ): FilteredMatch | null {
    const validDates = effectiveDates
      .map((effectiveDate) =>
        this.processEffectiveDate(effectiveDate, item, availability),
      )
      .filter((match): match is NonNullable<typeof match> => match !== null);

    return validDates.length
      ? { availability, matchingDates: validDates }
      : null;
  }

  /**
   * Processes a single effective date for validation
   * @param effectiveDate - The effective date to check
   * @param item - Schedulable item
   * @param availability - Warehouse availability
   * @returns Match object if date is available, null otherwise
   */
  private processEffectiveDate(
    effectiveDate: Date,
    item: SchedulableItem,
    availability: WarehouseAvailability,
  ): {
    effectiveDate: Date;
    availableDate: { date: string; coefficient: number };
  } | null {
    // Find matching available date
    const availableDate = this.findMatchingAvailableDate(
      effectiveDate,
      item,
      availability,
    );

    return availableDate ? { effectiveDate, availableDate } : null;
  }

  /**
   * Finds matching available date for effective date
   * Checks coefficient limit
   *
   * @param effectiveDate - The effective date
   * @param item - Schedulable item with max coefficient
   * @param availability - Warehouse availability
   * @returns Available date if matching and within coefficient limit
   */
  private findMatchingAvailableDate(
    effectiveDate: Date,
    item: SchedulableItem & { effectiveDates?: Date[] },
    availability: WarehouseAvailability,
  ): { date: string; coefficient: number } | undefined {
    return availability.availableDates.find((d) => {
      const dateMatches =
        new Date(d.date).toDateString() === effectiveDate.toDateString();

      // Check date match and coefficient limit
      if (!dateMatches || d.coefficient > item.maxCoefficient) return false;

      // Check if this coefficient is banned for this warehouse/date/supply
      const isCoefficientBanned = sharedBanService.isBanned({
        warehouseId: item.warehouseId,
        date: effectiveDate,
        supplyType: item.supplyType,
        coefficient: d.coefficient,
      });
      if (isCoefficientBanned) {
        return false;
      }

      return true;
    });
  }

  /**
   * Unified method to convert any schedulable item to generic format
   * Works for autobookings, reschedules, and legacy bookings
   * @param item - Item to convert
   * @returns Standardized schedulable item
   */
  convertToSchedulableItem(
    item: SchedulableItem & Record<string, unknown>,
  ): SchedulableItem & { effectiveDates?: Date[] } {
    return {
      id: item.id,
      userId: item.userId,
      supplierId: item.supplierId,
      draftId: (item.draftId as string) || '',
      warehouseId: item.warehouseId,
      transitWarehouseId: item.transitWarehouseId || null,
      supplyType: item.supplyType,
      transitWarehouseName: item.transitWarehouseName as string | null,
      monopalletCount: item.monopalletCount as number | null,
      dateType: item.dateType,
      startDate: item.startDate,
      endDate: item.endDate,
      currentDate: item.currentDate as Date | null | undefined,
      customDates: item.customDates || [],
      completedDates: item.completedDates || [],
      maxCoefficient: item.maxCoefficient,
      status: item.status,
      supplyId: item.supplyId || null,
      supplyIdUpdatedAt: item.supplyIdUpdatedAt || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      effectiveDates: Array.isArray(item.effectiveDates)
        ? (item.effectiveDates as Date[])
        : undefined,
    };
  }
}

/**
 * Singleton instance of the availability filter service
 */
export const sharedAvailabilityFilterService =
  new SharedAvailabilityFilterService();
