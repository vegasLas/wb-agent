/**
 * Telegram Bot Plugin
 * Handles bot commands, messages, and callback queries
 * Replaces the Nuxt server/plugins/telegram.ts functionality
 */

import TelegramBot from 'node-telegram-bot-api';
import { TBOT } from '../utils/TBOT';
import { adminService } from '../services/admin.service';
import {
  enableAutobookingProcessing,
  disableAutobookingProcessing,
  isAutobookingProcessingActive,
} from '../services/autobooking-control.service';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

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

  logger.info('Setting up Telegram bot plugin...');

  // Handle /start command
  TBOT.onText(/^\/start$/, async (msg) => {
    if (!msg.from) return;

    try {
      await processStart(msg);
    } catch (error) {
      logger.error('Error in /start command:', error);
      await TBOT?.sendMessage(
        msg.chat.id,
        '❌ Произошла ошибка. Пожалуйста, попробуйте позже.'
      );
    }
  });

  // Handle /enable command (Admin only)
  TBOT.onText(/^\/enable/, async (msg) => {
    if (!msg.from) return;

    if (!(await isAdmin(msg.from.id))) {
      logger.warn(
        `Unauthorized /enable attempt by user ID: ${msg.from.id}`
      );
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ У вас нет прав для выполнения этой команды.'
      );
      return;
    }

    try {
      enableAutobookingProcessing();
      await TBOT?.sendMessage(
        msg.chat.id,
        '✅ <b>Автобронирование включено</b>\n\nОбработка автобронирований активна.',
        { parse_mode: 'HTML' }
      );
      logger.info(`Autobooking enabled by admin ${msg.from.id}`);
    } catch (error) {
      logger.error('Error in /enable command:', error);
      await TBOT?.sendMessage(
        msg.chat.id,
        '❌ Ошибка при выполнении команды.'
      );
    }
  });

  // Handle /disable command (Admin only)
  TBOT.onText(/^\/disable/, async (msg) => {
    if (!msg.from) return;

    if (!(await isAdmin(msg.from.id))) {
      logger.warn(
        `Unauthorized /disable attempt by user ID: ${msg.from.id}`
      );
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ У вас нет прав для выполнения этой команды.'
      );
      return;
    }

    try {
      disableAutobookingProcessing();
      await TBOT?.sendMessage(
        msg.chat.id,
        '🚫 <b>Автобронирование отключено</b>\n\nОбработка автобронирований остановлена. Триггеры продолжают работать.',
        { parse_mode: 'HTML' }
      );
      logger.info(`Autobooking disabled by admin ${msg.from.id}`);
    } catch (error) {
      logger.error('Error in /disable command:', error);
      await TBOT?.sendMessage(
        msg.chat.id,
        '❌ Ошибка при выполнении команды.'
      );
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
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      logger.error('Error in /status command:', error);
    }
  });

  // Handle /broadcast command (Admin only)
  TBOT.onText(/^\/broadcast ([\s\S]+)/, async (msg, match) => {
    if (!msg.from) return;

    if (!(await isAdmin(msg.from.id))) {
      logger.warn(
        `Unauthorized /broadcast attempt by user ID: ${msg.from.id}`
      );
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ У вас нет прав для выполнения этой команды.'
      );
      return;
    }

    const messageText = match ? match[1] : null;

    if (!messageText || messageText.trim().length === 0) {
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ Пожалуйста, укажите текст сообщения после команды /broadcast.'
      );
      return;
    }

    try {
      // Confirm broadcast start
      await TBOT?.sendMessage(
        msg.chat.id,
        `🚀 Начинаю рассылку сообщения:\n${messageText}\n\nЭто может занять некоторое время...`
      );

      const result = await adminService.broadcastMessage(messageText.trim());

      // Send result
      await TBOT?.sendMessage(
        msg.chat.id,
        `✅ <b>Рассылка завершена</b>\n\n📨 Всего пользователей: ${result.totalUsers}\n✓ Успешно: ${result.successful}\n✗ Не удалось: ${result.failed}`,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      logger.error('Error in /broadcast command:', error);
      await TBOT?.sendMessage(
        msg.chat.id,
        '❌ Ошибка при выполнении рассылки.'
      );
    }
  });

  // Handle /help command
  TBOT.onText(/^\/help/, async (msg) => {
    if (!msg.from) return;

    const isUserAdmin = await isAdmin(msg.from.id);

    let helpText = `
<b>Доступные команды:</b>

/start - Начать работу с ботом
/help - Показать это сообщение
    `.trim();

    if (isUserAdmin) {
      helpText += `

<b>Админ команды:</b>

/enable - Включить автобронирование
/disable - Отключить автобронирование
/status - Показать статус системы
/broadcast &lt;сообщение&gt; - Рассылка всем пользователям
      `;
    }

    await TBOT?.sendMessage(msg.chat.id, helpText, { parse_mode: 'HTML' });
  });

  // Handle text messages (non-commands)
  TBOT.on('message', async (msg) => {
    if (!msg.from || msg.from.is_bot) return;
    if (msg.text?.startsWith('/')) return; // Skip commands

    // Handle "Main menu" button
    if (msg.text === '🏠 Главное меню') {
      try {
        await TBOT?.deleteMessage(msg.chat.id, msg.message_id);
        await sendMainMenu({
          chatId: msg.chat.id.toString(),
          firstName: msg.from.first_name,
          sendGreeting: false,
        });
      } catch (error) {
        logger.error('Error handling main menu button:', error);
      }
      return;
    }

    // Handle long messages
    if (msg.text && msg.text.length > 1000) {
      await TBOT?.sendMessage(
        msg.chat.id,
        '⚠️ Сообщение слишком длинное. Максимум 1000 символов.'
      );
      return;
    }
  });

  // Handle callback queries
  TBOT.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery.message || !callbackQuery.from) return;

    try {
      await handleCallbackQuery(callbackQuery);
      await TBOT?.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      logger.error('Error handling callback query:', error);
      await TBOT?.answerCallbackQuery(callbackQuery.id, {
        text: 'Произошла ошибка. Пожалуйста, попробуйте позже.',
        show_alert: true,
      });
    }
  });

  logger.info('Telegram bot plugin setup complete');
}

