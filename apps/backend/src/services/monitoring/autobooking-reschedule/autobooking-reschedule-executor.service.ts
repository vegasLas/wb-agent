/**
 * Autobooking Reschedule Executor Service
 * Phase 7: Autobooking Reschedule
 *
 * Handles the actual reschedule execution and error handling.
 * Updates existing supply dates using updateSupplyPlan API.
 */

import { sharedBanService } from '../shared/ban.service';
import { sharedErrorHandlingService } from '../shared/error-handling.service';
import { sharedStatusUpdateService } from '../shared/status-update.service';
import { bookingErrorService } from '../../booking-error.service';
import { supplyService } from '../../supply.service';
import { logger } from '../../../utils/logger';
import type {
  IRescheduleExecutorService,
  SuccessfulReschedule,
  RescheduleBookingError,
} from '../interfaces/reschedule.interfaces';
import type { MonitoringUser } from '../interfaces/reschedule.interfaces';
import type { AutobookingReschedule } from '@prisma/client';

// ============== Constants ==============

const DATE_UNAVAILABLE_BAN_DURATION_MS = 2 * 1000; // 2 seconds
const TOO_ACTIVE_BLACKLIST_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_BAN_DURATION_MS = 60 * 1000; // 60 seconds

export class AutobookingRescheduleExecutorService
  implements IRescheduleExecutorService
{
  /**
   * Filters availabilities to find matching warehouse and dates for reschedule
   */
  filterMatchingAvailabilities(
    reschedule: AutobookingReschedule,
    availabilities: import('../interfaces/reschedule.interfaces').WarehouseAvailability[]
  ): Array<{
    availability: import('../interfaces/reschedule.interfaces').WarehouseAvailability;
    matchingDates: Array<{
      effectiveDate: Date;
      availableDate: { date: string; coefficient: number };
    }>;
  }> {
    const matches: Array<{
      availability: import('../interfaces/reschedule.interfaces').WarehouseAvailability;
      matchingDates: Array<{
        effectiveDate: Date;
        availableDate: { date: string; coefficient: number };
      }>;
    }> = [];

    for (const availability of availabilities) {
      if (availability.warehouseId !== reschedule.warehouseId) continue;

      const matchingDates: Array<{
        effectiveDate: Date;
        availableDate: { date: string; coefficient: number };
      }> = [];

      for (const availableDate of availability.availableDates) {
        const date = new Date(availableDate.date);
        const coefficient = availableDate.coefficient;

        // Check if date matches reschedule criteria
        if (coefficient <= reschedule.maxCoefficient) {
          matchingDates.push({ effectiveDate: date, availableDate });
        }
      }

      if (matchingDates.length > 0) {
        matches.push({ availability, matchingDates });
      }
    }

    return matches;
  }

  /**
   * Creates reschedule task - updates existing supply date
   */
  async createRescheduleTask(params: {
    reschedule: AutobookingReschedule;
    effectiveDate: Date;
    account: { id: string };
    user: MonitoringUser;
    latency: number;
  }): Promise<void> {
    const { reschedule, effectiveDate, account, user, latency } = params;
    const randomNumber = Math.floor(Math.random() * 100000);

    await supplyService.updateSupplyPlan({
      accountId: account.id,
      supplierId: reschedule.supplierId,
      userId: user.userId,
      proxy: user.proxy,
      latency,
      params: {
        supplyId: parseInt(reschedule.supplyId),
        deliveryDate: effectiveDate.toISOString(),
      },
      rpc_order: randomNumber + 3,
      userAgent: user.userAgent,
    });
  }

  /**
   * Adds a successful reschedule to the list
   */
  addSuccessfulReschedule(
    successfulReschedules: SuccessfulReschedule[],
    params: {
      user: MonitoringUser;
      warehouseName: string;
      effectiveDate: Date;
      coefficient: number;
      reschedule: AutobookingReschedule;
    },
  ): void {
    const { user, warehouseName, effectiveDate, coefficient, reschedule } =
      params;

    successfulReschedules.push({
      chatId: user.chatId as string,
      warehouseName,
      effectiveDate,
      coefficient,
      reschedule,
    });
  }

  /**
   * Logs a successful reschedule
   */
  logSuccessfulReschedule(
    reschedule: AutobookingReschedule,
    effectiveDate: Date,
    userId: number,
  ): void {
    logger.info(
      `[Reschedule] Supply ${reschedule.supplyId} rescheduled to ${effectiveDate.toDateString()} (user ${userId})`,
    );
  }

  /**
   * Handles reschedule processing errors with categorization
   */
  async handleRescheduleProcessingError(params: {
    error: RescheduleBookingError;
    reschedule: AutobookingReschedule;
    user: MonitoringUser;
    warehouseName: string;
    effectiveDate: Date;
    account: { id: string };
    coefficient: number;
  }): Promise<void> {
    const {
      error,
      reschedule,
      user,
      warehouseName,
      effectiveDate,
      coefficient,
    } = params;

    const errorCategory = sharedErrorHandlingService.categorizeError(error);

    // Handle specific error types
    switch (errorCategory.type) {
      case 'date_unavailable':
        this.handleDateUnavailableError(
          reschedule,
          effectiveDate,
          error,
          coefficient,
        );
        throw error; // Re-throw to stop processing this warehouse-date

      case 'too_active':
        this.handleTooActiveError(user.userId);
        break;

      case 'critical':
        await this.handleCriticalRescheduleError({
          error,
          reschedule,
          user,
          warehouseName,
          effectiveDate,
        });
        break;

      case 'non_critical':
        this.handleNonCriticalRescheduleError(
          reschedule,
          effectiveDate,
          error,
          false,
          coefficient,
        );
        break;
    }

    // Log error using shared service
    sharedErrorHandlingService.logError(
      reschedule.id,
      'reschedule',
      effectiveDate,
      error,
      errorCategory,
    );
  }

  /**
   * Handles date unavailable errors by banning the specific date
   */
  private handleDateUnavailableError(
    reschedule: AutobookingReschedule,
    effectiveDate: Date,
    error: RescheduleBookingError,
    coefficient: number,
  ): void {
    sharedBanService.banSingleDate({
      warehouseId: reschedule.warehouseId,
      date: effectiveDate,
      supplyType: reschedule.supplyType,
      dateType: reschedule.dateType,
      error,
      duration: DATE_UNAVAILABLE_BAN_DURATION_MS,
      coefficient,
    });
  }

  /**
   * Handles too active errors by blacklisting the user
   */
  private handleTooActiveError(userId: number): void {
    sharedBanService.addUserToBlacklist(
      userId,
      TOO_ACTIVE_BLACKLIST_DURATION_MS,
    );
  }

  /**
   * Handles critical reschedule errors
   */
  private async handleCriticalRescheduleError(params: {
    error: RescheduleBookingError;
    reschedule: AutobookingReschedule;
    user: MonitoringUser;
    warehouseName: string;
    effectiveDate: Date;
  }): Promise<void> {
    await bookingErrorService.handleCriticalBookingError({
      error: params.error,
      entity: params.reschedule,
      user: params.user as unknown as import('@prisma/client').User,
      warehouseName: params.warehouseName,
      effectiveDate: params.effectiveDate,
      type: 'reschedule',
    });
  }

  /**
   * Handles non-critical reschedule errors
   */
  private handleNonCriticalRescheduleError(
    reschedule: AutobookingReschedule,
    effectiveDate: Date,
    error: RescheduleBookingError,
    isCriticalError: boolean,
    coefficient: number,
  ): void {
    if (isCriticalError || reschedule.dateType !== 'CUSTOM_DATES_SINGLE') {
      sharedBanService.banAllDates({
        warehouseId: reschedule.warehouseId,
        supplyType: reschedule.supplyType,
        dateType: reschedule.dateType,
        error,
        duration: DEFAULT_BAN_DURATION_MS,
        coefficient,
      });
    } else {
      sharedBanService.banSingleDate({
        warehouseId: reschedule.warehouseId,
        date: effectiveDate,
        supplyType: reschedule.supplyType,
        dateType: reschedule.dateType,
        error,
        duration: DEFAULT_BAN_DURATION_MS,
        coefficient,
      });
    }
  }

  /**
   * Updates reschedule status after successful reschedule
   */
  async updateRescheduleStatus(
    reschedule: AutobookingReschedule,
    rescheduledDate: Date,
  ): Promise<void> {
    await sharedStatusUpdateService.updateRescheduleStatus(
      reschedule.id,
      rescheduledDate,
      reschedule.dateType,
    );
  }
}

// Export singleton instance
export const autobookingRescheduleExecutorService =
  new AutobookingRescheduleExecutorService();
