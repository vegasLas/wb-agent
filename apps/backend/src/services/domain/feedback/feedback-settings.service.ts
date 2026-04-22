/**
 * Feedback Settings Service
 * Handles CRUD for global, category, and per-product feedback auto-answer settings,
 * plus auto-answer statistics, category stats, and product rules.
 */

import { prisma } from '@/config/database';
import { wbContentService } from '@/services/external/wb/wb-content.service';
import { cacheService } from '@/services/infrastructure/cache.service';
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

export interface CategoryStat {
  category: string;
  postedCount: number;
  rejectedCount: number;
  canEnableCategory: boolean;
  canEnableProduct: boolean;
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
          nmIds: true,
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
      for (const nmId of answer.nmIds) {
        rejectedMap.set(nmId, (rejectedMap.get(nmId) || 0) + 1);
      }
    }

    // Merge all unique nmIds
    const allNmIds = new Set<number>([...postedMap.keys(), ...rejectedMap.keys()]);
    const products: ProductStat[] = [];
    for (const nmId of allNmIds) {
      products.push({
        nmId,
        postedCount: postedMap.get(nmId) || 0,
        rejectedCount: rejectedMap.get(nmId) || 0,
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

  // ==================== CATEGORY SETTINGS ====================

  /**
   * Get all category settings for a user + supplier.
   */
  async getCategorySettings(userId: number, supplierId: string) {
    return prisma.feedbackCategorySetting.findMany({
      where: { userId, supplierId },
    });
  }

  /**
   * Update category auto-answer setting.
   * Validates threshold before allowing true.
   */
  async updateCategorySetting(
    userId: number,
    supplierId: string,
    category: string,
    autoAnswerEnabled: boolean,
  ) {
    if (autoAnswerEnabled) {
      const canEnable = await this.canEnableCategory(userId, supplierId, category);
      if (!canEnable) {
        throw new Error(
          `Category "${category}" does not meet the threshold (>= 30 posted or >= 20 rejected feedbacks)`,
        );
      }
    }

    return prisma.feedbackCategorySetting.upsert({
      where: {
        userId_supplierId_category: {
          userId,
          supplierId,
          category,
        },
      },
      update: { autoAnswerEnabled },
      create: {
        userId,
        supplierId,
        category,
        autoAnswerEnabled,
      },
    });
  }

  /**
   * Check if a category meets the threshold to enable auto-answer.
   */
  async canEnableCategory(
    userId: number,
    supplierId: string,
    category: string,
  ): Promise<boolean> {
    const stats = await this.getCategoryStats(userId, supplierId);
    const stat = stats.find((s) => s.category === category);
    if (!stat) return false;
    return stat.canEnableCategory;
  }

  /**
   * Check if a product can enable auto-answer (its category must meet threshold).
   */
  async canEnableProduct(
    userId: number,
    supplierId: string,
    category: string,
  ): Promise<boolean> {
    const stats = await this.getCategoryStats(userId, supplierId);
    const stat = stats.find((s) => s.category === category);
    if (!stat) return false;
    return stat.canEnableProduct;
  }

  /**
   * Get category-level statistics: posted and rejected counts per category.
   * Groups by productCategory from feedback data, then merges in goods categories
   * with zero counts so every category that has goods has a stat entry.
   */
  async getCategoryStats(userId: number, supplierId: string): Promise<CategoryStat[]> {
    const [postedGroups, rejectedGroups] = await Promise.all([
      prisma.feedbackAutoAnswer.groupBy({
        by: ['productCategory'],
        where: { userId, supplierId, status: 'POSTED' },
        _count: true,
      }),
      prisma.feedbackRejectedAnswer.groupBy({
        by: ['productCategory'],
        where: { userId, supplierId },
        _count: true,
      }),
    ]);

    console.log(
      `[getCategoryStats] userId=${userId}, supplierId=${supplierId} — postedGroups:`,
      postedGroups.map((g) => ({ category: g.productCategory, count: g._count })),
    );
    console.log(
      `[getCategoryStats] userId=${userId}, supplierId=${supplierId} — rejectedGroups:`,
      rejectedGroups.map((g) => ({ category: g.productCategory, count: g._count })),
    );

    const categoryMap = new Map<
      string,
      { postedCount: number; rejectedCount: number }
    >();

    for (const g of postedGroups) {
      const cat = g.productCategory || 'Без категории';
      const entry = categoryMap.get(cat) || { postedCount: 0, rejectedCount: 0 };
      entry.postedCount += g._count;
      categoryMap.set(cat, entry);
    }

    for (const g of rejectedGroups) {
      const cat = g.productCategory || 'Без категории';
      const entry = categoryMap.get(cat) || { postedCount: 0, rejectedCount: 0 };
      entry.rejectedCount += g._count;
      categoryMap.set(cat, entry);
    }

    // Merge in goods categories with zero counts so the frontend
    // never gets undefined for a category that has goods
    const goodsByCategory = await this.getGoodsByCategory(userId, supplierId);
    for (const category of Object.keys(goodsByCategory)) {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { postedCount: 0, rejectedCount: 0 });
      }
    }

    const stats: CategoryStat[] = [];
    for (const [category, counts] of categoryMap.entries()) {
      const canEnableCategory = counts.postedCount >= 30 || counts.rejectedCount >= 20;
      const canEnableProduct = canEnableCategory;
      stats.push({
        category,
        postedCount: counts.postedCount,
        rejectedCount: counts.rejectedCount,
        canEnableCategory,
        canEnableProduct,
      });
    }

    console.log(
      `[getCategoryStats] userId=${userId}, supplierId=${supplierId} — computed stats:`,
      stats.map((s) => ({
        category: s.category,
        posted: s.postedCount,
        rejected: s.rejectedCount,
        canEnable: s.canEnableCategory,
      })),
    );

    return stats;
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
