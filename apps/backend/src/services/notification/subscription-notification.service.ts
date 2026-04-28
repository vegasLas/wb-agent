import { prisma } from '@/config/database';
import * as schedule from 'node-schedule';
import { TBOT } from '@/utils/TBOT';

interface SubscriptionNotification {
  userId: number;
  chatId: string;
  daysLeft: number;
  subscriptionExpiresAt: Date;
  tier?: string;
}

export class SubscriptionNotificationService {
  private static instance: SubscriptionNotificationService;
  private notificationsSent = new Set<string>(); // Track sent notifications to avoid duplicates

  static getInstance(): SubscriptionNotificationService {
    if (!this.instance) {
      this.instance = new SubscriptionNotificationService();
    }
    return this.instance;
  }

  /**
   * Initialize the service and schedule daily checks
   */
  init(): void {
    // Schedule daily check at 09:00 Moscow time
    schedule.scheduleJob('0 9 * * *', () => {
      this.checkSubscriptionExpirations().catch((error) => {
        console.error('Error in subscription expiration check:', error);
      });
    });
  }

  /**
   * Check for subscription expirations and send notifications
   */
  async checkSubscriptionExpirations(): Promise<void> {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      // Get active paid subscriptions expiring within 7 days
      const expiringSubs = await prisma.userSubscription.findMany({
        where: {
          tier: { not: 'FREE' },
          endedAt: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          user: {
            telegram: { isNot: null },
          },
        },
        include: {
          user: {
            include: {
              telegram: { select: { chatId: true } },
            },
          },
        },
      });

      console.log(
        `Found ${expiringSubs.length} subscriptions expiring within 7 days`,
      );

      for (const sub of expiringSubs) {
        const chatId = sub.user.telegram?.chatId;
        if (!chatId || !sub.endedAt) continue;

        const daysLeft = Math.ceil(
          (sub.endedAt.getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000),
        );
        const notificationKey = `${sub.userId}-${daysLeft}`;

        // Skip if notification already sent for this user and day count
        if (this.notificationsSent.has(notificationKey)) {
          continue;
        }

        // Send notification only for exactly 7, 3, or 1 days - no spam
        if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
          const notification: SubscriptionNotification = {
            userId: sub.userId,
            chatId,
            daysLeft,
            subscriptionExpiresAt: sub.endedAt,
            tier: sub.tier,
          };

          await this.sendNotification(notification);
          this.notificationsSent.add(notificationKey);
        }
      }
    } catch (error) {
      console.error('Error checking subscription expirations:', error);
    }
  }

  /**
   * Send Telegram notification about subscription expiration
   */
  private async sendNotification(
    notification: SubscriptionNotification,
  ): Promise<void> {
    const { chatId, daysLeft, subscriptionExpiresAt, tier } = notification;

    const tierNames: Record<string, string> = {
      LITE: 'Lite',
      PRO: 'Pro',
      MAX: 'Max',
    };

    const tierName = tierNames[tier ?? ''] ?? '';
    const expirationDate = subscriptionExpiresAt.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let message = '';
    if (daysLeft === 7) {
      message = `⏰ Ваша подписка ${tierName} истекает через 7 дней (${expirationDate}).\n\nНе забудьте продлить, чтобы сохранить доступ ко всем функциям.`;
    } else if (daysLeft === 3) {
      message = `⚠️ Ваша подписка ${tierName} истекает через 3 дня (${expirationDate}).\n\nРекомендуем продлить сейчас, чтобы избежать ограничений.`;
    } else if (daysLeft === 1) {
      message = `🚨 Ваша подписка ${tierName} истекает завтра (${expirationDate})!\n\nСрочно продлите подписку, чтобы не потерять доступ к функциям.`;
    }

    try {
      await TBOT.sendMessage(chatId, message, {
        parse_mode: 'HTML',
      });
      console.log(
        `Sent subscription expiration notification to user ${notification.userId} (${daysLeft} days left)`,
      );
    } catch (error) {
      console.error(
        `Failed to send notification to user ${notification.userId}:`,
        error,
      );
    }
  }
}

export const subscriptionNotificationService =
  SubscriptionNotificationService.getInstance();
