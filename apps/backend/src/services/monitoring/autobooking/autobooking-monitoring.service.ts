/**
 * Autobooking Monitoring Service
 * Phase 5: Autobooking Core
 *
 * Main orchestrator for autobooking monitoring.
 * Processes warehouse availabilities and matches them with user autobookings.
 */

import { sharedBanService } from '@/services/monitoring/shared/ban.service';
import { sharedTaskOrganizerService } from '@/services/monitoring/shared/task-organizer.service';
import { sharedUserTrackingService } from '@/services/monitoring/shared/user-tracking.service';
import { sharedProcessingStateService } from '@/services/monitoring/shared/processing-state.service';
import { sharedErrorHandlingService } from '@/services/monitoring/shared/error-handling.service';
import { sharedLatencyService } from '@/services/monitoring/shared/latency.service';
import { autobookingExecutorService } from '@/services/monitoring/autobooking/autobooking-executor.service';
import { autobookingNotificationService } from '@/services/monitoring/autobooking/autobooking-notification.service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AutobookingMonitoring');
import type {
  IAutobookingMonitoringService,
  BookingTask,
  SuccessfulBooking,
} from '@/services/monitoring/autobooking/autobooking.interfaces';
import type {
  MonitoringUser,
  WarehouseAvailability,
  BookingError,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';

export class AutobookingMonitoringService
  implements IAutobookingMonitoringService
{
  /**
   * Main entry point for processing warehouse availabilities and matching with autobookings
   */
  async processAvailabilities(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[],
  ): Promise<void> {
    logger.debug(
      `Processing availabilities for ${monitoringUsers.length} users, ` +
        `${availabilities.length} warehouse availabilities`,
    );

    // Debug: Log details about users and their autobookings
    for (const user of monitoringUsers) {
      logger.debug(
        `[Input] User ${user.userId}: ${user.autobookings?.length || 0} autobookings, ` +
          `accounts=${Object.keys(user.accounts).length}, proxy=${user.proxy ? 'yes' : 'no'}`
      );
      for (const booking of user.autobookings || []) {
        logger.debug(
          `[Input]   Booking ${booking.id}: warehouseId=${booking.warehouseId}, ` +
            `supplyType=${booking.supplyType}, dateType=${booking.dateType}, ` +
            `maxCoefficient=${booking.maxCoefficient}, status=${booking.status}`
        );
      }
    }

    // Debug: Log availabilities
    logger.debug(`[Input] Total availabilities: ${availabilities.length}`);
    for (const av of availabilities) {
      logger.debug(
        `[Input] Availability: warehouseId=${av.warehouseId}, boxTypeID=${av.boxTypeID}, ` +
          `dates=${av.availableDates.length}`
      );
    }

    const successfulBookings: SuccessfulBooking[] = [];
    this.resetProcessingState();

    // Step 1: Organize bookings by warehouse-date
    const warehouseDateBookingsMap =
      sharedTaskOrganizerService.organizeAutobookingsByWarehouseDate(
        monitoringUsers,
        availabilities,
      );

    if (warehouseDateBookingsMap.size === 0) {
      logger.warn(
        'No warehouse-date combinations to process after filtering. ' +
          `Inputs: ${monitoringUsers.length} users, ${availabilities.length} availabilities. ` +
          'Check [Input], [Organize], [ProcessUser], [Filter], and [EffectiveDates] logs above for details.'
      );
      return;
    }

    logger.debug(
      `Organized into ${warehouseDateBookingsMap.size} warehouse-date combinations`,
    );

    // Step 2: Process all warehouse-date combinations
    await this.processWarehouseDateBookings(
      warehouseDateBookingsMap,
      successfulBookings,
    );

    this.logProcessingResults(warehouseDateBookingsMap);

    // Step 3: Handle successful bookings (notifications, status updates)
    await this.handleSuccessfulBookings(successfulBookings);

    logger.info(
      `Done: ${successfulBookings.length} successful bookings`,
    );
  }

  /**
   * Resets processing state for new cycle
   */
  private resetProcessingState(): void {
    sharedProcessingStateService.resetAutobookingState();
  }

  /**
   * Processes all warehouse-date booking combinations
   */
  private async processWarehouseDateBookings(
    warehouseDateBookingsMap: Map<string, BookingTask[][]>,
    successfulBookings: SuccessfulBooking[],
  ): Promise<void> {
    const sortedKeys = this.getSortedWarehouseDateKeys(
      warehouseDateBookingsMap,
    );
    logger.debug(
      `Processing ${sortedKeys.length} warehouse-date combinations`,
    );

    await Promise.all(
      sortedKeys.map(async (warehouseDateKey) => {
        const bookingTaskGroups =
          warehouseDateBookingsMap.get(warehouseDateKey) || [];
        const effectiveDate = this.extractDateFromKey(warehouseDateKey);

        logger.debug(
          `Processing ${warehouseDateKey}: ` +
            `${bookingTaskGroups.length} proxy groups`,
        );

        // Process each proxy group sequentially to handle date unavailable errors properly
        for (
          let groupIndex = 0;
          groupIndex < bookingTaskGroups.length;
          groupIndex++
        ) {
          const bookingTasks = bookingTaskGroups[groupIndex];
          const groupProxies = bookingTasks.map((task) =>
            sharedTaskOrganizerService.getProxyString(task),
          );
          const groupUserIds = bookingTasks.map((task) => task.user.userId);

          logger.debug(
            `Group ${groupIndex + 1}/${bookingTaskGroups.length}: ` +
              `${bookingTasks.length} tasks, Users: [${groupUserIds.join(', ')}]`,
          );

          try {
            await this.processBookingsForWarehouseDate(
              warehouseDateKey,
              effectiveDate,
              bookingTasks,
              successfulBookings,
            );
            logger.debug(
              `Group ${groupIndex + 1} completed`,
            );
          } catch (error) {
            const errorMessage = (error as Error).message;
            if (errorMessage.startsWith('DATE_UNAVAILABLE:')) {
              logger.warn(
                `Group ${groupIndex + 1} failed with DATE_UNAVAILABLE ` +
                  `- stopping remaining groups for ${warehouseDateKey}`,
              );
              // Date unavailable error stops processing remaining groups for this warehouse-date
              break;
            }
            logger.error(
              `Group ${groupIndex + 1} failed with error:`,
              errorMessage,
            );
            // Re-throw other errors
            throw error;
          }
        }

        logger.debug(`Completed ${warehouseDateKey}`);
      }),
    );
  }

  /**
   * Sorts warehouse-date keys by date for consistent processing order
   */
  private getSortedWarehouseDateKeys(
    warehouseDateBookingsMap: Map<string, BookingTask[][]>,
  ): string[] {
    return Array.from(warehouseDateBookingsMap.keys()).sort((a, b) => {
      const dateA = this.extractDateFromKey(a);
      const dateB = this.extractDateFromKey(b);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Extracts date from warehouse-date key format: "warehouseId-date-supplyType"
   * e.g., "12345-Wed Oct 25 2023 00:00:00 GMT+0300-BOX"
   */
  private extractDateFromKey(warehouseDateKey: string): Date {
    const parts = warehouseDateKey.split('-');
    // Remove warehouseId (first part) and supplyType (last part)
    // The middle parts form the date string
    return new Date(parts.slice(1, -1).join('-'));
  }

  /**
   * Logs processing results for debugging
   */
  private logProcessingResults(
    warehouseDateBookingsMap: Map<string, BookingTask[][]>,
  ): void {
    const userIds = Array.from(warehouseDateBookingsMap.values()).map(
      (groups) =>
        groups.flatMap((tasks) => tasks.map((task) => task.user.userId)),
    );

    logger.info(
      `Processed warehouse-date keys:`,
      warehouseDateBookingsMap.size,
      Array.from(warehouseDateBookingsMap.keys()),
      'Users:',
      userIds.flat(),
    );

    logger.info(
      `Processed booking IDs:`,
      Array.from(sharedProcessingStateService.getProcessedAutobookingIds()),
    );
  }

  /**
   * Processes all successful bookings - sends notifications and updates status
   */
  private async handleSuccessfulBookings(
    successfulBookings: SuccessfulBooking[],
  ): Promise<void> {
    logger.debug(
      `Handling ${successfulBookings.length} successful bookings`,
    );

    for (const booking of successfulBookings) {
      try {
        // Update autobooking status in database
        await autobookingNotificationService.updateAutobookingStatus(
          booking.booking,
          booking.effectiveDate,
        );

        // Send success notification to user
        await autobookingNotificationService.sendSuccessNotification(
          booking.chatId,
          booking.warehouseName,
          booking.effectiveDate,
          booking.coefficient,
          booking.transitWarehouseName,
        );

        logger.info(
          `Booking completed: ${booking.booking.id}`,
        );
      } catch (error) {
        logger.error(
          `Failed to handle successful booking ${booking.booking.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Processes all bookings for a specific warehouse-date combination
   * All bookings in the group are processed simultaneously (in parallel)
   */
  private async processBookingsForWarehouseDate(
    warehouseDateKey: string,
    effectiveDate: Date,
    bookingTasks: BookingTask[],
    successfulBookings: SuccessfulBooking[],
  ): Promise<void> {
    // Filter out tasks that should be skipped or are banned
    const validTasks: BookingTask[] = [];

    for (const task of bookingTasks) {
      if (this.shouldSkipBookingTask(task)) {
        continue;
      }
      if (
        this.isWarehouseDateBanned(
          task.booking,
          effectiveDate,
          task.coefficient,
        )
      ) {
        continue;
      }
      validTasks.push(task);
    }

    if (validTasks.length === 0) {
      logger.debug(
        `No valid tasks for ${warehouseDateKey}`,
      );
      return;
    }

    logger.debug(
      `Processing ${validTasks.length} valid tasks for ${warehouseDateKey}`,
    );

    // Track users as running and bookings as processing
    const userIds = validTasks.map((task) => task.user.userId);
    sharedUserTrackingService.trackUsersAsRunning(userIds);
    validTasks.forEach((task) => this.trackBookingAsProcessing(task));

    try {
      // Process all valid tasks simultaneously (in parallel)
      await Promise.all(
        validTasks.map(async (task) => {
          try {
            await this.processBookingTaskWithExecutor(
              task,
              effectiveDate,
              successfulBookings,
            );
          } catch (error) {
            const bookingError = error as BookingError;
            const shouldBreak = this.handleBookingError(
              bookingError,
              warehouseDateKey,
            );

            // If it's a date unavailable error, throw it to stop other groups for this warehouse-date
            if (shouldBreak) {
              throw new Error(`DATE_UNAVAILABLE:${warehouseDateKey}`);
            }
            // For other errors, don't stop other bookings in the same group
          }
        }),
      );
    } finally {
      // Always remove users from running tracking when done
      sharedUserTrackingService.removeUsersFromRunning(userIds);
    }
  }

  /**
   * Checks if booking task should be skipped
   */
  private shouldSkipBookingTask(task: BookingTask): boolean {
    const shouldSkip =
      sharedProcessingStateService.isAutobookingProcessed(task.booking.id) ||
      sharedBanService.isUserBlacklisted(task.user.userId) ||
      sharedUserTrackingService.isUserRunning(task.user.userId);

    if (shouldSkip) {
      const reason = sharedProcessingStateService.isAutobookingProcessed(
        task.booking.id,
      )
        ? 'already processed'
        : sharedBanService.isUserBlacklisted(task.user.userId)
          ? 'user blacklisted'
          : 'user already running';

      logger.debug(
        `Skipping booking ${task.booking.id}: ${reason}`,
      );
    }

    return shouldSkip;
  }

  /**
   * Checks if warehouse-date combination is banned
   */
  private isWarehouseDateBanned(
    booking: { warehouseId: number; supplyType: string },
    effectiveDate: Date,
    coefficient: number,
  ): boolean {
    return sharedBanService.isBanned({
      warehouseId: booking.warehouseId,
      date: effectiveDate,
      supplyType: booking.supplyType,
      coefficient,
    });
  }

  /**
   * Tracks booking as being processed
   */
  private trackBookingAsProcessing(task: BookingTask): void {
    sharedProcessingStateService.markAutobookingAsProcessed(task.booking.id);
  }

  /**
   * Handles booking errors and determines if processing should stop
   * Returns true if processing should stop for this warehouse-date
   */
  private handleBookingError(
    error: BookingError,
    warehouseDateKey: string,
  ): boolean {
    const isDateUnavailable =
      sharedErrorHandlingService.isDateUnavailableError(error);

    if (isDateUnavailable) {
      logger.warn(
        `Date unavailable error caught - ` +
          `breaking processing cycle for ${warehouseDateKey}`,
      );
      return true; // Break the loop
    }

    logger.info(
      `Non-date-unavailable error caught for ${warehouseDateKey} - ` +
        `continuing with remaining bookings`,
    );
    return false; // Continue processing
  }

  /**
   * Processes a single booking task using the executor service
   */
  private async processBookingTaskWithExecutor(
    task: BookingTask,
    effectiveDate: Date,
    successfulBookings: SuccessfulBooking[],
  ): Promise<boolean> {
    const { booking, user, warehouseName, coefficient } = task;

    // Generate latency for realism
    const latency = sharedLatencyService.generateLatency();

    // Find account for this booking
    const account = this.findAccountForBooking(user, booking);
    if (!account?.id) {
      logger.error(
        `No account found for user ${user.userId} ` +
          `with supplier ${booking.supplierId}`,
      );
      throw new Error(
        `No account found for user ${user.userId} with supplier ${booking.supplierId}`,
      );
    }

    try {
      // Execute the booking via executor service
      await autobookingExecutorService.createBookingTask({
        booking,
        effectiveDate,
        account,
        user,
        latency,
      });

      // Add to successful bookings list
      autobookingExecutorService.addSuccessfulBooking(successfulBookings, {
        user,
        warehouseName,
        effectiveDate,
        coefficient,
        booking,
      });

      // Log the successful booking
      autobookingExecutorService.logSuccessfulBooking(
        booking,
        effectiveDate,
        user.userId,
      );

      return true;
    } catch (error) {
      // Handle error via executor service
      await autobookingExecutorService.handleBookingProcessingError({
        error: error as BookingError,
        booking,
        user,
        warehouseName,
        effectiveDate,
        account,
        preorderId: null,
        coefficient,
      });

      return false;
    }
  }

  /**
   * Finds the account that has the supplier for this booking
   */
  private findAccountForBooking(
    user: MonitoringUser,
    booking: { supplierId: string },
  ): { id: string; wbCookies?: string | null } | null {
    // Find the account ID that contains the supplier ID for this booking
    for (const [accountId, accountData] of Object.entries(user.accounts)) {
      if (accountData.supplierIds.includes(booking.supplierId)) {
        return { id: accountId, wbCookies: accountData.wbCookies };
      }
    }
    return null;
  }
}

// Export singleton instance
export const autobookingMonitoringService = new AutobookingMonitoringService();
