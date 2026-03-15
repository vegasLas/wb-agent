import TelegramBot from 'node-telegram-bot-api';
import { TBOT } from '../utils/TBOT';
import { logger } from '../utils/logger';

/**
 * Service for sending Telegram notifications
 * Wraps the TBOT instance with convenience methods
 */
export class TelegramService {
  /**
   * Send a text message to a chat
   * @param chatId - Telegram chat ID
   * @param text - Message text (supports HTML formatting)
   * @param options - Additional message options
   */
  async sendMessage(
    chatId: string,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableNotification?: boolean;
      replyMarkup?: unknown;
    }
  ): Promise<void> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot send message');
      return;
    }

    try {
      await TBOT.sendMessage(chatId, text, {
        parse_mode: options?.parseMode || 'HTML',
        disable_notification: options?.disableNotification,
        reply_markup: options?.replyMarkup as TelegramBot.InlineKeyboardMarkup | undefined,
      });
    } catch (error) {
      logger.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  /**
   * Send a trigger notification to a user
   * @param chatId - Telegram chat ID
   * @param triggerData - Trigger notification data
   */
  async sendTriggerNotification(
    chatId: string,
    triggerData: {
      warehouseName: string;
      date: string;
      coefficient: number;
      supplyType: string;
    }
  ): Promise<void> {
    const coefText = triggerData.coefficient === 0 ? 'Бесплатно' : `${triggerData.coefficient}x`;

    const message = `🎯 <b>Найден слот по триггеру!</b>

📦 <b>${triggerData.warehouseName}</b>
📅 ${triggerData.date}
🏷️ ${triggerData.supplyType}
💰 ${coefText}

Перейдите в бота для бронирования.`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Send a booking success notification
   * @param chatId - Telegram chat ID
   * @param bookingData - Booking notification data
   */
  async sendBookingSuccess(
    chatId: string,
    bookingData: {
      warehouseName: string;
      date: string;
      supplyType: string;
    }
  ): Promise<void> {
    const message = `✅ <b>Бронирование выполнено!</b>

📦 <b>${bookingData.warehouseName}</b>
📅 ${bookingData.date}
🏷️ ${bookingData.supplyType}

Поставка успешно забронирована.`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Send a booking error notification
   * @param chatId - Telegram chat ID
   * @param errorData - Error notification data
   */
  async sendBookingError(
    chatId: string,
    errorData: {
      warehouseName: string;
      error: string;
    }
  ): Promise<void> {
    const message = `❌ <b>Ошибка бронирования</b>

📦 <b>${errorData.warehouseName}</b>

${errorData.error}

Попробуйте позже или обратитесь в поддержку.`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Send subscription expiration notification
   * @param chatId - Telegram chat ID
   * @param daysRemaining - Days until expiration
   */
  async sendSubscriptionExpirationWarning(
    chatId: string,
    daysRemaining: number
  ): Promise<void> {
    const message = `⚠️ <b>Подписка истекает</b>

Через ${daysRemaining} ${this.pluralize(daysRemaining, 'день', 'дня', 'дней')} ваша подписка истечет.

Продлите подписку, чтобы продолжить пользоваться автобронированием.`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Send autobooking completion notification
   * @param chatId - Telegram chat ID
   * @param data - Completion data
   */
  async sendAutobookingCompleted(
    chatId: string,
    data: {
      warehouseName: string;
      dates: string[];
    }
  ): Promise<void> {
    const datesText = data.dates.join('\n📅 ');
    const message = `✅ <b>Автобронирование завершено</b>

📦 <b>${data.warehouseName}</b>
📅 ${datesText}

Все даты успешно забронированы.`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Helper to pluralize Russian words
   */
  private pluralize(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return one;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return few;
    }
    return many;
  }
}

export const telegramService = new TelegramService();
