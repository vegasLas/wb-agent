/**
 * Feedback Rejected Answer Service
 * Manages rejected AI-generated answers.
 */

import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackRejected');

export interface RejectedAnswerContext {
  id: string;
  feedbackText: string;
  rejectedAnswerText: string;
  aiAnalysis: string | null;
  mistakeCategory: string | null;
  productCategory: string | null;
  userFeedback: string | null;
  nmIds: number[];
  createdAt: Date;
}

const CATEGORY_RULES: Record<string, string> = {
  toys: 'Покупатель часто покупает товар не для себя, а для ребёнка. Не предполагай, что отзыв оставил конечный пользователь. Упоминай ребёнка/сын/дочь, если контекст подразумевает это.',
  игрушки: 'Покупатель часто покупает товар не для себя, а для ребёнка. Не предполагай, что отзыв оставил конечный пользователь. Упоминай ребёнка/сын/дочь, если контекст подразумевает это.',
  'детские товары': 'Покупатель часто покупает товар не для себя, а для ребёнка. Не предполагай, что отзыв оставил конечный пользователь. Упоминай ребёнка/сын/дочь, если контекст подразумевает это.',
  clothes: 'Учитывай размер, посадку, материал. Покупатель оценивает товар по личному опыту ношения.',
  одежда: 'Учитывай размер, посадку, материал. Покупатель оценивает товар по личному опыту ношения.',
  cosmetics: 'Учитывай тип кожи, аллергические реакции, эффект от использования.',
  косметика: 'Учитывай тип кожи, аллергические реакции, эффект от использования.',
  shoes: 'Учитывай размер, комфорт, качество материалов. Покупатель носит товар сам.',
  обувь: 'Учитывай размер, комфорт, качество материалов. Покупатель носит товар сам.',
};

export function getCategoryRule(category: string | null | undefined): string | null {
  if (!category) return null;
  const normalized = category.toLowerCase().trim();
  return CATEGORY_RULES[normalized] || null;
}

export class FeedbackRejectedService {
  /**
   * Save a rejected answer to the database.
   */
  async saveRejectedAnswer(params: {
    userId: number;
    supplierId: string;
    feedbackId: string;
    nmIds: number[];
    feedbackText: string;
    rejectedAnswerText: string;
    valuation: number;
    productCategory?: string | null;
    productName?: string | null;
    aiAnalysis?: string | null;
    mistakeCategory?: string | null;
    userFeedback?: string | null;
  }): Promise<void> {
    try {
      await prisma.feedbackRejectedAnswer.create({
        data: {
          userId: params.userId,
          supplierId: params.supplierId,
          feedbackId: params.feedbackId,
          nmIds: params.nmIds,
          feedbackText: params.feedbackText,
          rejectedAnswerText: params.rejectedAnswerText,
          valuation: params.valuation,
          productCategory: params.productCategory ?? null,
          productName: params.productName ?? null,
          userFeedback: params.userFeedback ?? null,
        },
      });
      logger.info(
        `Saved rejected answer for feedback ${params.feedbackId}, user ${params.userId}, nmIds: [${params.nmIds.join(', ')}]`,
      );
    } catch (error) {
      logger.error(
        `Failed to save rejected answer for feedback ${params.feedbackId}:`
        , error,
      );
      throw error;
    }
  }

  /**
   * Get recent rejected answers for a user to include in AI prompt context.
   * Filters by nmId (the array contains the target nmId).
   */
  async getRecentRejectedAnswers(
    userId: number,
    supplierId: string,
    limit = 30,
    nmId?: number,
    productCategory?: string,
  ): Promise<RejectedAnswerContext[]> {
    try {
      const rows = await prisma.feedbackRejectedAnswer.findMany({
        where: {
          userId,
          supplierId,
          ...(nmId !== undefined ? { nmIds: { has: nmId } } : {}),
          ...(productCategory ? { productCategory } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return rows.map((row) => ({
        id: row.id,
        feedbackText: row.feedbackText,
        rejectedAnswerText: row.rejectedAnswerText,
        aiAnalysis: row.aiAnalysis,
        mistakeCategory: row.mistakeCategory,
        productCategory: row.productCategory,
        userFeedback: row.userFeedback,
        nmIds: row.nmIds,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error(
        `Failed to fetch recent rejected answers for user ${userId}:`
        , error,
      );
      return [];
    }
  }

  /**
   * Update a rejected answer's userFeedback and/or nmIds.
   */
  async updateRejectedAnswer(
    id: string,
    userId: number,
    updates: { userFeedback?: string; nmIds?: number[] },
  ): Promise<void> {
    try {
      await prisma.feedbackRejectedAnswer.updateMany({
        where: { id, userId },
        data: {
          ...(updates.userFeedback !== undefined && { userFeedback: updates.userFeedback }),
          ...(updates.nmIds !== undefined && { nmIds: updates.nmIds }),
        },
      });
      logger.info(`Updated rejected answer ${id} for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to update rejected answer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a rejected answer.
   */
  async deleteRejectedAnswer(id: string, userId: number): Promise<void> {
    try {
      await prisma.feedbackRejectedAnswer.deleteMany({
        where: { id, userId },
      });
      logger.info(`Deleted rejected answer ${id} for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to delete rejected answer ${id}:`, error);
      throw error;
    }
  }
}

export const feedbackRejectedService = new FeedbackRejectedService();
