/**
 * Feedback Settings Service
 * Handles CRUD for global and per-product feedback auto-answer settings,
 * plus auto-answer statistics.
 */

import { prisma } from '@/config/database';

export interface FeedbackStatistics {
  today: number;
  week: number;
  allTime: number;
}

export class FeedbackSettingsService {
  /**
   * Get auto-answer statistics (today, last 7 days, all time).
   */
  async getStatistics(userId: number, supplierId: string): Promise<FeedbackStatistics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [today, week, allTime] = await Promise.all([
      prisma.feedbackAutoAnswer.count({
        where: {
          userId,
          supplierId,
          status: 'POSTED',
          createdAt: { gte: todayStart },
        },
      }),
      prisma.feedbackAutoAnswer.count({
        where: {
          userId,
          supplierId,
          status: 'POSTED',
          createdAt: { gte: weekStart },
        },
      }),
      prisma.feedbackAutoAnswer.count({
        where: {
          userId,
          supplierId,
          status: 'POSTED',
        },
      }),
    ]);

    return { today, week, allTime };
  }

  /**
   * Get or create global settings for a user + supplier.
   */
  async getSettings(userId: number, supplierId: string) {
    let settings = await prisma.feedbackSettings.findUnique({
      where: {
        userId_supplierId: {
          userId,
          supplierId,
        },
      },
    });

    if (!settings) {
      settings = await prisma.feedbackSettings.create({
        data: { userId, supplierId, autoAnswerEnabled: false },
      });
    }

    return settings;
  }

  /**
   * Update global auto-answer setting.
   */
  async updateSettings(userId: number, supplierId: string, autoAnswerEnabled: boolean) {
    return prisma.feedbackSettings.upsert({
      where: {
        userId_supplierId: {
          userId,
          supplierId,
        },
      },
      update: { autoAnswerEnabled },
      create: { userId, supplierId, autoAnswerEnabled },
    });
  }

  /**
   * Update per-product auto-answer setting.
   */
  async updateProductSetting(
    userId: number,
    supplierId: string,
    nmId: number,
    autoAnswerEnabled: boolean,
  ) {
    return prisma.feedbackProductSetting.upsert({
      where: {
        userId_supplierId_nmId: {
          userId,
          supplierId,
          nmId,
        },
      },
      update: { autoAnswerEnabled },
      create: {
        userId,
        supplierId,
        nmId,
        autoAnswerEnabled,
      },
    });
  }

  /**
   * Get all per-product settings for a user + supplier.
   */
  async getProductSettings(userId: number, supplierId: string) {
    return prisma.feedbackProductSetting.findMany({
      where: {
        userId,
        supplierId,
      },
    });
  }
}

export const feedbackSettingsService = new FeedbackSettingsService();
