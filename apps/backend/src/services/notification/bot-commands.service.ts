import { TBOT } from '@/utils/TBOT';
import { prisma } from '@/config/database';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { createLogger } from '@/utils/logger';
import TelegramBot from 'node-telegram-bot-api';

const logger = createLogger('BotCommands');

const URL = process.env.FRONTEND_URL || process.env.URL || '';

export class BotCommandsService {
  /**
   * Initialize bot command handlers
   * Should be called after TBOT is initialized
   */
  initialize(): void {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot register bot commands');
      return;
    }

    // Register command handlers
    TBOT.onText(/\/login/, this.handleLogin.bind(this));
    TBOT.onText(/\/reset_password/, this.handleResetPassword.bind(this));
    TBOT.onText(/\/help/, this.handleHelp.bind(this));

    logger.info('Bot command handlers registered');
  }

  /**
   * Handle /login command - generate or retrieve credentials
   */
  private async handleLogin(msg: TelegramBot.Message): Promise<void> {
    if (!TBOT || !msg.from) return;

    try {
      const telegramId = BigInt(msg.from.id);
      const chatId = msg.chat.id.toString();
      const username = msg.from.username;
      const name = [msg.from.first_name, msg.from.last_name]
        .filter(Boolean)
        .join(' ');

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { telegramId },
      });

      if (!user) {
        // Create new user with generated credentials
        const { login, password, passwordHash } = jwtAuthService.generateCredentials(username);
        
        user = await prisma.user.create({
          data: {
            telegramId,
            chatId,
            username,
            name: name || username || 'User',
            login,
            passwordHash,
          },
        });

        // Send credentials to user with copy buttons
        await TBOT.sendMessage(
          chatId,
          this.formatCredentialsMessage(login, password, true),
          { 
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📋 Копировать логин', copy_text: { text: login } },
                  { text: '🔑 Копировать пароль', copy_text: { text: password } }
                ]
              ]
            }
          }
        );
        
        logger.info(`New user created with credentials: ${login}`, { telegramId });
      } else {
        // User exists - check if has credentials
        if (user.login && user.passwordHash) {
          // Already has credentials - send reminder (without password)
          await TBOT.sendMessage(
            chatId,
            this.formatExistingCredentialsMessage(user.login),
            { parse_mode: 'HTML' }
          );
        } else {
          // Generate credentials for existing user
          const { login, password, passwordHash } = jwtAuthService.generateCredentials(username);
          
          await prisma.user.update({
            where: { id: user.id },
            data: { login, passwordHash },
          });

          await TBOT.sendMessage(
            chatId,
            this.formatCredentialsMessage(login, password, false),
            { 
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📋 Копировать логин', copy_text: { text: login } },
                    { text: '🔑 Копировать пароль', copy_text: { text: password } }
                  ]
                ]
              }
            }
          );
          
          logger.info(`Credentials generated for existing user: ${login}`, { telegramId });
        }
      }
    } catch (error) {
      logger.error('Error in /login command:', error);
      await TBOT.sendMessage(
        msg.chat.id,
        '❌ Произошла ошибка. Пожалуйста, попробуйте позже.'
      );
    }
  }

  /**
   * Handle /reset_password command - regenerate credentials
   */
  private async handleResetPassword(msg: TelegramBot.Message): Promise<void> {
    if (!TBOT || !msg.from) return;

    try {
      const telegramId = BigInt(msg.from.id);
      const username = msg.from.username;

      const user = await prisma.user.findUnique({
        where: { telegramId },
      });

      if (!user) {
        await TBOT.sendMessage(
          msg.chat.id,
          '❌ Вы не зарегистрированы.\n\n' +
          'Используйте /login для создания аккаунта.'
        );
        return;
      }

      // Generate new credentials
      const { login, password, passwordHash } = jwtAuthService.generateCredentials(username);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { login, passwordHash },
      });

      await TBOT.sendMessage(
        msg.chat.id,
        this.formatCredentialsMessage(login, password, false, true),
        { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 Копировать логин', copy_text: { text: login } },
                { text: '🔑 Копировать пароль', copy_text: { text: password } }
              ]
            ]
          }
        }
      );
      
      logger.info(`Credentials reset for user: ${login}`, { telegramId });
    } catch (error) {
      logger.error('Error in /reset_password command:', error);
      await TBOT.sendMessage(
        msg.chat.id,
        '❌ Произошла ошибка. Пожалуйста, попробуйте позже.'
      );
    }
  }

  /**
   * Handle /help command - show available commands
   */
  private async handleHelp(msg: TelegramBot.Message): Promise<void> {
    if (!TBOT) return;

    await TBOT.sendMessage(
      msg.chat.id,
      '🤖 <b>Доступные команды</b>\n\n' +
      '/login - Получить данные для входа в браузер\n' +
      '/reset_password - Сгенерировать новые данные для входа\n' +
      '/help - Показать это сообщение\n\n' +
      '💡 <b>Совет:</b> Храните свои данные для входа в безопасном месте и не передавайте их никому!',
      { parse_mode: 'HTML' }
    );
  }

  /**
   * Format credentials message for new credentials
   */
  private formatCredentialsMessage(
    login: string,
    password: string,
    isNewUser: boolean,
    isReset: boolean = false
  ): string {
    const header = isNewUser 
      ? '🎉 <b>Добро пожаловать! Ваш аккаунт создан.</b>'
      : isReset
        ? '🔑 <b>Ваши данные для входа обновлены.</b>'
        : '🔑 <b>Ваши данные для входа в браузер:</b>';

    const webAppUrl = URL || 'https://app.example.com';

    return (
      `${header}\n\n` +
      `🆔 <b>Логин:</b> <code>${login}</code>\n` +
      `🔒 <b>Пароль:</b> <code>${password}</code>\n\n` +
      `🔗 <b>Открыть веб-приложение:</b> ${webAppUrl}\n\n` +
      `⚠️ <b>Важно:</b>\n` +
      `• Храните эти данные в безопасности\n` +
      `• Не передавайте их никому\n` +
      `• Используйте /reset_password, если забыли пароль\n\n` +
      `💡 <b>Совет:</b> Добавьте веб-приложение в закладки для быстрого доступа!`
    );
  }

  /**
   * Format message for existing credentials (without showing password)
   */
  private formatExistingCredentialsMessage(login: string): string {
    const webAppUrl = URL || 'https://app.example.com';

    return (
      `🔑 <b>Ваши данные для входа в браузер:</b>\n\n` +
      `🆔 <b>Логин:</b> <code>${login}</code>\n` +
      `🔒 <b>Пароль:</b> <i>(был отправлен при создании)</i>\n\n` +
      `🔗 <b>Открыть веб-приложение:</b> ${webAppUrl}\n\n` +
      `💡 Используйте /reset_password для генерации новых данных, если забыли пароль.`
    );
  }
}

export const botCommandsService = new BotCommandsService();
