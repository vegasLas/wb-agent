import TelegramBot from 'node-telegram-bot-api';
import { TBOT } from '@/utils/TBOT';
import { logger } from '@/utils/logger';
import { channelSubscriptionService } from './channel-subscription.service';
import { userService } from '@/services/user/';
import { identityService } from '@/services/auth/identity.service';
import { generateUserEnvInfo } from '@/utils/userEnvInfo';
import { AuthProvider } from '@prisma/client';
import { prisma } from '@/config/database';

const URL = process.env.FRONTEND_URL || process.env.URL || '';

export class TelegramService {
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
      `${isNewUser ? `🎉 Как новому пользователю, мы дарим вам 14 дней подписки бесплатно! 🎁 \n\n` : ''}` +
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
            const MAX_DELETE_AGE = 48 * 60 * 60;

            if (messageAge > MAX_DELETE_AGE) {
              try {
                await TBOT.answerCallbackQuery(callbackQuery.id, {
                  text: 'К сожалению сообщение может быть удалено кнопкой только в течение 48 часов после его отправки.',
                  show_alert: true,
                });
              } catch (answerError) {
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

  private async getStatistics(userId: number) {
    return userService.getUserStats(userId);
  }

  async processStart(msg: TelegramBot.Message): Promise<void> {
    if (!msg.from || msg.from?.is_bot || !TBOT) return;

    const currentChatId = msg.chat.id.toString();
    let isNewUser = false;

    try {
      // Find user by TELEGRAM identity
      let identity = await prisma.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: AuthProvider.TELEGRAM,
            providerId: String(msg.from.id),
          },
        },
        include: { user: true },
      });

      let existingUser = identity?.user ?? null;

      if (existingUser) {
        if (existingUser.chatId !== currentChatId) {
          await userService.updateChatId(existingUser.id, currentChatId);
        }
      } else {
        const envInfo = await generateUserEnvInfo();
        isNewUser = true;

        await identityService.createUserWithIdentity(
          {
            name: `${msg.from.first_name} ${msg.from.last_name || ''}`.trim(),
            username: msg.from.username,
            languageCode: msg.from.language_code,
            chatId: currentChatId,
            envInfo: envInfo as any,
          },
          {
            provider: AuthProvider.TELEGRAM,
            providerId: String(msg.from.id),
          },
        );
      }

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

  async handleMessage(msg: TelegramBot.Message): Promise<void> {
    if (!msg.text || !msg.from || !TBOT) return;

    const userId = msg.from.id;
    const chatId = String(msg.chat.id);

    const identity = await prisma.userIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: AuthProvider.TELEGRAM,
          providerId: String(userId),
        },
      },
    });

    if (!identity) return;

    if (msg.text === '🏠 Главное меню') {
      await this.sendMainMenu({
        chatId,
        firstName: msg.from.first_name,
        sendGreeting: false,
      });
    }
  }

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

  async sendSubscriptionExpirationWarning(
    chatId: string,
    daysRemaining: number,
  ): Promise<void> {
    const message = `⚠️ <b>Подписка истекает</b>

Через ${daysRemaining} ${this.pluralize(daysRemaining, 'день', 'дня', 'дней')} ваша подписка истечет.

Продлите подписку, чтобы продолжить пользоваться автобронированием.`;

    await this.sendMessage(chatId, message);
  }

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
