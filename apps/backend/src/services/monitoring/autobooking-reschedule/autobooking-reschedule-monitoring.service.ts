/**
 * Autobooking Reschedule Monitoring Service
 * Phase 7: Autobooking Reschedule
 *
 * Main orchestrator for autobooking reschedule monitoring.
 * Processes warehouse availabilities and matches them with user reschedule requests.
 */

import { sharedBanService } from '@/services/monitoring/shared/ban.service';
import { sharedTaskOrganizerService } from '@/services/monitoring/shared/task-organizer.service';
import { sharedUserTrackingService } from '@/services/monitoring/shared/user-tracking.service';
import { sharedProcessingStateService } from '@/services/monitoring/shared/processing-state.service';
import { sharedErrorHandlingService } from '@/services/monitoring/shared/error-handling.service';
import { sharedLatencyService } from '@/services/monitoring/shared/latency.service';
import { autobookingRescheduleExecutorService } from './autobooking-reschedule-executor.service';
import { autobookingRescheduleNotificationService } from './autobooking-reschedule-notification.service';
import { logger } from '@/utils/logger';
import type {
  IRescheduleMonitoringService,
  RescheduleBookingTask,
  SuccessfulReschedule,
  RescheduleBookingError,
} from '@/services/monitoring/interfaces/reschedule.interfaces';
import type {
  MonitoringUser,
  WarehouseAvailability,
} from '@/services/monitoring/interfaces/reschedule.interfaces';

