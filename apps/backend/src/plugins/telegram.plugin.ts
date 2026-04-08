/**
 * Telegram Bot Plugin
 * Sets up event handlers and delegates to TelegramService
 * Replaces the Nuxt server/plugins/telegram.ts functionality
 */

import { TBOT } from '../utils/TBOT';
import { telegramService } from '../services';
import { adminService } from '../services';
import {
  enableAutobookingProcessing,
  disableAutobookingProcessing,
  isAutobookingProcessingActive,
} from '../services';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('TelegramPlugin');

// Admin ID from environment variable (first ID in the list)
const ADMIN_ID = env.TECHNICAL_MODE_USER_IDS
  ? Number(env.TECHNICAL_MODE_USER_IDS.split(',')[0])
  : null;

/**
 * Check if a user is an admin
 * @param telegramId - Telegram user ID
 * @returns True if user is admin
 */
async function isAdmin(telegramId: number): Promise<boolean> {
  if (!ADMIN_ID) return false;
  return telegramId === ADMIN_ID;
}

/**
 * Setup the Telegram bot event handlers
 * This should be called once when the server starts
 */
export function setupTelegramPlugin(): void {
  if (!TBOT) {
    logger.warn('TBOT not initialized, Telegram plugin not setup');
    return;
  }

  logger.debug('Setting up Telegram bot plugin...');

  // Handle /start command
  TBOT.onText(/^\/start$/, async (msg) => {
    if (!msg.from) return;

    try {
      await telegramService.processStart(msg);
    } catch (error) {
      logger.error('Error in /start command:', error);
      await TBOT?.sendMessage(
        msg.chat.id,
        '❌ Произошла ошибка. Пожалуйста, попробуйте позже.',
      );
    }
  });

  // Handle /enable command (Admin only)
  TBOT.onText(/^\/enable/, async (msg) => {
    if (!msg.from) return;

    if (!(await isAdmin(msg.from.id))) {
      logger.warn(`Unauthorized /enable attempt by user ID: ${msg.from.id}`);
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ У вас нет прав для выполнения этой команды.',
      );
      return;
    }

    try {
      enableAutobookingProcessing();
      await TBOT?.sendMessage(
        msg.chat.id,
        '✅ <b>Автобронирование включено</b>\n\nОбработка автобронирований активна.',
        { parse_mode: 'HTML' },
      );
      logger.info(`Autobooking enabled by admin ${msg.from.id}`);
    } catch (error) {
      logger.error('Error in /enable command:', error);
      await TBOT?.sendMessage(msg.chat.id, '❌ Ошибка при выполнении команды.');
    }
  });

  // Handle /disable command (Admin only)
  TBOT.onText(/^\/disable/, async (msg) => {
    if (!msg.from) return;

    if (!(await isAdmin(msg.from.id))) {
      logger.warn(`Unauthorized /disable attempt by user ID: ${msg.from.id}`);
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ У вас нет прав для выполнения этой команды.',
      );
      return;
    }

    try {
      disableAutobookingProcessing();
      await TBOT?.sendMessage(
        msg.chat.id,
        '🚫 <b>Автобронирование отключено</b>\n\nОбработка автобронирований остановлена. Триггеры продолжают работать.',
        { parse_mode: 'HTML' },
      );
      logger.info(`Autobooking disabled by admin ${msg.from.id}`);
    } catch (error) {
      logger.error('Error in /disable command:', error);
      await TBOT?.sendMessage(msg.chat.id, '❌ Ошибка при выполнении команды.');
    }
  });

  // Handle /status command (Admin only)
  TBOT.onText(/^\/status/, async (msg) => {
    if (!msg.from) return;

    if (!(await isAdmin(msg.from.id))) {
      return;
    }

    try {
      const isActive = isAutobookingProcessingActive();
      await TBOT?.sendMessage(
        msg.chat.id,
        `📊 <b>Статус системы</b>\n\nАвтобронирование: ${isActive ? '✅ Активно' : '🚫 Отключено'}`,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      logger.error('Error in /status command:', error);
    }
  });

  // Handle /broadcast command (Admin only)
  TBOT.onText(/^\/broadcast ([\s\S]+)/, async (msg, match) => {
    if (!msg.from) return;

    if (!(await isAdmin(msg.from.id))) {
      logger.warn(`Unauthorized /broadcast attempt by user ID: ${msg.from.id}`);
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ У вас нет прав для выполнения этой команды.',
      );
      return;
    }

    const messageText = match ? match[1] : null;

    if (!messageText || messageText.trim().length === 0) {
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ Пожалуйста, укажите текст сообщения после команды /broadcast.',
      );
      return;
    }

    try {
      await TBOT?.sendMessage(
        msg.chat.id,
        `🚀 Начинаю рассылку сообщения:\n${messageText}\n\nЭто может занять некоторое время...`,
      );

      const result = await adminService.broadcastMessage(messageText.trim());

      await TBOT?.sendMessage(
        msg.chat.id,
        `✅ <b>Рассылка завершена</b>\n\n📨 Всего пользователей: ${result.totalUsers}\n✓ Успешно: ${result.successful}\n✗ Не удалось: ${result.failed}`,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      logger.error('Error in /broadcast command:', error);
      await TBOT?.sendMessage(
        msg.chat.id,
        '❌ Ошибка при выполнении рассылки.',
      );
    }
  });

  // Handle /help command
  TBOT.onText(/^\/help/, async (msg) => {
    if (!msg.from) return;

    const isUserAdmin = await isAdmin(msg.from.id);

    let helpText = `<b>Доступные команды:</b>

/start - Начать работу с ботом
/help - Показать это сообщение`.trim();

    if (isUserAdmin) {
      helpText += `

<b>Админ команды:</b>

/enable - Включить автобронирование
/disable - Отключить автобронирование
/status - Показать статус системы
/broadcast &lt;сообщение&gt; - Рассылка всем пользователям`;
    }

    await TBOT?.sendMessage(msg.chat.id, helpText, { parse_mode: 'HTML' });
  });

  // Handle text messages (non-commands)
  TBOT.on('message', async (msg) => {
    if (!msg.from || msg.from.is_bot) return;
    if (msg.text?.startsWith('/')) return; // Skip commands

    try {
      await telegramService.handleMessage(msg);
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  });

  // Handle callback queries
  TBOT.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery.message || !callbackQuery.from) return;

    try {
      await telegramService.handleCallbackQuery(callbackQuery);
      await TBOT?.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      logger.error('Error handling callback query:', error);
      try {
        await TBOT?.answerCallbackQuery(callbackQuery.id, {
          text: 'Произошла ошибка. Пожалуйста, попробуйте позже.',
          show_alert: true,
        });
      } catch (answerError) {
        // Silently ignore errors when answering callback query fails
        // (e.g., query is too old, response timeout expired, or query ID is invalid)
        const answerErrorMsg = answerError instanceof Error ? answerError.message : String(answerError);
        if (
          answerErrorMsg.includes('query is too old') ||
          answerErrorMsg.includes('response timeout expired') ||
          answerErrorMsg.includes('query ID is invalid') ||
          answerErrorMsg.includes('message to delete not found')
        ) {
          // These are expected errors, ignore them
          return;
        }
        logger.error('Error answering callback query:', answerError);
      }
    }
  });

  logger.debug('Telegram bot plugin setup complete');
}
