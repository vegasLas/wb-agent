/**
 * Autobooking Notification Service
 * Phase 5: Autobooking Core
 *
 * Handles success notifications and status updates for autobookings.
 */

import { notificationDispatcher } from '@/services/monitoring/shared/notification-dispatcher.service';
import { sharedStatusUpdateService } from '@/services/monitoring/shared/status-update.service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AutobookingNotification');
import type { IAutobookingNotificationService } from '@/services/monitoring/autobooking/autobooking.interfaces';
import type { SchedulableItem } from '@/services/monitoring/shared/interfaces/sharedInterfaces';

export class AutobookingNotificationService
  implements IAutobookingNotificationService
{
  /**
   * Sends a success notification to the user via Telegram
   */
  async sendSuccessNotification(
    userId: number,
    chatId: string,
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string | null,
  ): Promise<void> {
    logger.info(
      `Sending success notification to user ${userId} / chat ${chatId || 'none'} for ${warehouseName}`,
    );

    await notificationDispatcher.notifyBookingSuccess({
      userId,
      chatId,
      warehouseName,
      date,
      coefficient,
      transitWarehouseName,
      isReschedule: false,
    });
  }

  /**
   * Updates autobooking status after successful booking
   */
  async updateAutobookingStatus(
    booking: SchedulableItem,
    bookedDate: Date,
  ): Promise<void> {
    logger.info(
      `Updating status for booking ${booking.id}, date: ${bookedDate.toDateString()}`,
    );

    await sharedStatusUpdateService.updateAutobookingStatus(
      booking.id,
      bookedDate,
      booking.dateType,
    );
  }
}

// Export singleton instance
export const autobookingNotificationService =
  new AutobookingNotificationService();