export class AutobookingRescheduleMonitoringService
  implements IRescheduleMonitoringService
{
  /**
   * Main entry point for processing warehouse availabilities and matching with reschedules
   */
  async processRescheduleAvailabilities(
    monitoringUsers: MonitoringUser[],
    availabilities: WarehouseAvailability[],
  ): Promise<void> {
    const successfulReschedules: SuccessfulReschedule[] = [];
    this.resetProcessingState();

    // Step 1: Organize reschedules by warehouse-date
    const warehouseDateReschedulesMap =
      sharedTaskOrganizerService.organizeReschedulesByWarehouseDateTyped(
        monitoringUsers,
        availabilities,
      );

    if (warehouseDateReschedulesMap.size === 0) {
      return;
    }

    logger.info(
      `[RescheduleMonitoring] Processing ${warehouseDateReschedulesMap.size} warehouse-date combinations`,
    );

    // Step 2: Process all warehouse-date combinations
    await this.processWarehouseDateReschedules(
      warehouseDateReschedulesMap,
      successfulReschedules,
    );

    await this.handleSuccessfulReschedules(successfulReschedules);

    logger.info(
      `[RescheduleMonitoring] Completed: ${successfulReschedules.length} successful`,
    );
  }

  /**
   * Resets processing state for new cycle
   */
  private resetProcessingState(): void {
    sharedProcessingStateService.resetRescheduleState();
  }

  /**
   * Processes all warehouse-date reschedule combinations
   */
  private async processWarehouseDateReschedules(
    warehouseDateReschedulesMap: Map<string, RescheduleBookingTask[][]>,
    successfulReschedules: SuccessfulReschedule[],
  ): Promise<void> {
    const sortedKeys = this.getSortedWarehouseDateKeys(
      warehouseDateReschedulesMap,
    );

    await Promise.all(
      sortedKeys.map(async (warehouseDateKey) => {
        const rescheduleTaskGroups =
          warehouseDateReschedulesMap.get(warehouseDateKey) || [];
        const effectiveDate = this.extractDateFromKey(warehouseDateKey);

        for (
          let groupIndex = 0;
          groupIndex < rescheduleTaskGroups.length;
          groupIndex++
        ) {
          const rescheduleTasks = rescheduleTaskGroups[groupIndex];

          try {
            await this.processReschedulesForWarehouseDate(
              warehouseDateKey,
              effectiveDate,
              rescheduleTasks,
              successfulReschedules,
            );
          } catch (error) {
            const errorMessage = (error as Error).message;
            if (errorMessage.startsWith('DATE_UNAVAILABLE:')) {
              logger.warn(
                `[RescheduleMonitoring] DATE_UNAVAILABLE for ${warehouseDateKey}`,
              );
              break;
            }
            throw error;
          }
        }
      }),
    );
  }

  /**
   * Sorts warehouse-date keys by date for consistent processing order
   */
  private getSortedWarehouseDateKeys(
    warehouseDateReschedulesMap: Map<string, RescheduleBookingTask[][]>,
  ): string[] {
    return Array.from(warehouseDateReschedulesMap.keys()).sort((a, b) => {
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
   * Processes all successful reschedules - sends notifications and updates status
   */
  private async handleSuccessfulReschedules(
    successfulReschedules: SuccessfulReschedule[],
  ): Promise<void> {
    for (const reschedule of successfulReschedules) {
      try {
        // Update reschedule status in database
        await autobookingRescheduleNotificationService.updateRescheduleStatus(
          reschedule.reschedule,
          reschedule.effectiveDate,
        );

        // Send success notification to user
        await autobookingRescheduleNotificationService.sendSuccessNotification(
          reschedule.chatId,
          reschedule.warehouseName,
          reschedule.effectiveDate,
          reschedule.coefficient,
        );
      } catch (error) {
        logger.error(
          `[RescheduleMonitoring] Failed to notify for reschedule ${reschedule.reschedule.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Processes all reschedules for a specific warehouse-date combination
   * All reschedules in the group are processed simultaneously (in parallel)
   */
  private async processReschedulesForWarehouseDate(
    warehouseDateKey: string,
    effectiveDate: Date,
    rescheduleTasks: RescheduleBookingTask[],
    successfulReschedules: SuccessfulReschedule[],
  ): Promise<void> {
    // Filter out tasks that should be skipped or are banned
    const validTasks: RescheduleBookingTask[] = [];

    for (const task of rescheduleTasks) {
      if (this.shouldSkipRescheduleTask(task)) {
        continue;
      }
      if (
        this.isWarehouseDateBanned(
          task.reschedule,
          effectiveDate,
          task.coefficient,
        )
      ) {
        continue;
      }
      validTasks.push(task);
    }

    if (validTasks.length === 0) {
      return;
    }

    // Track users as running and reschedules as processing
    const userIds = validTasks.map((task) => task.user.userId);
    sharedUserTrackingService.trackUsersAsRunning(userIds);
    validTasks.forEach((task) => this.trackRescheduleAsProcessing(task));

    try {
      // Process all valid tasks simultaneously (in parallel)
      await Promise.all(
        validTasks.map(async (task) => {
          try {
            await this.processRescheduleTaskWithExecutor(
              task,
              effectiveDate,
              successfulReschedules,
            );
          } catch (error) {
            const rescheduleError = error as RescheduleBookingError;
            const shouldBreak = this.handleRescheduleError(
              rescheduleError,
              warehouseDateKey,
            );

            // If it's a date unavailable error, throw it to stop other groups for this warehouse-date
            if (shouldBreak) {
              throw new Error(`DATE_UNAVAILABLE:${warehouseDateKey}`);
            }
            // For other errors, don't stop other reschedules in the same group
          }
        }),
      );
    } finally {
      // Always remove users from running tracking when done
      sharedUserTrackingService.removeUsersFromRunning(userIds);
    }
  }

  /**
   * Checks if reschedule task should be skipped
   */
  private shouldSkipRescheduleTask(task: RescheduleBookingTask): boolean {
    const shouldSkip =
      sharedProcessingStateService.isRescheduleProcessed(task.reschedule.id) ||
      sharedBanService.isUserBlacklisted(task.user.userId) ||
      sharedUserTrackingService.isUserRunning(task.user.userId);

    if (shouldSkip) {
      const reason = sharedProcessingStateService.isRescheduleProcessed(
        task.reschedule.id,
      )
        ? 'already processed'
        : sharedBanService.isUserBlacklisted(task.user.userId)
          ? 'user blacklisted'
          : 'user already running';

      logger.debug(
        `[RescheduleMonitoring] Skipping reschedule ${task.reschedule.id}: ${reason}`,
      );
    }

    return shouldSkip;
  }

  /**
   * Checks if warehouse-date combination is banned
   */
  private isWarehouseDateBanned(
    reschedule: { warehouseId: number; supplyType: string },
    effectiveDate: Date,
    coefficient: number,
  ): boolean {
    return sharedBanService.isBanned({
      warehouseId: reschedule.warehouseId,
      date: effectiveDate,
      supplyType: reschedule.supplyType,
      coefficient,
    });
  }

  /**
   * Tracks reschedule as being processed
   */
  private trackRescheduleAsProcessing(task: RescheduleBookingTask): void {
    sharedProcessingStateService.markRescheduleAsProcessed(task.reschedule.id);
  }

  /**
   * Handles reschedule errors and determines if processing should stop
   * Returns true if processing should stop for this warehouse-date
   */
  private handleRescheduleError(
    error: RescheduleBookingError,
    warehouseDateKey: string,
  ): boolean {
    const isDateUnavailable =
      sharedErrorHandlingService.isDateUnavailableError(error);

    if (isDateUnavailable) {
      logger.warn(
        `[RescheduleMonitoring] Date unavailable for ${warehouseDateKey}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Processes a single reschedule task using the executor service
   */
  private async processRescheduleTaskWithExecutor(
    task: RescheduleBookingTask,
    effectiveDate: Date,
    successfulReschedules: SuccessfulReschedule[],
  ): Promise<boolean> {
    const { reschedule, user, warehouseName, coefficient } = task;

    // Generate latency for realism
    const latency = sharedLatencyService.generateLatency();

    // Find account for this reschedule
    const account = this.findAccountForReschedule(user, reschedule);
    if (!account?.id) {
      throw new Error(
        `No account found for user ${user.userId} with supplier ${reschedule.supplierId}`,
      );
    }

    try {
      // Execute the reschedule via executor service
      await autobookingRescheduleExecutorService.createRescheduleTask({
        reschedule,
        effectiveDate,
        account,
        user,
        latency,
      });

      // Add to successful reschedules list
      autobookingRescheduleExecutorService.addSuccessfulReschedule(
        successfulReschedules,
        {
          user,
          warehouseName,
          effectiveDate,
          coefficient,
          reschedule,
        },
      );

      // Log the successful reschedule
      autobookingRescheduleExecutorService.logSuccessfulReschedule(
        reschedule,
        effectiveDate,
        user.userId,
      );

      return true;
    } catch (error) {
      // Handle error via executor service
      await autobookingRescheduleExecutorService.handleRescheduleProcessingError(
        {
          error: error as RescheduleBookingError,
          reschedule,
          user,
          warehouseName,
          effectiveDate,
          account,
          coefficient,
        },
      );

      return false;
    }
  }

  /**
   * Finds the account that has the supplier for this reschedule
   */
  private findAccountForReschedule(
    user: MonitoringUser,
    reschedule: { supplierId: string },
  ): { id: string; wbCookies?: string | null } | null {
    // Find the account ID that contains the supplier ID for this reschedule
    for (const [accountId, accountData] of Object.entries(user.accounts)) {
      if (accountData.supplierIds.includes(reschedule.supplierId)) {
        return { id: accountId, wbCookies: accountData.wbCookies };
      }
    }
    return null;
  }
}

// Export singleton instance
export const autobookingRescheduleMonitoringService =
  new AutobookingRescheduleMonitoringService();
