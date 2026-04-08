/**
 * Autobooking Reschedule Notification Service
 * Phase 7: Autobooking Reschedule
 *
 * Handles notifications for reschedule operations.
 */

import { prisma } from '@/config/database';
import { sharedTelegramNotificationService } from '@/services/monitoring/shared/telegram-notification.service';
import { sharedStatusUpdateService } from '@/services/monitoring/shared/status-update.service';
import { logger } from '@/utils/logger';
import type {
  IRescheduleNotificationService,
  RescheduleBanParams,
  AutobookingRescheduleWithDates,
} from '@/services/monitoring/interfaces/reschedule.interfaces';
import type { AutobookingReschedule } from '@prisma/client';

export class AutobookingRescheduleNotificationService
  implements IRescheduleNotificationService
{
  /**
   * Updates reschedule status after successful reschedule
   */
  async updateRescheduleStatus(
    reschedule: AutobookingRescheduleWithDates | AutobookingReschedule,
    rescheduledDate: Date,
  ): Promise<void> {
    await sharedStatusUpdateService.updateRescheduleStatus(
      reschedule.id,
      rescheduledDate,
      reschedule.dateType,
    );
  }

  /**
   * Sends success notification for reschedule
   */
  async sendSuccessNotification(
    chatId: string,
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string,
  ): Promise<void> {
    const message =
      sharedTelegramNotificationService.buildBookingSuccessMessage(
        warehouseName,
        date,
        coefficient,
        transitWarehouseName, // optional transit warehouse for reschedule
        true, // isReschedule = true
      );

    await sharedTelegramNotificationService.sendSuccessNotification(
      chatId,
      message,
    );
  }

  /**
   * Sends banned date notification for reschedule
   */
  async sendBannedDateNotification(
    params: Omit<RescheduleBanParams, 'withoutDate'>,
  ): Promise<void> {
    try {
      const { warehouseId, date, supplyType, error } = params;

      // Get warehouse name
      const warehouseCoeff = await prisma.warehouseCoefficient.findFirst({
        where: { warehouseId },
        select: { warehouseName: true },
      });

      const warehouseName =
        warehouseCoeff?.warehouseName || `Склад ${warehouseId}`;

      // Get affected users
      const reschedules = await prisma.autobookingReschedule.findMany({
        where: {
          warehouseId,
          supplyType,
          status: 'ACTIVE',
        },
        include: {
          user: { select: { chatId: true } },
        },
      });

      const uniqueChatIds = new Set(
        reschedules
          .map((r: { user: { chatId: string | null } }) => r.user.chatId)
          .filter((chatId: string | null): chatId is string => chatId !== null),
      );

      if (uniqueChatIds.size === 0) return;

      const message = sharedTelegramNotificationService.buildBannedDateMessage(
        warehouseName,
        date,
        supplyType,
        error,
        true, // isReschedule = true
      );

      await sharedTelegramNotificationService.sendBulkNotification(
        uniqueChatIds,
        message,
      );
    } catch (error) {
      logger.error(
        '[RescheduleNotification] Failed to send banned date notification:',
        error,
      );
    }
  }
}

// Export singleton instance
export const autobookingRescheduleNotificationService =
  new AutobookingRescheduleNotificationService();
