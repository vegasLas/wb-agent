/**
 * Telegram Notification Service
 * Phase 1: Foundation - Sends notifications via Telegram Bot API
 * 
 * Purpose: Handles all Telegram notifications for the monitoring system
 * including success notifications for bookings and error notifications
 */

import { TBOT } from '../../../utils/TBOT';
import { prisma } from '../../../config/database';
import { logger } from '../../../utils/logger';
import type {
  TelegramError,
  ISharedTelegramNotificationService,
  TelegramNotificationOptions,
} from './interfaces/sharedInterfaces';

/**
 * Service for sending Telegram notifications
 * Handles success/error messages and bot blocked detection
 */
export class SharedTelegramNotificationService implements ISharedTelegramNotificationService {
  /**
   * Sends a success notification with standard formatting
   * @param chatId - Telegram chat ID
   * @param message - Message text (HTML format)
   * @param options - Optional Telegram API options
   */
  async sendSuccessNotification(
    chatId: string,
    message: string,
    options: TelegramNotificationOptions = {}
  ): Promise<void> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot send success notification');
      return;
    }

    const defaultOptions: TelegramNotificationOptions = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
        ],
      },
      ...options,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await TBOT.sendMessage(chatId, message, defaultOptions as any);
    } catch (error) {
      await this.handleNotificationError(error as TelegramError, chatId);
    }
  }

  /**
   * Sends an error notification with standard formatting
   * @param chatId - Telegram chat ID
   * @param message - Message text (HTML format)
   * @param options - Optional Telegram API options
   */
  async sendErrorNotification(
    chatId: string,
    message: string,
    options: TelegramNotificationOptions = {}
  ): Promise<void> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot send error notification');
      return;
    }

    const defaultOptions: TelegramNotificationOptions = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
        ],
      },
      ...options,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await TBOT.sendMessage(chatId, message, defaultOptions as any);
    } catch (error) {
      await this.handleNotificationError(error as TelegramError, chatId);
    }
  }

  /**
   * Sends notification to multiple users with rate limiting
   * @param chatIds - Set of chat IDs to notify
   * @param message - Message text
   * @param options - Optional Telegram API options
   */
  async sendBulkNotification(
    chatIds: Set<string>,
    message: string,
    options: TelegramNotificationOptions = {}
  ): Promise<void> {
    for (const chatId of chatIds) {
      try {
        await this.sendErrorNotification(chatId, message, options);
        // Rate limiting: 100ms delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Failed to send bulk notification to ${chatId}:`, error);
      }
    }
  }

  /**
   * Handles errors that occur during notification sending
   * Detects if bot was blocked and updates user accordingly
   * @param error - The error object
   * @param chatId - The chat ID that failed
   */
  async handleNotificationError(
    error: TelegramError,
    chatId: string
  ): Promise<void> {
    logger.error(
      `Error sending Telegram notification to chat ${chatId}:`,
      error.message
    );

    // Check if the error indicates the bot was blocked by the user
    if (this.isBotBlockedError(error)) {
      logger.info(
        `User with chatId ${chatId} has blocked the bot. Setting chatId to null.`
      );
      await this.updateUserChatId(chatId, null);
    }
  }

  /**
   * Builds a standard success message for bookings
   * @param warehouseName - Name of the warehouse
   * @param date - Booking date
   * @param coefficient - Booking coefficient (0 = free)
   * @param transitWarehouseName - Optional transit warehouse name
   * @param isReschedule - Whether this is a reschedule notification
   * @returns Formatted HTML message
   */
  buildBookingSuccessMessage(
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string | null,
    isReschedule: boolean = false
  ): string {
    const action = isReschedule ? 'перенесена' : 'забронирована';
    const icon = isReschedule ? '🎯' : '✅';

    const formattedDate = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let message =
      `${icon} <b>Поставка успешно ${action}!</b>\n\n` +
      `📦 Склад: <b>${warehouseName}</b>\n`;

    if (transitWarehouseName) {
      message += `🏢 Транзитный склад: <b>${transitWarehouseName}</b>\n`;
    }

    message += `📅 ${isReschedule ? 'Новая дата' : 'Дата'}: <b>${formattedDate}</b>\n`;

    if (coefficient === 0) {
      message += `💰 Коэффициент: <b>Бесплатно 🎉</b>`;
    } else {
      message += `📊 Коэффициент: <b>${coefficient}</b>`;
    }

    return message;
  }

  /**
   * Builds a standard error message for banned dates
   * @param warehouseName - Name of the warehouse
   * @param date - The date that was banned (null if unknown)
   * @param supplyType - Type of supply (BOX, MONOPALLETE, SUPERSAFE)
   * @param error - The error that caused the ban
   * @param isReschedule - Whether this is a reschedule notification
   * @returns Formatted HTML message
   */
  buildBannedDateMessage(
    warehouseName: string,
    date: Date | null,
    supplyType: string,
    error?: TelegramError | Error | unknown,
    isReschedule: boolean = false
  ): string {
    const action = isReschedule ? 'переноса' : 'бронирования';

    const formattedDate =
      date?.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) || 'неизвестная дата';

    const supplyTypeNames: Record<string, string> = {
      BOX: 'Коробка',
      MONOPALLETE: 'Монопаллета',
      SUPERSAFE: 'Суперсейф',
    };

    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';

    return (
      `⚠️ <b>Дата недоступна для ${action}</b>\n\n` +
      `📦 Склад: <b>${warehouseName}</b>\n` +
      `📅 Дата: <b>${formattedDate}</b>\n` +
      `📋 Тип: <b>${supplyTypeNames[supplyType] || supplyType}</b>\n` +
      `❌ Причина: ${errorMessage}`
    );
  }

  /**
   * Checks if the error indicates the bot was blocked
   * @param error - The error object
   * @returns True if bot was blocked
   */
  private isBotBlockedError(error: TelegramError): boolean {
    return (
      (error.code === 'ETELEGRAM' &&
        error.response?.body?.description?.includes(
          'bot was blocked by the user'
        )) ||
      false
    );
  }

  /**
   * Updates user's chat ID in the database
   * @param oldChatId - The current chat ID
   * @param newChatId - The new chat ID (null to remove)
   */
  private async updateUserChatId(
    oldChatId: string,
    newChatId: string | null
  ): Promise<void> {
    try {
      await prisma.user.update({
        where: { chatId: oldChatId },
        data: { chatId: newChatId },
      });
    } catch (error) {
      logger.error('Failed to update user chatId:', error);
    }
  }
}

/**
 * Singleton instance of the telegram notification service
 */
export const sharedTelegramNotificationService = new SharedTelegramNotificationService();
