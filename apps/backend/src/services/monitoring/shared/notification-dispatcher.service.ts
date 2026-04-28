/**
 * Notification Dispatcher Service
 * Routes notifications: In-app (primary) + Telegram (bonus push)
 *
 * Purpose: Every notification creates an InAppNotification record.
 * Telegram is sent in addition for users with chatId.
 * Email has been removed — in-app is the unified channel.
 */

import { TBOT } from '@/utils/TBOT';
import { inAppNotificationService } from '@/services/notification/in-app-notification.service';
import { sharedTelegramNotificationService } from '@/services/monitoring/shared/telegram-notification.service';
import { createLogger } from '@/utils/logger';
import type {
  TelegramNotificationOptions,
  WarehouseAvailability,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';
import type { InAppNotificationType, Prisma } from '@prisma/client';

const logger = createLogger('NotificationDispatcher');

interface NotifyOptions {
  userId: number;
  chatId?: string;
  message: string;
  subject?: string;
  telegramOptions?: TelegramNotificationOptions;
  type: InAppNotificationType;
  title: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
}

interface NotifyBookingSuccessOptions {
  userId: number;
  chatId?: string;
  warehouseName: string;
  date: Date;
  coefficient: number;
  transitWarehouseName?: string | null;
  isReschedule?: boolean;
}

interface NotifyBannedDateOptions {
  userId: number;
  chatId?: string;
  warehouseName: string;
  date: Date | null;
  supplyType: string;
  error?: unknown;
  isReschedule?: boolean;
}

interface NotifyBannedDateBulkOptions {
  recipients: Array<{ userId: number; chatId?: string }>;
  warehouseName: string;
  date: Date | null;
  supplyType: string;
  error?: unknown;
  isReschedule?: boolean;
}

interface NotifyTriggerSlotsOptions {
  userId: number;
  chatId?: string;
  availabilities: WarehouseAvailability[];
}

export class NotificationDispatcherService {
  /**
   * Generic notify — creates in-app notification first, then Telegram if chatId available
   */
  async notify(options: NotifyOptions): Promise<void> {
    const { userId, chatId, message, telegramOptions, type, title, link, metadata } = options;

    // Step 1: ALWAYS create in-app notification (primary channel)
    try {
      await inAppNotificationService.create({
        userId,
        type,
        title,
        message,
        link,
        metadata,
      });
    } catch (error) {
      logger.error(`Failed to create in-app notification for user ${userId}:`, error);
    }

    // Step 2: ALSO send Telegram push if available (bonus)
    if (chatId && TBOT) {
      try {
        if (telegramOptions) {
          await TBOT.sendMessage(
            chatId,
            message,
            telegramOptions as unknown as Parameters<typeof TBOT.sendMessage>[2],
          );
        } else {
          await sharedTelegramNotificationService.sendSuccessNotification(chatId, message);
        }
      } catch (error) {
        logger.error(`Telegram notification failed for chat ${chatId}:`, error);
      }
    }
  }

  /**
   * Booking success notification (autobooking or reschedule)
   */
  async notifyBookingSuccess(options: NotifyBookingSuccessOptions): Promise<void> {
    const message = sharedTelegramNotificationService.buildBookingSuccessMessage(
      options.warehouseName,
      options.date,
      options.coefficient,
      options.transitWarehouseName,
      options.isReschedule,
    );

    const type: InAppNotificationType = options.isReschedule ? 'RESCHEDULE' : 'AUTOBOOKING';
    const title = options.isReschedule ? 'Поставка перенесена' : 'Поставка забронирована';
    const link = options.isReschedule ? '/reschedules' : '/autobooking';

    // Step 1: ALWAYS create in-app notification (primary channel)
    try {
      await inAppNotificationService.create({
        userId: options.userId,
        type,
        title,
        message,
        link,
        metadata: {
          warehouseName: options.warehouseName,
          coefficient: options.coefficient,
          date: options.date,
          transitWarehouseName: options.transitWarehouseName,
        },
      });
    } catch (error) {
      logger.error(
        `Failed to create in-app booking notification for user ${options.userId}:`,
        error,
      );
    }

    // Step 2: ALSO send Telegram push if available (bonus)
    if (options.chatId && TBOT) {
      try {
        await sharedTelegramNotificationService.sendSuccessNotification(
          options.chatId,
          message,
        );
      } catch (error) {
        logger.error(`Telegram booking notification failed for chat ${options.chatId}:`, error);
      }
    }
  }

  /**
   * Banned date notification (single user)
   */
  async notifyBannedDate(options: NotifyBannedDateOptions): Promise<void> {
    const message = sharedTelegramNotificationService.buildBannedDateMessage(
      options.warehouseName,
      options.date,
      options.supplyType,
      options.error,
      options.isReschedule,
    );

    const type: InAppNotificationType = options.isReschedule ? 'RESCHEDULE' : 'AUTOBOOKING';
    const title = 'Дата недоступна';
    const link = options.isReschedule ? '/reschedules' : '/autobooking';

    // Step 1: ALWAYS create in-app notification (primary channel)
    try {
      await inAppNotificationService.create({
        userId: options.userId,
        type,
        title,
        message,
        link,
        metadata: {
          warehouseName: options.warehouseName,
          date: options.date,
          supplyType: options.supplyType,
        },
      });
    } catch (error) {
      logger.error(
        `Failed to create in-app banned date notification for user ${options.userId}:`,
        error,
      );
    }

    // Step 2: ALSO send Telegram push if available (bonus)
    if (options.chatId && TBOT) {
      try {
        await sharedTelegramNotificationService.sendErrorNotification(options.chatId, message);
      } catch (error) {
        logger.error(
          `Telegram banned date notification failed for chat ${options.chatId}:`,
          error,
        );
      }
    }
  }

  /**
   * Bulk banned date notification
   */
  async notifyBannedDateBulk(options: NotifyBannedDateBulkOptions): Promise<void> {
    const message = sharedTelegramNotificationService.buildBannedDateMessage(
      options.warehouseName,
      options.date,
      options.supplyType,
      options.error,
      options.isReschedule,
    );

    const type: InAppNotificationType = options.isReschedule ? 'RESCHEDULE' : 'AUTOBOOKING';
    const title = 'Дата недоступна';
    const link = options.isReschedule ? '/reschedules' : '/autobooking';

    // Step 1: Create in-app notifications for ALL recipients (primary channel)
    for (const recipient of options.recipients) {
      try {
        await inAppNotificationService.create({
          userId: recipient.userId,
          type,
          title,
          message,
          link,
          metadata: {
            warehouseName: options.warehouseName,
            date: options.date,
            supplyType: options.supplyType,
          },
        });
      } catch (error) {
        logger.error(
          `Failed to create in-app banned date notification for user ${recipient.userId}:`,
          error,
        );
      }
    }

    // Step 2: Send Telegram to recipients with chatId (bonus)
    for (const recipient of options.recipients) {
      if (recipient.chatId && TBOT) {
        try {
          await sharedTelegramNotificationService.sendErrorNotification(recipient.chatId, message);
        } catch (error) {
          logger.error(
            `Failed to send bulk banned date Telegram to ${recipient.chatId}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Trigger slot availability notification
   */
  async notifyTriggerSlots(options: NotifyTriggerSlotsOptions): Promise<void> {
    const { userId, chatId, availabilities } = options;
    const message = this.buildTriggerNotificationMessage(availabilities);

    // Step 1: ALWAYS create in-app notification (primary channel)
    try {
      await inAppNotificationService.create({
        userId,
        type: 'TRIGGER',
        title: 'Доступные слоты',
        message,
        link: '/triggers',
        metadata: {
          warehouseCount: availabilities.length,
          warehouses: availabilities.map((a) => ({
            warehouseName: a.warehouseName,
            boxTypeID: a.boxTypeID,
            availableDates: a.availableDates,
          })),
        },
      });
    } catch (error) {
      logger.error(`Failed to create in-app trigger notification for user ${userId}:`, error);
    }

    // Step 2: ALSO send Telegram push if available (bonus)
    if (chatId && TBOT) {
      try {
        await TBOT.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Закрыть', callback_data: 'close_menu' }]],
          },
        });
      } catch (error) {
        logger.error(`Telegram trigger notification failed for chat ${chatId}:`, error);
      }
    }
  }

  /**
   * Build trigger notification message (extracted from supply-trigger-monitoring.service)
   */
  private buildTriggerNotificationMessage(
    availabilities: WarehouseAvailability[],
  ): string {
    const BOX_TYPE_IDS = { BOX: 2, MONOPALLETE: 5, SUPERSAFE: 6 };
    const SUPPLY_TYPES = { BOX: 'BOX', MONOPALLETE: 'MONOPALLETE', SUPERSAFE: 'SUPERSAFE' };

    return (
      `🔔 Доступные слоты:\n\n` +
      availabilities
        .map((availability) => {
          const groupedDates = availability.availableDates.reduce(
            (acc, date) => {
              const key =
                date.coefficient === 0 ? 'free' : date.coefficient.toString();
              if (!acc[key]) acc[key] = [];

              const dateObj = new Date(date.date);
              const day = dateObj.getDate().toString().padStart(2, '0');
              const month = dateObj
                .toLocaleString('ru-RU', { month: 'short' })
                .toLowerCase();
              acc[key].push(`📅 ${day} ${month} `);
              return acc;
            },
            {} as Record<string, string[]>,
          );

          const formatDatesGrid = (dates: string[]) => {
            const ITEMS_PER_ROW = 3;
            return dates
              .reduce((rows: string[][], date, index) => {
                const rowIndex = Math.floor(index / ITEMS_PER_ROW);
                if (!rows[rowIndex]) rows[rowIndex] = [];
                rows[rowIndex].push(date.padEnd(12, ' '));
                return rows;
              }, [])
              .map((row) => row.join(''))
              .join('\n');
          };

          const formattedGroups = [];
          if (groupedDates['free']) {
            formattedGroups.push(
              `🎉 Бесплатно \n\n${formatDatesGrid(groupedDates['free'])}`,
            );
          }

          Object.entries(groupedDates)
            .filter(([key]) => key !== 'free')
            .forEach(([coeff, dates]) => {
              formattedGroups.push(
                `Коэффициент: ${coeff} 💰\n\n${formatDatesGrid(dates)}`,
              );
            });

          const boxType =
            availability.boxTypeID === BOX_TYPE_IDS.BOX
              ? '*Короб*'
              : availability.boxTypeID === BOX_TYPE_IDS.MONOPALLETE
                ? '*Монопаллет*'
                : '*Суперсейф*';
          return `🏢 ${availability.warehouseName} ${boxType}:\n\n${formattedGroups.join('\n\n')}`;
        })
        .join('\n\n')
    );
  }
}

export const notificationDispatcher = new NotificationDispatcherService();
