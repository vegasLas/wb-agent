import { prisma } from "./../config/database";
import * as schedule from "node-schedule";
import { TBOT } from "../utils/TBOT";

interface SubscriptionNotification {
  userId: number;
  chatId: string;
  daysLeft: number;
  subscriptionExpiresAt: Date;
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
    schedule.scheduleJob("0 9 * * *", () => {
      this.checkSubscriptionExpirations().catch((error) => {
        console.error("Error in subscription expiration check:", error);
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

      // Get users with expiring subscriptions
      const expiringUsers = await prisma.user.findMany({
        where: {
          subscriptionExpiresAt: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          chatId: { not: null },
        },
        select: {
          id: true,
          chatId: true,
          subscriptionExpiresAt: true,
        },
      });

      console.log(
        `Found ${expiringUsers.length} users with expiring subscriptions`,
      );

      for (const user of expiringUsers) {
        if (!user.chatId || !user.subscriptionExpiresAt) continue;

        const daysLeft = Math.ceil(
          (user.subscriptionExpiresAt.getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000),
        );
        const notificationKey = `${user.id}-${daysLeft}`;

        // Skip if notification already sent for this user and day count
        if (this.notificationsSent.has(notificationKey)) {
          continue;
        }

        // Send notification only for exactly 7, 3, or 1 days - no spam
        if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
          await this.sendExpirationNotification({
            userId: user.id,
            chatId: user.chatId,
            daysLeft,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
          });

          // Mark as sent
          this.notificationsSent.add(notificationKey);
        }
      }
      console.log("this.notificationsSent.size: ", this.notificationsSent.size);
      // Clean up old notification records (keep only last 10 days)
      this.notificationsSent.forEach((key) => {
        const [, daysLeft] = key.split("-");
        if (parseInt(daysLeft) < 0) {
          this.notificationsSent.delete(key);
        }
      });
    } catch (error) {
      console.error("Error checking subscription expirations:", error);
    }
  }

  /**
   * Send subscription expiration notification
   */
  private async sendExpirationNotification(
    notification: SubscriptionNotification,
  ): Promise<void> {
    try {
      const { chatId, daysLeft, subscriptionExpiresAt } = notification;
      const URL = process.env.URL;

      const expirationDate = subscriptionExpiresAt.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      let message = "";

      if (daysLeft === 7) {
        message =
          `📅 <b>Подписка истекает через 7 дней</b>\n\n` +
          `Ваша подписка истекает <b>${expirationDate}</b>.\n\n` +
          `🚨 Через 7 дней перестанут работать:\n` +
          `• 📅 Таймслоты - мониторинг доступных слотов\n` +
          `• 🤖 Автобронирования - автоматическое бронирование\n\n` +
          `Не забудьте продлить подписку!`;
      } else if (daysLeft === 3) {
        message =
          `⚠️ <b>Подписка истекает через 3 дня</b>\n\n` +
          `Ваша подписка истекает <b>${expirationDate}</b>.\n\n` +
          `🚨 Через 3 дня перестанут работать:\n` +
          `• 📅 Таймслоты - мониторинг доступных слотов\n` +
          `• 🤖 Автобронирования - автоматическое бронирование\n\n` +
          `Не забудьте продлить подписку!`;
      } else if (daysLeft === 1) {
        message =
          `🚨 <b>Подписка истекает завтра!</b>\n\n` +
          `Ваша подписка истекает <b>${expirationDate}</b>.\n\n` +
          `🚨 Завтра перестанут работать:\n` +
          `• 📅 Таймслоты - мониторинг доступных слотов\n` +
          `• 🤖 Автобронирования - автоматическое бронирование\n\n` +
          `Не забудьте продлить подписку!`;
      }

      // Skip if message is empty (no matching day)
      if (!message) {
        return;
      }

      await TBOT.sendMessage(chatId, message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📝 Подписка и оплата",
                web_app: { url: `${URL}?view=store` },
              },
            ],
            [{ text: "❌ Закрыть", callback_data: "close_menu" }],
          ],
        },
      });
    } catch (error: any) {
      // Check if the error is due to user blocking the bot
      if (
        error?.response?.body?.error_code === 403 &&
        ["deactivated", "blocked by the user"].some((word) =>
          error?.response?.body?.description?.includes(word),
        )
      ) {
        console.log(
          `User ${notification.userId} has blocked the bot - cannot send expiration notification`,
        );
        return;
      }

      // Check for other bot-related errors
      if (
        error?.response?.body?.error_code === 400 &&
        error?.response?.body?.description?.includes("chat not found")
      ) {
        console.log(
          `Chat not found for user ${notification.userId} - user may have deleted the chat`,
        );
        return;
      }

      console.error(
        `Failed to send expiration notification to user ${notification.userId}:`,
        error,
      );
    }
  }

  /**
   * Manual method to trigger subscription check (for testing)
   */
  async triggerManualCheck(): Promise<void> {
    await this.checkSubscriptionExpirations();
  }
}

// Export singleton instance
export const subscriptionNotificationService =
  SubscriptionNotificationService.getInstance();
