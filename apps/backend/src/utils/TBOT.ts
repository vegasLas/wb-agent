import TelegramBot from 'node-telegram-bot-api';
import { env } from '../config/env';
import { logger } from './logger';

// Rate limiting configuration
class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  constructor(
    private windowMs: number,
    private maxRequests: number,
    // @ts-expect-error - type parameter is kept for compatibility but not used
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private _type: string
  ) {}

  async isRateLimited(userId: string): Promise<boolean> {
    const now = Date.now();
    const userTimestamps = this.timestamps.get(userId) || [];
    
    // Remove old timestamps
    const validTimestamps = userTimestamps.filter(
      (ts) => now - ts < this.windowMs
    );
    
    if (validTimestamps.length >= this.maxRequests) {
      return true;
    }
    
    validTimestamps.push(now);
    this.timestamps.set(userId, validTimestamps);
    return false;
  }

  async getRemainingTime(userId: string): Promise<number> {
    const userTimestamps = this.timestamps.get(userId) || [];
    if (userTimestamps.length === 0) return 0;
    
    const oldestTimestamp = userTimestamps[0];
    return this.windowMs - (Date.now() - oldestTimestamp);
  }
}

const messageRateLimiter = new RateLimiter(60000, 20, 'message');
const commandRateLimiter = new RateLimiter(60000, 10, 'command');
const callbackRateLimiter = new RateLimiter(60000, 30, 'callback');

// Initialize bot only if token is available
let bot: TelegramBot | null = null;

if (env.TELEGRAM_BOT_TOKEN) {
  try {
    bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
      polling: {
        interval: 2000,
        autoStart: true,
        params: {
          timeout: 30,
          allowed_updates: ['message', 'callback_query'],
        },
      },
    });

    // Handle polling errors
    bot.on('polling_error', (error: Error & { code?: string }) => {
      if (
        error.message?.includes('ESOCKETTIMEDOUT') ||
        error.message?.includes('ETIMEDOUT') ||
        error.code === 'EFATAL'
      ) {
        return;
      }
      logger.error('Telegram polling error:', error.message);
    });

    // Rate limiting for messages
    bot.on('message', async (msg) => {
      const userId = msg.from?.id.toString();
      if (!userId) return;

      const isCommand = msg.text?.startsWith('/');
      const limiter = isCommand ? commandRateLimiter : messageRateLimiter;

      const isLimited = await limiter.isRateLimited(userId);
      if (isLimited) {
        const remainingTime = Math.ceil(
          (await limiter.getRemainingTime(userId)) / 1000
        );
        await bot?.sendMessage(
          msg.chat.id,
          `⚠️ Слишком много запросов. Пожалуйста, подождите ${remainingTime} секунд.`
        );
      }
    });

    // Rate limiting for callbacks
    bot.on('callback_query', async (query) => {
      const userId = query.from.id.toString();

      const isLimited = await callbackRateLimiter.isRateLimited(userId);
      if (isLimited) {
        const remainingTime = Math.ceil(
          (await callbackRateLimiter.getRemainingTime(userId)) / 1000
        );
        await bot?.answerCallbackQuery(query.id, {
          text: `⚠️ Слишком много запросов. Пожалуйста, подождите ${remainingTime} секунд.`,
          show_alert: true,
        });
      }
    });

    logger.info('Telegram bot initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Telegram bot:', error);
  }
} else {
  logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot not initialized');
}

export const TBOT = bot;

/**
 * Send logout notification to user
 * @param chatId - Telegram chat ID
 */
export async function sendLogoutNotification(chatId: string): Promise<void> {
  if (!TBOT) {
    logger.warn('TBOT not initialized, cannot send logout notification');
    return;
  }

  try {
    await TBOT.sendMessage(chatId, '✅ Вы вышли из аккаунта WB', {
      reply_markup: {
        inline_keyboard: [[{ text: '❌', callback_data: 'close_menu' }]],
      },
    });
  } catch (error) {
    logger.error('Error sending logout notification:', error);
  }
}
