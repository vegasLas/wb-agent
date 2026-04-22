/**
 * Feedback Settings Service
 * Handles CRUD for global, category, and per-product feedback auto-answer settings,
 * plus auto-answer statistics, category stats, and product rules.
 */

import { prisma } from '@/config/database';
import { wbContentService } from '@/services/external/wb/wb-content.service';
import { cacheService } from '@/services/infrastructure/cache.service';
import { feedbackGoodsGroupService } from '@/services/domain/feedback/feedback-goods-group.service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackSettings');

export interface ProductStat {
  nmId: number;
  postedCount: number;
  rejectedCount: number;
}

export interface FeedbackStatistics {
  today: number;
  week: number;
  allTime: number;
  products: ProductStat[];
}

export interface GoodsItem {
  title: string;
  nmID: number;
  currentPrice: number | null;
  stocks: number;
  subject: string;
  feedbackRating: number;
  vendorCode: string;
  thumbnail: string | null;
}

export interface FeedbackProductRuleInput {
  minRating?: number | null;
  maxRating?: number | null;
  excludeKeywords?: string[];
  requireApproval?: boolean;
  enabled?: boolean;
}

export class FeedbackSettingsService {
  /**
   * Get auto-answer statistics (today, last 7 days, all time).
   */
  async getStatistics(userId: number, supplierId: string): Promise<FeedbackStatistics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [today, week, allTime, postedByNmId, rejectedAnswers] = await Promise.all([
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
      prisma.feedbackAutoAnswer.groupBy({
        by: ['nmId'],
        where: {
          userId,
          supplierId,
          status: 'POSTED',
        },
        _count: {
          nmId: true,
        },
      }),
      prisma.feedbackRejectedAnswer.findMany({
        where: {
          userId,
          supplierId,
        },
        select: {
          nmId: true,
        },
      }),
    ]);

    // Build posted counts map
    const postedMap = new Map<number, number>();
    for (const row of postedByNmId) {
      postedMap.set(row.nmId, row._count.nmId);
    }

    // Build rejected counts map
    const rejectedMap = new Map<number, number>();
    for (const answer of rejectedAnswers) {
      rejectedMap.set(answer.nmId, (rejectedMap.get(answer.nmId) || 0) + 1);
    }

    // Fetch goods groups for group-aware aggregation
    const groups = await feedbackGoodsGroupService.getGroups(userId, supplierId);
    const nmIdToGroup = new Map<number, string>();
    const groupTotals = new Map<string, { posted: number; rejected: number }>();

    for (const group of groups) {
      let posted = 0;
      let rejected = 0;
      for (const nmId of group.nmIds) {
        nmIdToGroup.set(nmId, group.id);
        posted += postedMap.get(nmId) || 0;
        rejected += rejectedMap.get(nmId) || 0;
      }
      groupTotals.set(group.id, { posted, rejected });
    }

    // Build effective counts: grouped nmIds use group total, ungrouped use individual
    const effectivePosted = new Map<number, number>();
    const effectiveRejected = new Map<number, number>();

    for (const nmId of postedMap.keys()) {
      const groupId = nmIdToGroup.get(nmId);
      if (groupId) {
        const total = groupTotals.get(groupId)!;
        effectivePosted.set(nmId, total.posted);
        effectiveRejected.set(nmId, total.rejected);
      } else {
        effectivePosted.set(nmId, postedMap.get(nmId) || 0);
        effectiveRejected.set(nmId, rejectedMap.get(nmId) || 0);
      }
    }

    for (const nmId of rejectedMap.keys()) {
      if (!effectiveRejected.has(nmId)) {
        const groupId = nmIdToGroup.get(nmId);
        if (groupId) {
          const total = groupTotals.get(groupId)!;
          effectivePosted.set(nmId, total.posted);
          effectiveRejected.set(nmId, total.rejected);
        } else {
          effectivePosted.set(nmId, postedMap.get(nmId) || 0);
          effectiveRejected.set(nmId, rejectedMap.get(nmId) || 0);
        }
      }
    }

    const allNmIds = new Set<number>([...effectivePosted.keys(), ...effectiveRejected.keys()]);
    const products: ProductStat[] = [];
    for (const nmId of allNmIds) {
      products.push({
        nmId,
        postedCount: effectivePosted.get(nmId) || 0,
        rejectedCount: effectiveRejected.get(nmId) || 0,
      });
    }

    return { today, week, allTime, products };
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

  // ==================== GOODS FETCHING ====================

  /**
   * Fetch all content cards grouped by category (subject).
   * Caches result for 5 minutes.
   */
  async getGoodsByCategory(
    userId: number,
    supplierId: string,
  ): Promise<Record<string, GoodsItem[]>> {
    const cacheKey = `goods_by_category:${userId}:${supplierId}`;
    const cached = cacheService.get<Record<string, GoodsItem[]>>(cacheKey, 5 * 60 * 1000);
    if (cached) {
      return cached;
    }

    const allCards: GoodsItem[] = [];
    let nextCursor: { n: number; nmID: number } | undefined;
    let hasMore = true;
    let page = 0;
    const MAX_PAGES = 100;

    try {
      do {
        const response = await wbContentService.getContentCardsTableList({
          userId,
          n: 100,
          cursor: nextCursor,
        });
        allCards.push(...response.cards);
        hasMore = response.cursor.next;
        if (hasMore) {
          nextCursor = { n: response.cursor.n, nmID: response.cursor.nmID };
        }
        page++;
      } while (hasMore && page < MAX_PAGES);
    } catch (error) {
      logger.error(`Failed to fetch content cards for user ${userId}:`, error);
      throw error;
    }

    const grouped: Record<string, GoodsItem[]> = {};
    for (const card of allCards) {
      const category = card.subject || 'Без категории';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(card);
    }

    cacheService.set(cacheKey, grouped);
    return grouped;
  }

  // ==================== PRODUCT RULES ====================

  /**
   * Get all product rules for a user + supplier.
   */
  async getProductRules(userId: number, supplierId: string) {
    return prisma.feedbackProductRule.findMany({
      where: { userId, supplierId },
    });
  }

  /**
   * Upsert a product rule for a specific nmId.
   */
  async updateProductRule(
    userId: number,
    supplierId: string,
    nmId: number,
    input: FeedbackProductRuleInput,
  ) {
    return prisma.feedbackProductRule.upsert({
      where: {
        userId_supplierId_nmId: {
          userId,
          supplierId,
          nmId,
        },
      },
      update: {
        minRating: input.minRating ?? null,
        maxRating: input.maxRating ?? null,
        excludeKeywords: input.excludeKeywords ?? [],
        requireApproval: input.requireApproval ?? false,
        enabled: input.enabled ?? true,
      },
      create: {
        userId,
        supplierId,
        nmId,
        minRating: input.minRating ?? null,
        maxRating: input.maxRating ?? null,
        excludeKeywords: input.excludeKeywords ?? [],
        requireApproval: input.requireApproval ?? false,
        enabled: input.enabled ?? true,
      },
    });
  }
}

export const feedbackSettingsService = new FeedbackSettingsService();
