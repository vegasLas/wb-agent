/**
 * Autobooking Reschedule Notification Service
 * Phase 7: Autobooking Reschedule
 *
 * Handles notifications for reschedule operations.
 */

import { prisma } from '@/config/database';
import { notificationDispatcher } from '@/services/monitoring/shared/notification-dispatcher.service';
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
    userId: number,
    chatId: string,
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string,
  ): Promise<void> {
    await notificationDispatcher.notifyBookingSuccess({
      userId,
      chatId,
      warehouseName,
      date,
      coefficient,
      transitWarehouseName,
      isReschedule: true,
    });
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
          user: { include: { telegram: { select: { chatId: true } } } },
        },
      });

      const recipients = reschedules
        .map((r) => ({
          userId: r.userId,
          chatId: r.user.telegram?.chatId ?? undefined,
        }))
        .filter(
          (r, index, self) => index === self.findIndex((t) => t.userId === r.userId),
        );

      if (recipients.length === 0) return;

      await notificationDispatcher.notifyBannedDateBulk({
        recipients,
        warehouseName,
        date,
        supplyType,
        error,
        isReschedule: true,
      });
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
