/**
 * Feedback Settings Service
 * Handles CRUD for global, category, and per-product feedback auto-answer settings,
 * plus auto-answer statistics, category stats, and product rules.
 */

import { prisma } from '@/config/database';
import { wbContentOfficialService } from '@/services/external/wb/official';
import { resolveOfficialSupplierId } from '@/services/external/wb/official';
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
  stocks: number;
  subject: string;
  feedbackRating: number;
  vendorCode: string;
  thumbnail: string | null;
}

export interface FeedbackRuleInput {
  nmIds?: number[];
  minRating?: number | null;
  maxRating?: number | null;
  keywords?: string[];
  instruction?: string | null;
  mode?: 'skip' | 'instruction';
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
    let nextCursor:
      | { n?: number; nmID?: number; updatedAt?: string }
      | undefined;
    let hasMore = true;
    let page = 0;
    const MAX_PAGES = 100;

    try {
      const officialSupplierId = await resolveOfficialSupplierId(userId, 'CONTENT');
      if (!officialSupplierId) {
        throw new Error('No suitable official API key found for Content. Please add a Content API key in your profile.');
      }

      do {
        const response = await wbContentOfficialService.getContentCardsTableList({
          supplierId: officialSupplierId,
          limit: 100,
          cursor: nextCursor?.updatedAt
            ? { updatedAt: nextCursor.updatedAt, nmID: nextCursor.nmID ?? 0 }
            : undefined,
        });
        allCards.push(...response.cards.map((card) => ({
          title: card.title,
          nmID: card.nmID,
          stocks: card.stocks,
          subject: card.subjectName,
          feedbackRating: card.feedbackRating,
          vendorCode: card.vendorCode,
          thumbnail: card.mediaFiles?.[0]?.miniUrl || card.mediaFiles?.[0]?.url || null,
        })));
        hasMore = response.cards.length === 100 && response.cursor != null;
        if (hasMore) {
          nextCursor = {
            nmID: response.cursor.nmID,
            updatedAt: response.cursor.updatedAt,
          };
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
  async getFeedbackRules(userId: number, supplierId: string) {
    return prisma.feedbackRule.findMany({
      where: { userId, supplierId },
    });
  }

  /**
   * Create a new feedback rule.
   */
  async createFeedbackRule(
    userId: number,
    supplierId: string,
    input: FeedbackRuleInput & { nmIds: number[] },
  ) {
    const uniqueNmIds = [...new Set(input.nmIds)];
    if (uniqueNmIds.length === 0) {
      throw new Error('Rule must contain at least one product');
    }

    const rule = await prisma.feedbackRule.create({
      data: {
        userId,
        supplierId,
        nmIds: uniqueNmIds,
        minRating: input.minRating ?? null,
        maxRating: input.maxRating ?? null,
        keywords: input.keywords ?? [],
        instruction: input.instruction ?? null,
        mode: input.mode ?? 'skip',
        enabled: input.enabled ?? true,
      },
    });

    logger.info(
      `Created rule ${rule.id} for user ${userId} with nmIds: [${uniqueNmIds.join(', ')}]`,
    );
    return rule;
  }

  /**
   * Update an existing feedback rule by ID.
   */
  async updateFeedbackRule(
    id: string,
    userId: number,
    input: FeedbackRuleInput,
  ) {
    const existing = await prisma.feedbackRule.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error('Rule not found');
    }

    const updateData: Partial<{
      nmIds: number[];
      minRating: number | null;
      maxRating: number | null;
      keywords: string[];
      instruction: string | null;
      mode: 'skip' | 'instruction';
      enabled: boolean;
    }> = {};

    if (input.nmIds !== undefined) {
      const uniqueNmIds = [...new Set(input.nmIds)];
      if (uniqueNmIds.length === 0) {
        throw new Error('Rule must contain at least one product');
      }
      updateData.nmIds = uniqueNmIds;
    }
    if (input.minRating !== undefined) updateData.minRating = input.minRating ?? null;
    if (input.maxRating !== undefined) updateData.maxRating = input.maxRating ?? null;
    if (input.keywords !== undefined) updateData.keywords = input.keywords ?? [];
    if (input.instruction !== undefined) updateData.instruction = input.instruction ?? null;
    if (input.mode !== undefined) updateData.mode = input.mode;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;

    const rule = await prisma.feedbackRule.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Updated rule ${id} for user ${userId}`);
    return rule;
  }

  /**
   * Delete a product rule by ID.
   */
  async deleteFeedbackRule(id: string, userId: number) {
    const result = await prisma.feedbackRule.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new Error('Rule not found');
    }

    logger.info(`Deleted rule ${id} for user ${userId}`);
  }


}

export const feedbackSettingsService = new FeedbackSettingsService();
