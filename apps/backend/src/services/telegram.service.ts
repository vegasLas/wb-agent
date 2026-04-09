import TelegramBot from 'node-telegram-bot-api';
import { TBOT } from '@/utils/TBOT';
import { logger } from '@/utils/logger';
import { channelSubscriptionService } from '@/services/channel-subscription.service';
import { userService } from '@/services/user.service';
import { generateUserEnvInfo } from '@/utils/userEnvInfo';

const URL = process.env.FRONTEND_URL || process.env.URL || '';

/**
 * Service for sending Telegram notifications and handling bot interactions
 * Wraps the TBOT instance with convenience methods
 */
export class TelegramService {
  /**
   * Send main menu to user with web app buttons
   * @param params - Menu parameters
   */
  async sendMainMenu({
    chatId,
    firstName,
    isNewUser,
    sendGreeting,
  }: {
    chatId: string;
    firstName: string;
    isNewUser?: boolean;
    sendGreeting?: boolean;
  }): Promise<void> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot send main menu');
      return;
    }

    const mainMenuKeyboard = {
      inline_keyboard: [
        [
          {
            text: '🔍 Автобронирования',
            web_app: { url: `${URL}?view=autobookings-main` },
          },
          {
            text: '🔍 Таймслоты',
            web_app: { url: `${URL}?view=triggers-main` },
          },
        ],
        [
          {
            text: '📝 Подписка и оплата',
            web_app: { url: `${URL}?view=store` },
          },
        ],
        [{ text: '🏢 Авторизация WB', web_app: { url: `${URL}?view=auth` } }],
        [
          { text: 'ℹ️ Поддержка', url: 'https://t.me/wb_booking_support' },
          { text: '💻 Инструкция', url: 'https://wbbook.ru' },
        ],
        [{ text: '⭐ Канал бота', url: 'https://t.me/wb_booking' }],
        [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
      ],
    };

    const welcomeMessage =
      `🤖 <b>Бот для автобронирования поставок</b>\n\n` +
      `${isNewUser ? `🎉 Как новому пользователю, мы дарим вам 14 дней подписки бесплатно! 🎁 \n\nЕсли вы у нас впервые, то после авторизации в WB кабинете, мы подарим вам 5 бесплатных кредитов.\n\n` : ''}` +
      `Вы можете настроить автоматическое бронирование для любого склада Wildberries.\n\n` +
      `Очень понятный и интуитивно-удобный интерфейс.\n\n` +
      `При проблемах обращайтесь в <b><a href="https://t.me/wb_booking_support">поддержку</a></b>.\n` +
      `На нашем <b><a href="https://t.me/wb_booking">канале</a></b> вся актуальная информация и акции.\n\n` +
      `Выбери пункт меню для продолжения`;

    if (sendGreeting) {
      await TBOT.sendMessage(chatId, `👋 Привет, ${firstName}!\n`, {
        reply_markup: {
          keyboard: [[{ text: '🏠 Главное меню' }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      });
    }

    await TBOT.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard,
    });
  }

  /**
   * Handle subscription check callback
   */
  private async handleSubscriptionCheck(
    userId: number,
    chatId: string,
    callbackQuery: TelegramBot.CallbackQuery,
    isNewUser = false,
  ): Promise<void> {
    if (!TBOT) return;

    const isSubscribed =
      await channelSubscriptionService.checkUserSubscription(userId);

    if (isSubscribed && callbackQuery.message) {
      try {
        await TBOT.deleteMessage(chatId, callbackQuery.message.message_id);
      } catch (deleteError) {
        // Silently ignore delete errors (message may already be deleted)
        const errorMsg = deleteError instanceof Error ? deleteError.message : String(deleteError);
        if (
          !errorMsg.includes("message can't be deleted for everyone") &&
          !errorMsg.includes('message to delete not found')
        ) {
          logger.warn('Error deleting message in subscription check:', deleteError);
        }
      }
      await this.sendMainMenu({
        chatId,
        firstName:
          callbackQuery.from.first_name +
          (callbackQuery.from.last_name
            ? ` ${callbackQuery.from.last_name}`
            : ''),
        isNewUser,
        sendGreeting: true,
      });
    } else {
      try {
        await TBOT.answerCallbackQuery(callbackQuery.id, {
          text: '❌ Вы еще не подписались на канал!',
          show_alert: true,
        });
      } catch (answerError) {
        // Silently ignore errors for old/invalid queries
        const errorMsg = answerError instanceof Error ? answerError.message : String(answerError);
        if (
          !errorMsg.includes('query is too old') &&
          !errorMsg.includes('response timeout expired') &&
          !errorMsg.includes('query ID is invalid')
        ) {
          logger.warn('Error answering callback query in subscription check:', answerError);
        }
      }
    }
  }

  /**
   * Handle callback queries
   */
  async handleCallbackQuery(
    callbackQuery: TelegramBot.CallbackQuery,
  ): Promise<void> {
    if (!TBOT) return;

    const chatId = String(callbackQuery.message?.chat.id);
    const userId = callbackQuery.from.id;

    try {
      switch (callbackQuery.data) {
        case 'check_subscription': {
          await this.handleSubscriptionCheck(userId, chatId, callbackQuery);
          break;
        }

        case 'check_subscription_new_user': {
          await this.handleSubscriptionCheck(
            userId,
            chatId,
            callbackQuery,
            true,
          );
          break;
        }

        case 'main_menu':
          if (callbackQuery.message?.message_id) {
            try {
              await TBOT.deleteMessage(chatId, callbackQuery.message.message_id);
            } catch (deleteError) {
              // Silently ignore delete errors (message may already be deleted)
              const errorMsg = deleteError instanceof Error ? deleteError.message : String(deleteError);
              if (
                !errorMsg.includes("Bad Request: message can't be deleted for everyone") &&
                !errorMsg.includes('message to delete not found')
              ) {
                logger.warn('Error deleting message in main_menu:', deleteError);
              }
            }
          }
          await this.sendMainMenu({
            chatId,
            firstName: callbackQuery.from.first_name,
            sendGreeting: false,
          });
          break;

        case 'close_menu':
          if (callbackQuery.message?.message_id) {
            const messageDate = callbackQuery.message.date;
            const currentTime = Math.floor(Date.now() / 1000);
            const messageAge = currentTime - messageDate;
            const MAX_DELETE_AGE = 48 * 60 * 60; // 48 hours in seconds

            if (messageAge > MAX_DELETE_AGE) {
              try {
                await TBOT.answerCallbackQuery(callbackQuery.id, {
                  text: 'К сожалению сообщение может быть удалено кнопкой только в течение 48 часов после его отправки.',
                  show_alert: true,
                });
              } catch (answerError) {
                // Silently ignore if answering fails (query too old)
                const errorMsg = answerError instanceof Error ? answerError.message : String(answerError);
                if (
                  !errorMsg.includes('query is too old') &&
                  !errorMsg.includes('response timeout expired') &&
                  !errorMsg.includes('query ID is invalid')
                ) {
                  logger.warn('Error answering callback query for old message:', answerError);
                }
              }
            } else {
              try {
                await TBOT.deleteMessage(
                  chatId,
                  callbackQuery.message.message_id,
                );
              } catch (deleteError) {
                // Silently ignore delete errors (message may already be deleted)
                const errorMsg = deleteError instanceof Error ? deleteError.message : String(deleteError);
                if (
                  !errorMsg.includes("Bad Request: message can't be deleted for everyone") &&
                  !errorMsg.includes('message to delete not found')
                ) {
                  logger.warn('Error deleting message in close_menu:', deleteError);
                }
              }
            }
          }
          break;

        case 'statistics': {
          const stats = await this.getStatistics(userId);
          await TBOT.editMessageText(
            '📊 <b>Ваша статистика:</b>\n\n' +
              `Всего поставок: ${stats.totalSupplies}\n` +
              `Успешных бронирований: ${stats.successfulBookings}\n` +
              `Активных запросов: ${stats.activeRequests}`,
            {
              chat_id: chatId,
              message_id: callbackQuery.message?.message_id,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
                ],
              },
            },
          );
          break;
        }

        default:
          break;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Bad Request: message can't be deleted for everyone") ||
        errorMessage.includes('message to delete not found')
      ) {
        try {
          await TBOT.answerCallbackQuery(callbackQuery.id, {
            text: 'К сожалению сообщение может быть удалено кнопкой только в течение 48 часов после его отправки.',
            show_alert: true,
          });
        } catch (answerError) {
          // Silently ignore if answering fails (query too old)
          const answerErrorMsg = answerError instanceof Error ? answerError.message : String(answerError);
          if (
            !answerErrorMsg.includes('query is too old') &&
            !answerErrorMsg.includes('response timeout expired') &&
            !answerErrorMsg.includes('query ID is invalid')
          ) {
            logger.warn('Error answering callback query for delete error:', answerError);
          }
        }
      } else {
        logger.error('Error in callback query:', error);
        try {
          await TBOT.answerCallbackQuery(callbackQuery.id, {
            text: 'Произошла ошибка. Пожалуйста, попробуйте позже.',
            show_alert: true,
          });
        } catch (answerError) {
          // Silently ignore if answering fails (query too old)
          const answerErrorMsg = answerError instanceof Error ? answerError.message : String(answerError);
          if (
            !answerErrorMsg.includes('query is too old') &&
            !answerErrorMsg.includes('response timeout expired') &&
            !answerErrorMsg.includes('query ID is invalid')
          ) {
            logger.warn('Error answering callback query for generic error:', answerError);
          }
        }
      }
    }
  }

  /**
   * Get user statistics
   */
  private async getStatistics(userId: number) {
    return userService.getUserStats(userId);
  }

  /**
   * Process /start command - register or update user
   * @param msg - Telegram message
   */
  async processStart(msg: TelegramBot.Message): Promise<void> {
    if (!msg.from || msg.from?.is_bot || !TBOT) return;

    const currentChatId = msg.chat.id.toString();
    let isNewUser = false;

    try {
      const existingUser = await userService.findByTelegramId(
        BigInt(msg.from.id),
      );

      if (existingUser) {
        if (existingUser.chatId !== currentChatId) {
          await userService.updateChatId(BigInt(msg.from.id), currentChatId);
        }
      } else {
        const envInfo = await generateUserEnvInfo();
        isNewUser = true;
        await userService.createUser({
          telegramId: BigInt(msg.from.id),
          username: msg.from.username,
          languageCode: msg.from.language_code,
          chatId: currentChatId,
          name: `${msg.from.first_name} ${msg.from.last_name || ''}`.trim(),
          envInfo: envInfo,
        });

        // Note: New user subscription (14 days free) should be handled separately
        // as it requires additional business logic
      }

      // Check channel subscription
      const isSubscribed =
        await channelSubscriptionService.checkUserSubscription(msg.from.id);

      if (!isSubscribed) {
        await channelSubscriptionService.sendSubscriptionRequest(
          Number(currentChatId),
          existingUser ? true : false,
        );
        return;
      }

      await this.sendMainMenu({
        chatId: currentChatId,
        firstName: msg.from.first_name,
        isNewUser,
        sendGreeting: true,
      });
    } catch (error) {
      logger.error('Error handling user:', error);
      await TBOT.sendMessage(
        currentChatId,
        'Произошла ошибка при обработке команды. Пожалуйста, попробуйте позже.',
      );
    }
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(msg: TelegramBot.Message): Promise<void> {
    if (!msg.text || !msg.from || !TBOT) return;

    const userId = msg.from.id;
    const chatId = String(msg.chat.id);

    const user = await userService.findByTelegramId(BigInt(userId));
    if (!user) return;

    // Handle main menu request
    if (msg.text === '🏠 Главное меню') {
      await this.sendMainMenu({
        chatId,
        firstName: msg.from.first_name,
        sendGreeting: false,
      });
    }
  }

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
    },
  ): Promise<void> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot send message');
      return;
    }

    try {
      await TBOT.sendMessage(chatId, text, {
        parse_mode: options?.parseMode || 'HTML',
        disable_notification: options?.disableNotification,
        reply_markup: options?.replyMarkup as
          | TelegramBot.InlineKeyboardMarkup
          | undefined,
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
    },
  ): Promise<void> {
    const coefText =
      triggerData.coefficient === 0
        ? 'Бесплатно'
        : `${triggerData.coefficient}x`;

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
    },
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
    },
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
    daysRemaining: number,
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
    },
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
