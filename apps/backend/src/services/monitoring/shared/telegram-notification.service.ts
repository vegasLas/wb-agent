import { TBOT } from "../../../utils/TBOT";
import { prisma } from "../../../config/database";
import { logger } from "../../../utils/logger";
import type {
  TelegramError,
  ISharedTelegramNotificationService,
  TelegramNotificationOptions,
} from "../interfaces/shared.interfaces";

export class SharedTelegramNotificationService implements ISharedTelegramNotificationService {
  /**
   * Sends a success notification with standard formatting
   */
  async sendSuccessNotification(
    chatId: string,
    message: string,
    options: TelegramNotificationOptions = {},
  ): Promise<void> {
    const defaultOptions = {
      parse_mode: "HTML" as const,
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Закрыть", callback_data: "close_menu" }],
        ],
      },
      ...options,
    };

    try {
      if (!TBOT) {
        logger.warn("TBOT not initialized, cannot send message");
        return;
      }
      await TBOT.sendMessage(chatId, message, defaultOptions);
    } catch (error) {
      await this.handleNotificationError(error as TelegramError, chatId);
    }
  }

  /**
   * Sends an error notification with standard formatting
   */
  async sendErrorNotification(
    chatId: string,
    message: string,
    options: TelegramNotificationOptions = {},
  ): Promise<void> {
    const defaultOptions = {
      parse_mode: "HTML" as const,
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Закрыть", callback_data: "close_menu" }],
        ],
      },
      ...options,
    };

    try {
      if (!TBOT) {
        logger.warn("TBOT not initialized, cannot send message");
        return;
      }
      await TBOT.sendMessage(chatId, message, defaultOptions);
    } catch (error) {
      await this.handleNotificationError(error as TelegramError, chatId);
    }
  }

  /**
   * Sends notification to multiple users with rate limiting
   */
  async sendBulkNotification(
    chatIds: Set<string>,
    message: string,
    options: TelegramNotificationOptions = {},
  ): Promise<void> {
    for (const chatId of chatIds) {
      try {
        await this.sendErrorNotification(chatId, message, options);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Rate limiting
      } catch (error) {
        logger.error(`Failed to send bulk notification to ${chatId}:`, error);
      }
    }
  }

  /**
   * Handles errors that occur during notification sending
   */
  async handleNotificationError(
    error: TelegramError,
    chatId: string,
  ): Promise<void> {
    logger.error(
      `Error sending Telegram notification to chat ${chatId}:`,
      error.message,
    );

    // Check if the error indicates the bot was blocked by the user
    if (this.isBotBlockedError(error)) {
      logger.log(
        `User with chatId ${chatId} has blocked the bot. Setting chatId to null.`,
      );
      await this.updateUserChatId(chatId, null);
    }
  }

  /**
   * Builds a standard success message for bookings
   */
  buildBookingSuccessMessage(
    warehouseName: string,
    date: Date,
    coefficient: number,
    transitWarehouseName?: string | null,
    isReschedule: boolean = false,
  ): string {
    const action = isReschedule ? "перенесена" : "забронирована";
    const icon = isReschedule ? "🎯" : "✅";

    const formattedDate = date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    let message =
      `${icon} <b>Поставка успешно ${action}!</b>\n\n` +
      `📦 Склад: <b>${warehouseName}</b>\n`;

    if (transitWarehouseName) {
      message += `🏢 Транзитный склад: <b>${transitWarehouseName}</b>\n`;
    }

    message += `📅 ${isReschedule ? "Новая дата" : "Дата"}: <b>${formattedDate}</b>\n`;

    if (coefficient === 0) {
      message += `💰 Коэффициент: <b>Бесплатно 🎉</b>`;
    } else {
      message += `📊 Коэффициент: <b>${coefficient}</b>`;
    }

    return message;
  }

  /**
   * Builds a standard error message for banned dates
   */
  buildBannedDateMessage(
    warehouseName: string,
    date: Date | null,
    supplyType: string,
    error?: TelegramError | Error | unknown,
    isReschedule: boolean = false,
  ): string {
    const action = isReschedule ? "переноса" : "бронирования";

    const formattedDate =
      date?.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) || "неизвестная дата";

    const supplyTypeNames: Record<string, string> = {
      BOX: "Коробка",
      MONOPALLETE: "Монопаллета",
      SUPERSAFE: "Суперсейф",
    };

    return (
      `⚠️ <b>Дата недоступна для ${action}</b>\n\n` +
      `📦 Склад: <b>${warehouseName}</b>\n` +
      `📅 Дата: <b>${formattedDate}</b>\n` +
      `📋 Тип: <b>${supplyTypeNames[supplyType] || supplyType}</b>\n` +
      `❌ Причина: ${(error as Error)?.message || "Неизвестная ошибка"}`
    );
  }

  /**
   * Checks if the error indicates the bot was blocked
   */
  private isBotBlockedError(error: TelegramError): boolean {
    return (
      (error.code === "ETELEGRAM" &&
        error.response?.body?.description?.includes(
          "bot was blocked by the user",
        )) ||
      false
    );
  }

  /**
   * Updates user's chat ID in the database
   */
  private async updateUserChatId(
    oldChatId: string,
    newChatId: string | null,
  ): Promise<void> {
    try {
      await prisma.user.update({
        where: { chatId: oldChatId },
        data: { chatId: newChatId },
      });
    } catch (error) {
      logger.error("Failed to update user chatId:", error);
    }
  }
}

export const sharedTelegramNotificationService =
  new SharedTelegramNotificationService();
