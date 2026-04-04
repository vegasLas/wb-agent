import { TBOT } from '../utils/TBOT';
import { logger } from '../utils/logger';

/**
 * Service for checking channel subscription status
 * Used to ensure users are subscribed to required channel before using bot
 */
export class ChannelSubscriptionService {
  private readonly CHANNEL_USERNAME = 'wb_booking'; // Channel username without @

  /**
   * Check if user is subscribed to required channel
   * @param userId - Telegram user ID
   * @returns True if user is subscribed (member, admin, or creator)
   */
  async checkUserSubscription(userId: number): Promise<boolean> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot check subscription');
      return false;
    }

    try {
      const chatMember = await TBOT.getChatMember(
        `@${this.CHANNEL_USERNAME}`,
        userId,
      );
      const allowedStatuses = ['member', 'administrator', 'creator'];
      return allowedStatuses.includes(chatMember.status);
    } catch (error) {
      logger.error('Error checking channel subscription:', error);
      return false;
    }
  }

  /**
   * Send subscription request message to user
   * @param chatId - Telegram chat ID
   * @param isNotNewUser - Whether user is already registered (affects callback data)
   */
  async sendSubscriptionRequest(
    chatId: number | string,
    isNotNewUser = false,
  ): Promise<void> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot send subscription request');
      return;
    }

    try {
      await TBOT.sendMessage(
        chatId,
        '❗ Для использования бота необходимо подписаться на наш канал @wb_booking\n\n' +
          'В котором вы можете найти все актуальные акции и скидки.\n\n' +
          'После подписки нажмите кнопку "Проверить подписку"',
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📢 Подписаться на канал',
                  url: 'https://t.me/wb_booking',
                },
              ],
              [
                {
                  text: '🔄 Проверить подписку',
                  callback_data: `${isNotNewUser ? 'check_subscription' : 'check_subscription_new_user'}`,
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      logger.error('Error sending subscription request:', error);
    }
  }
}

export const channelSubscriptionService = new ChannelSubscriptionService();
