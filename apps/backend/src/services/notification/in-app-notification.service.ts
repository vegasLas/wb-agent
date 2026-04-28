import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';
import type { InAppNotification, InAppNotificationType, Prisma } from '@prisma/client';

const logger = createLogger('InAppNotificationService');

export interface CreateInAppNotificationParams {
  userId: number;
  type: InAppNotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export interface ListInAppNotificationsParams {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export class InAppNotificationService {
  /**
   * Create a new in-app notification record
   */
  async create(params: CreateInAppNotificationParams): Promise<InAppNotification> {
    try {
      const notification = await prisma.inAppNotification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link ?? null,
          metadata: params.metadata ?? Prisma.JsonNull,
        },
      });

      logger.debug(`Created in-app notification ${notification.id} for user ${params.userId}`);
      return notification;
    } catch (error) {
      logger.error(`Failed to create in-app notification for user ${params.userId}:`, error);
      throw error;
    }
  }

  /**
   * List notifications for a user with pagination
   */
  async list(
    userId: number,
    params: ListInAppNotificationsParams = {},
  ): Promise<{ notifications: InAppNotification[]; total: number }> {
    const { limit = 20, offset = 0, unreadOnly = false } = params;

    const where: Prisma.InAppNotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, total] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.inAppNotification.count({ where }),
    ]);

    return { notifications, total };
  }

  /**
   * Mark a single notification as read
   */
  async markRead(userId: number, id: string): Promise<InAppNotification | null> {
    try {
      const notification = await prisma.inAppNotification.updateMany({
        where: { id, userId },
        data: { readAt: new Date() },
      });

      if (notification.count === 0) {
        return null;
      }

      return prisma.inAppNotification.findUnique({ where: { id } });
    } catch (error) {
      logger.error(`Failed to mark notification ${id} as read:`, error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllRead(userId: number): Promise<number> {
    try {
      const result = await prisma.inAppNotification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });

      logger.debug(`Marked ${result.count} notifications as read for user ${userId}`);
      return result.count;
    } catch (error) {
      logger.error(`Failed to mark all notifications as read for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async delete(userId: number, id: string): Promise<boolean> {
    try {
      const result = await prisma.inAppNotification.deleteMany({
        where: { id, userId },
      });

      return result.count > 0;
    } catch (error) {
      logger.error(`Failed to delete notification ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      return prisma.inAppNotification.count({
        where: { userId, readAt: null },
      });
    } catch (error) {
      logger.error(`Failed to get unread count for user ${userId}:`, error);
      throw error;
    }
  }
}

export const inAppNotificationService = new InAppNotificationService();
