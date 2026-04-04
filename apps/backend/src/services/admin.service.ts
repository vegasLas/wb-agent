/**
 * Admin Service
 * Provides admin-only functionality like broadcasting messages to all users
 */

import { TBOT } from '../utils/TBOT';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Admin service for broadcast and administrative functions
 */
export class AdminService {
  /**
   * Broadcast a message to all users with a chatId
   * @param messageText - The message to broadcast
   * @returns Statistics about the broadcast
   */
  async broadcastMessage(messageText: string): Promise<{
    success: boolean;
    totalUsers: number;
    successful: number;
    failed: number;
  }> {
    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot broadcast message');
      return {
        success: false,
        totalUsers: 0,
        successful: 0,
        failed: 0,
      };
    }

    // Get all users with chatId
    const users = await prisma.user.findMany({
      where: {
        chatId: {
          not: null,
        },
      },
      select: {
        id: true,
        chatId: true,
        name: true,
      },
    });

    let successful = 0;
    let failed = 0;

    logger.info(`Starting broadcast to ${users.length} users`);

    for (const user of users) {
      if (!user.chatId) continue;

      try {
        await TBOT.sendMessage(user.chatId, messageText, {
          parse_mode: 'HTML',
        });
        successful++;

        // Rate limiting: 50ms delay between messages to avoid hitting Telegram limits
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        failed++;
        logger.error(`Failed to send broadcast to user ${user.id}:`, error);

        // If bot was blocked, clear the chatId
        if (this.isBotBlockedError(error)) {
          await prisma.user.update({
            where: { id: user.id },
            data: { chatId: null },
          });
          logger.info(`Cleared chatId for user ${user.id} (blocked bot)`);
        }
      }
    }

    logger.info(
      `Broadcast completed: ${successful} successful, ${failed} failed`,
    );

    return {
      success: true,
      totalUsers: users.length,
      successful,
      failed,
    };
  }

  /**
   * Check if error indicates bot was blocked by user
   */
  private isBotBlockedError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const err = error as {
      code?: string;
      response?: {
        body?: {
          description?: string;
        };
      };
    };

    return !!(
      err.code === 'ETELEGRAM' &&
      err.response?.body?.description?.includes('bot was blocked by the user')
    );
  }
}

export const adminService = new AdminService();
