import { prisma } from '@/config/database';
import { TBOT } from '@/utils/TBOT';
import { createLogger } from '@/utils/logger';
import { ApiError } from '@/utils/errors';

const logger = createLogger('AdminService');

export class AdminService {
  /**
   * Send broadcast message to all users via Telegram
   */
  async sendBroadcast(messageText: string, adminUserId: number) {
    // Check if user is admin
    const admin = await prisma.admin.findUnique({
      where: { userId: adminUserId },
    });

    if (!admin) {
      throw ApiError.forbidden('Требуются права администратора');
    }

    if (!TBOT) {
      logger.warn('TBOT not initialized, cannot send broadcast');
      return {
        success: false,
        totalUsers: 0,
        successful: 0,
        failed: 0,
      };
    }

    // Get all users with chatId
    const telegrams = await prisma.telegram.findMany({
      where: {
        chatId: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    let successful = 0;
    let failed = 0;

    logger.info(`Starting broadcast to ${telegrams.length} users`);

    for (const telegram of telegrams) {
      if (!telegram.chatId) continue;

      try {
        await TBOT.sendMessage(telegram.chatId, messageText, {
          parse_mode: 'HTML',
        });
        successful++;

        // Rate limiting: 50ms delay between messages to avoid hitting Telegram limits
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        failed++;
        logger.error(`Failed to send broadcast to user ${telegram.user.id}:`, error);

        // If bot was blocked, clear the chatId
        if (this.isBotBlockedError(error)) {
          await prisma.telegram.update({
            where: { userId: telegram.user.id },
            data: { chatId: null },
          });
          logger.info(`Cleared chatId for user ${telegram.user.id} (blocked bot)`);
        }
      }
    }

    logger.info(
      `Broadcast completed: ${successful} successful, ${failed} failed`,
    );

    return {
      success: true,
      totalUsers: telegrams.length,
      successful,
      failed,
    };
  }

  private isBotBlockedError(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.includes('bot was blocked by the user')
    );
  }
}

export const adminService = new AdminService();
