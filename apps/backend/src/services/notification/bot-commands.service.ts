import { TBOT } from '@/utils/TBOT';
import { prisma } from '@/config/database';
import { identityService } from '@/services/auth/identity.service';
import { linkCodeService } from '@/services/auth/link-code.service';
import { createLogger } from '@/utils/logger';
import TelegramBot from 'node-telegram-bot-api';
import { AuthProvider } from '@prisma/client';

const logger = createLogger('BotCommands');

const URL = process.env.FRONTEND_URL || process.env.URL || '';

export class BotCommandsService {
  initialize(): void {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot register bot commands');
      return;
    }

    TBOT.onText(/\/link_email/, this.handleLinkEmail.bind(this));
    TBOT.onText(/\/help/, this.handleHelp.bind(this));

    logger.info('Bot command handlers registered');
  }

  private async handleLinkEmail(msg: TelegramBot.Message): Promise<void> {
    if (!TBOT || !msg.from) return;

    try {
      const telegramId = String(msg.from.id);
      const chatId = msg.chat.id.toString();

      // Find user by TELEGRAM identity
      const identity = await prisma.userIdentity.findUnique({
        where: {
          provider_providerId: { provider: AuthProvider.TELEGRAM, providerId: telegramId },
        },
        include: { user: true },
      });

      if (!identity) {
        await TBOT.sendMessage(
          chatId,
          '❌ Вы не зарегистрированы.\n\n' +
          'Отправьте /start для создания аккаунта.'
        );
        return;
      }

      // Check if user already has EMAIL identity
      const emailIdentity = await prisma.userIdentity.findFirst({
        where: { userId: identity.user.id, provider: AuthProvider.EMAIL },
      });

      if (emailIdentity) {
        await TBOT.sendMessage(
          chatId,
          '✅ У вас уже привязан email: ' + (emailIdentity.email || 'неизвестно'),
        );
        return;
      }

      // Generate link code
      const code = await linkCodeService.generate(identity.user.id);

      const url = process.env.FRONTEND_URL || 'https://app.example.com';

      await TBOT.sendMessage(
        chatId,
        '🔗 <b>Привязка email</b>\n\n' +
        `Ваш код: <code>${code}</code>\n\n` +
        `1. Откройте ${url}/register\n` +
        '2. Заполните email, имя, пароль\n' +
        `3. Введите код <code>${code}</code> в поле "Код из Telegram"\n\n` +
        '⏳ Код действителен 1 час.',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 Копировать код', copy_text: { text: code } },
              ],
            ],
          },
        },
      );

      logger.info(`Link code generated for user ${identity.user.id}`);
    } catch (error) {
      logger.error('Error in /link_email command:', error);
      await TBOT.sendMessage(
        msg.chat.id,
        '❌ Произошла ошибка. Пожалуйста, попробуйте позже.',
      );
    }
  }

  private async handleHelp(msg: TelegramBot.Message): Promise<void> {
    if (!TBOT) return;

    await TBOT.sendMessage(
      msg.chat.id,
      '🤖 <b>Доступные команды</b>\n\n' +
      '/link_email - Получить код для привязки email\n' +
      '/help - Показать это сообщение\n\n' +
      '💡 <b>Совет:</b> Привяжите email для входа через браузер!\n' +
      'Откройте веб-приложение через кнопку меню бота.',
      { parse_mode: 'HTML' },
    );
  }
}

export const botCommandsService = new BotCommandsService();