/**
 * Process /start command - register or update user
 * @param msg - Telegram message
 */
async function processStart(msg: TelegramBot.Message): Promise<void> {
  if (!msg.from || !TBOT) return;

  const { id: telegramId, first_name, username, language_code } = msg.from;
  const chatId = msg.chat.id;

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        telegramId: BigInt(telegramId),
        chatId: chatId.toString(),
        name: first_name || 'User',
        username: username,
        languageCode: language_code,
      },
    });
    logger.info(`New user registered: ${telegramId}`);
  } else {
    // Update chatId if changed
    if (user.chatId !== chatId.toString()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { chatId: chatId.toString() },
      });
    }
  }

  // Send main menu
  await sendMainMenu({
    chatId: chatId.toString(),
    firstName: first_name,
    sendGreeting: true,
  });
}

/**
 * Send main menu to user
 * @param params - Menu parameters
 */
async function sendMainMenu(params: {
  chatId: string;
  firstName?: string;
  sendGreeting?: boolean;
}): Promise<void> {
  const { chatId, firstName, sendGreeting = true } = params;

  if (!TBOT) return;

  const greeting = sendGreeting && firstName ? `Привет, ${firstName}! 👋\n\n` : '';
  const message = `${greeting}Добро пожаловать в WB Booking Bot!`;

  await TBOT.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📦 Автобронирование', callback_data: 'menu_autobooking' }],
        [{ text: '🔄 Перенос поставки', callback_data: 'menu_reschedule' }],
        [{ text: '🔔 Триггеры', callback_data: 'menu_triggers' }],
        [{ text: '⚙️ Настройки', callback_data: 'menu_settings' }],
      ],
    },
  });
}

/**
 * Handle callback queries from inline keyboards
 * @param callbackQuery - Telegram callback query
 */
async function handleCallbackQuery(
  callbackQuery: TelegramBot.CallbackQuery
): Promise<void> {
  if (!callbackQuery.message || !callbackQuery.data || !TBOT) return;

  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  switch (data) {
    case 'menu_autobooking':
      await TBOT.editMessageText(
        '📦 <b>Автобронирование</b>\n\nАвтоматическое бронирование поставок на выбранные даты.',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Создать', callback_data: 'autobooking_create' }],
              [{ text: '📋 Мои бронирования', callback_data: 'autobooking_list' }],
              [{ text: '◀️ Назад', callback_data: 'menu_main' }],
            ],
          },
        }
      );
      break;

    case 'menu_reschedule':
      await TBOT.editMessageText(
        '🔄 <b>Перенос поставки</b>\n\nПеренос существующих поставок на другие даты.',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Создать перенос', callback_data: 'reschedule_create' }],
              [{ text: '📋 Мои переносы', callback_data: 'reschedule_list' }],
              [{ text: '◀️ Назад', callback_data: 'menu_main' }],
            ],
          },
        }
      );
      break;

    case 'menu_triggers':
      await TBOT.editMessageText(
        '🔔 <b>Триггеры</b>\n\nУведомления о появлении свободных слотов на склады.',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Создать триггер', callback_data: 'trigger_create' }],
              [{ text: '📋 Мои триггеры', callback_data: 'trigger_list' }],
              [{ text: '◀️ Назад', callback_data: 'menu_main' }],
          ],
          },
        }
      );
      break;

    case 'menu_settings':
      await TBOT.editMessageText(
        '⚙️ <b>Настройки</b>\n\nУправление аккаунтом и поставщиками.',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '👤 Профиль', callback_data: 'settings_profile' }],
              [{ text: '🏢 Поставщики', callback_data: 'settings_suppliers' }],
              [{ text: '◀️ Назад', callback_data: 'menu_main' }],
            ],
          },
        }
      );
      break;

    case 'menu_main':
      await sendMainMenu({
        chatId: chatId.toString(),
        sendGreeting: false,
      });
      // Delete the old message after sending new one
      try {
        await TBOT.deleteMessage(chatId, messageId);
      } catch {
        // Ignore delete errors
      }
      break;

    case 'close_menu':
      await TBOT.deleteMessage(chatId, messageId);
      break;

    // Placeholder handlers for future implementation
    case 'autobooking_create':
    case 'autobooking_list':
    case 'reschedule_create':
    case 'reschedule_list':
    case 'trigger_create':
    case 'trigger_list':
    case 'settings_profile':
    case 'settings_suppliers':
      await TBOT.answerCallbackQuery(callbackQuery.id, {
        text: 'Эта функция будет доступна в веб-приложении.',
        show_alert: true,
      });
      break;

    default:
      // Handle unknown callbacks
      if (data.startsWith('book_')) {
        // Handle booking callbacks (future implementation)
      } else if (data.startsWith('cancel_')) {
        // Handle cancel callbacks (future implementation)
      }
      break;
  }
}

export { sendMainMenu };
