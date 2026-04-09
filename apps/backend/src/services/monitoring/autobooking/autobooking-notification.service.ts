/**
 * Autobooking Notification Service
 * Phase 5: Autobooking Core
 *
 * Handles success notifications and status updates for autobookings.
 */

import { sharedTelegramNotificationService } from '@/services/monitoring/shared/telegram-notification.service';
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
    chatId: string,
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string | null,
  ): Promise<void> {
    const message =
      sharedTelegramNotificationService.buildBookingSuccessMessage(
        warehouseName,
        date,
        coefficient,
        transitWarehouseName,
        false, // isReschedule = false
      );

    logger.info(
      `Sending success notification to chat ${chatId} for ${warehouseName}`,
    );

    await sharedTelegramNotificationService.sendSuccessNotification(
      chatId,
      message,
    );
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
