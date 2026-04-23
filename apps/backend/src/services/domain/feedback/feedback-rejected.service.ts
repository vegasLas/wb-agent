/**
 * Feedback Rejected Answer Service
 * Manages rejected AI-generated answers.
 */

import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';
import { feedbackGoodsGroupService } from './feedback-goods-group.service';

const logger = createLogger('FeedbackRejected');

export interface RejectedAnswerContext {
  id: string;
  feedbackText: string;
  rejectedAnswerText: string;
  aiAnalysis: string | null;
  mistakeCategory: string | null;
  userFeedback: string | null;
  nmId: number;
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
    nmId: number;
    feedbackText: string;
    rejectedAnswerText: string;
    valuation: number;
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
          nmId: params.nmId,
          feedbackText: params.feedbackText,
          rejectedAnswerText: params.rejectedAnswerText,
          valuation: params.valuation,
          productName: params.productName ?? null,
          userFeedback: params.userFeedback ?? null,
        },
      });
      logger.info(
        `Saved rejected answer for feedback ${params.feedbackId}, user ${params.userId}, nmId: ${params.nmId}`,
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
   * If nmId is provided, also includes rejected answers from goods in the same group.
   */
  async getRecentRejectedAnswers(
    userId: number,
    supplierId: string,
    limit = 40,
    nmId?: number,
  ): Promise<RejectedAnswerContext[]> {
    try {
      let targetNmIds: number[] | undefined;

      if (nmId !== undefined) {
        const related = await feedbackGoodsGroupService.getGroupNmIds(userId, supplierId, nmId);
        targetNmIds = [nmId, ...related];
      }

      const rows = await prisma.feedbackRejectedAnswer.findMany({
        where: {
          userId,
          supplierId,
          ...(targetNmIds ? { nmId: { in: targetNmIds } } : {}),
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
        userFeedback: row.userFeedback,
        nmId: row.nmId,
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
   * Update a rejected answer's userFeedback.
   */
  async updateRejectedAnswer(
    id: string,
    userId: number,
    updates: { userFeedback?: string },
  ): Promise<void> {
    try {
      await prisma.feedbackRejectedAnswer.updateMany({
        where: { id, userId },
        data: {
          ...(updates.userFeedback !== undefined && { userFeedback: updates.userFeedback }),
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
