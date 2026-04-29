import TelegramBot from 'node-telegram-bot-api';
import { HttpsProxyAgent } from 'https-proxy-agent';

import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TBOT');

// Rate limiting configuration
class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  constructor(
    private windowMs: number,
    private maxRequests: number,
    private _type: string,
  ) {}

  async isRateLimited(userId: string): Promise<boolean> {
    const now = Date.now();
    const userTimestamps = this.timestamps.get(userId) || [];

    // Remove old timestamps
    const validTimestamps = userTimestamps.filter(
      (ts) => now - ts < this.windowMs,
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

/**
 * Build proxy agent for Telegram API requests.
 * Priority:
 *   1. TELEGRAM_PROXY_URL (http://user:pass@host:port)
 *   2. First proxy from PROXY_LIST (login:password@ip:port format)
 */
function buildProxyAgent(): HttpsProxyAgent<string> | undefined {
  // Option 1: dedicated Telegram proxy URL
  if (process.env.TELEGRAM_PROXY_URL) {
    const url = process.env.TELEGRAM_PROXY_URL;
    return new HttpsProxyAgent(new URL(url));
  }
  return undefined;
}

// Initialize bot only if token is available
let bot: TelegramBot | null = null;

if (env.TELEGRAM_BOT_TOKEN) {
  try {
    const proxyAgent = buildProxyAgent();

    const botOptions: TelegramBot.ConstructorOptions = {
      polling: {
        interval: 2000,
        autoStart: true,
        params: {
          timeout: 30,
          allowed_updates: ['message', 'callback_query'],
        },
      },
    };

    if (proxyAgent) {
      (botOptions as any).request = { agent: proxyAgent };
      console.log('[TBOT] Proxy agent configured');
    } else {
      console.log('[TBOT] No proxy configured');
    }

    bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, botOptions);

    // Handle polling errors
    bot.on(
      'polling_error',
      (error: Error & { code?: string; errno?: string; syscall?: string }) => {
        console.log(
          '[TBOT] Polling error full:',
          JSON.stringify(
            {
              message: error.message,
              code: error.code,
              errno: error.errno,
              syscall: error.syscall,
              stack: error.stack,
            },
            null,
            2,
          ),
        );
        if (
          error.message?.includes('ESOCKETTIMEDOUT') ||
          error.message?.includes('ETIMEDOUT') ||
          error.code === 'EFATAL'
        ) {
          return;
        }
        logger.error('Telegram polling error:', error.message);
      },
    );

    // Rate limiting for messages
    bot.on('message', async (msg) => {
      const userId = msg.from?.id.toString();
      if (!userId) return;

      const isCommand = msg.text?.startsWith('/');
      const limiter = isCommand ? commandRateLimiter : messageRateLimiter;

      const isLimited = await limiter.isRateLimited(userId);
      if (isLimited) {
        const remainingTime = Math.ceil(
          (await limiter.getRemainingTime(userId)) / 1000,
        );
        await bot?.sendMessage(
          msg.chat.id,
          `⚠️ Слишком много запросов. Пожалуйста, подождите ${remainingTime} секунд.`,
        );
      }
    });

    // Rate limiting for callbacks
    bot.on('callback_query', async (query) => {
      const userId = query.from.id.toString();

      const isLimited = await callbackRateLimiter.isRateLimited(userId);
      if (isLimited) {
        const remainingTime = Math.ceil(
          (await callbackRateLimiter.getRemainingTime(userId)) / 1000,
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

export const TBOT = bot as TelegramBot | null;

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
