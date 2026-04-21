/**
 * Feedback Rejected Answer Service
 * Manages rejected AI-generated answers.
 */

import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackRejected');

export interface RejectedAnswerContext {
  feedbackText: string;
  rejectedAnswerText: string;
  aiAnalysis: string | null;
  mistakeCategory: string | null;
  productCategory: string | null;
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
    productCategory?: string | null;
    productName?: string | null;
    aiAnalysis?: string | null;
    mistakeCategory?: string | null;
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
          productCategory: params.productCategory ?? null,
          productName: params.productName ?? null,
        },
      });
      logger.info(
        `Saved rejected answer for feedback ${params.feedbackId}, user ${params.userId}`,
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
   */
  async getRecentRejectedAnswers(
    userId: number,
    supplierId: string,
    limit = 20,
  ): Promise<RejectedAnswerContext[]> {
    try {
      const rows = await prisma.feedbackRejectedAnswer.findMany({
        where: { userId, supplierId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return rows.map((row) => ({
        feedbackText: row.feedbackText,
        rejectedAnswerText: row.rejectedAnswerText,
        aiAnalysis: row.aiAnalysis,
        mistakeCategory: row.mistakeCategory,
        productCategory: row.productCategory,
      }));
    } catch (error) {
      logger.error(
        `Failed to fetch recent rejected answers for user ${userId}:`
        , error,
      );
      return [];
    }
  }
}

export const feedbackRejectedService = new FeedbackRejectedService();
