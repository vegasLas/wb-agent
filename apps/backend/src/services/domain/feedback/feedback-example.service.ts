/**
 * Feedback Example Service
 * Fetches and caches example answered feedbacks for AI context.
 * Provides two strategies:
 *   1. By valuation (for batch processing)
 *   2. By nmId + valuation (for single feedback generation)
 */

import { prisma } from '@/config/database';
import {
  wbFeedbackOfficialService,
  resolveOfficialSupplierId,
} from '@/services/external/wb/official';
import { feedbackGoodsGroupService } from './feedback-goods-group.service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackExample');

export interface FeedbackExample {
  feedbackText: string;
  answerText: string;
  valuation: number;
  feedbackTextPros?: string | null;
  feedbackTextCons?: string | null;
}

export interface FeedbackExampleWithId extends FeedbackExample {
  feedbackId: string;
}

export class FeedbackExampleService {
  /**
   * Pre-fetch example answers grouped by valuation for batch processing.
   * Queries DB first, then falls back to WB API if fewer than fallbackThreshold examples.
   */
  async fetchExamplesByValuation(
    userId: number,
    supplierId: string,
    valuations: number[],
    limit = 10,
    fallbackThreshold = 3,
  ): Promise<Map<number, FeedbackExample[]>> {
    const result = new Map<number, FeedbackExample[]>();

    for (const valuation of valuations) {
      const dbRows = await prisma.feedbackAutoAnswer.findMany({
        where: {
          userId,
          supplierId,
          status: 'POSTED',
          valuation,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const examples: FeedbackExample[] = dbRows.map((r) => ({
        feedbackText: r.feedbackText,
        answerText: r.answerText,
        valuation: r.valuation,
        feedbackTextPros: r.feedbackTextPros,
        feedbackTextCons: r.feedbackTextCons,
      }));

      if (examples.length < fallbackThreshold) {
        await this.fillFromWbApi(
          userId,
          supplierId,
          valuation,
          examples,
          dbRows.map((r) => r.feedbackId),
          limit,
          fallbackThreshold,
        );
      }

      result.set(valuation, examples.slice(0, limit));
    }

    return result;
  }

  /**
   * Get recent posted answers from our own DB for a specific product (nmId).
   */
  private async getRecentPostedAnswers(
    userId: number,
    supplierId: string,
    nmId: number,
    limit = 10,
    valuation?: number,
  ): Promise<FeedbackExampleWithId[]> {
    try {
      const rows = await prisma.feedbackAutoAnswer.findMany({
        where: {
          userId,
          supplierId,
          nmId,
          status: 'POSTED',
          ...(valuation !== undefined ? { valuation } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return rows.map((r) => ({
        feedbackId: r.feedbackId,
        feedbackText: r.feedbackText,
        answerText: r.answerText,
        valuation: r.valuation,
        feedbackTextPros: r.feedbackTextPros,
        feedbackTextCons: r.feedbackTextCons,
      }));
    } catch (error) {
      logger.error(`Error fetching posted answers for nmId ${nmId}:`, error);
      return [];
    }
  }

  /**
   * Get recent posted answers for a product AND all products in the same group.
   * Falls back to WB API if DB results are below threshold.
   */
  async getRecentPostedAnswersForGroup(
    userId: number,
    supplierId: string,
    nmId: number,
    limit = 10,
    valuation?: number,
  ): Promise<FeedbackExample[]> {
    try {
      const related = await feedbackGoodsGroupService.getGroupNmIds(
        userId,
        supplierId,
        nmId,
      );
      const targetNmIds = [nmId, ...related];

      const rows = await prisma.feedbackAutoAnswer.findMany({
        where: {
          userId,
          supplierId,
          nmId: { in: targetNmIds },
          status: 'POSTED',
          ...(valuation !== undefined ? { valuation } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const examples: FeedbackExample[] = rows.map((r) => ({
        feedbackText: r.feedbackText,
        answerText: r.answerText,
        valuation: r.valuation,
        feedbackTextPros: r.feedbackTextPros,
        feedbackTextCons: r.feedbackTextCons,
      }));

      if (examples.length < 3) {
        logger.info(
          `Group DB examples insufficient for nmId ${nmId} valuation=${valuation ?? 'any'} (${examples.length} < 3), trying WB API`,
        );
        // Try WB API for the primary nmId as fallback
        try {
          const wbAnswers = await this.fetchWbAnswersByNmId(
            userId,
            nmId,
            3,
            valuation,
          );
          const seenTexts = new Set(examples.map((e) => e.feedbackText));
          for (const wb of wbAnswers) {
            if (seenTexts.has(wb.feedbackText)) continue;
            examples.push({
              feedbackText: wb.feedbackText,
              answerText: wb.answerText,
              valuation: wb.valuation,
              feedbackTextPros: wb.feedbackTextPros,
              feedbackTextCons: wb.feedbackTextCons,
            });
            if (examples.length >= limit) break;
          }
        } catch (err) {
          logger.warn(`WB API fallback failed for nmId ${nmId}:`, err);
        }
      }

      return examples.slice(0, limit);
    } catch (error) {
      logger.error(
        `Error fetching group posted answers for nmId ${nmId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get recent answers with fallback to WB API when our own cache is insufficient.
   * Used for single-feedback generation.
   */
  async getRecentAnswersWithFallback(
    userId: number,
    supplierId: string,
    nmId: number,
    limit = 10,
    fallbackThreshold = 3,
    targetValuation?: number,
  ): Promise<FeedbackExample[]> {
    const postedAnswers = await this.getRecentPostedAnswers(
      userId,
      supplierId,
      nmId,
      limit,
      targetValuation,
    );

    if (postedAnswers.length >= fallbackThreshold) {
      return postedAnswers.map((a) => ({
        feedbackText: a.feedbackText,
        answerText: a.answerText,
        valuation: a.valuation,
        feedbackTextPros: a.feedbackTextPros,
        feedbackTextCons: a.feedbackTextCons,
      }));
    }

    logger.info(
      `Posted answers insufficient for nmId ${nmId} valuation=${targetValuation ?? 'any'} (${postedAnswers.length} < ${fallbackThreshold}), fetching from WB API`,
    );

    try {
      const wbAnswers = await this.fetchWbAnswersByNmId(
        userId,
        nmId,
        fallbackThreshold,
        targetValuation,
      );

      const seenIds = new Set(postedAnswers.map((a) => a.feedbackId));
      const merged: FeedbackExample[] = postedAnswers.map((a) => ({
        feedbackText: a.feedbackText,
        answerText: a.answerText,
        valuation: a.valuation,
        feedbackTextPros: a.feedbackTextPros,
        feedbackTextCons: a.feedbackTextCons,
      }));

      for (const wb of wbAnswers) {
        if (seenIds.has(wb.feedbackId)) continue;
        merged.push({
          feedbackText: wb.feedbackText,
          answerText: wb.answerText,
          valuation: wb.valuation,
          feedbackTextPros: wb.feedbackTextPros,
          feedbackTextCons: wb.feedbackTextCons,
        });
        if (merged.length >= limit) break;
      }

      return merged;
    } catch (error) {
      logger.warn(
        `Fallback WB API fetch failed for nmId ${nmId} valuation=${targetValuation ?? 'any'}, using posted answers only:`,
        error,
      );
      return postedAnswers.map((a) => ({
        feedbackText: a.feedbackText,
        answerText: a.answerText,
        valuation: a.valuation,
        feedbackTextPros: a.feedbackTextPros,
        feedbackTextCons: a.feedbackTextCons,
      }));
    }
  }

  /**
   * Fetch answered feedbacks from WB API by nmId, stopping early when enough are found.
   */
  private async fetchWbAnswersByNmId(
    userId: number,
    nmId: number,
    targetCount: number,
    targetValuation?: number,
  ): Promise<FeedbackExampleWithId[]> {
    const officialSupplierId = await resolveOfficialSupplierId(
      userId,
      'QUESTIONS_AND_REVIEWS',
    );
    if (!officialSupplierId) {
      return [];
    }

    const wbAnswers: FeedbackExampleWithId[] = [];
    let offset = 0;
    let hasMore = true;
    let pagesFetched = 0;
    const maxPages = 3;

    while (
      hasMore &&
      wbAnswers.length < targetCount &&
      pagesFetched < maxPages
    ) {
      const res = await wbFeedbackOfficialService.getFeedbacks({
        supplierId: officialSupplierId,
        isAnswered: true,
        limit: 100,
        offset,
      });

      pagesFetched++;

      const feedbacks = res.data.feedbacks || [];
      if (feedbacks.length > 0) {
        for (const f of feedbacks) {
          if (!f.answer) continue;
          if (f.productInfo?.wbArticle !== nmId) continue;
          if (
            targetValuation !== undefined &&
            f.valuation !== targetValuation
          ) {
            continue;
          }
          wbAnswers.push({
            feedbackId: f.id,
            feedbackText: f.feedbackInfo?.feedbackText || '',
            answerText: f.answer?.answerText || '',
            valuation: f.valuation,
            feedbackTextPros: f.feedbackInfo?.feedbackTextPros || null,
            feedbackTextCons: f.feedbackInfo?.feedbackTextCons || null,
          });
          if (wbAnswers.length >= targetCount) break;
        }
      }

      hasMore = feedbacks.length === 100 && res.data.pages?.next !== '';
      offset += 100;
    }

    logger.info(
      `Fetched ${wbAnswers.length} answered feedbacks for nmId ${nmId} valuation=${targetValuation ?? 'any'} from WB API (${pagesFetched} page(s))`,
    );

    return wbAnswers;
  }

  /**
   * Supplement DB examples with WB API data when below threshold.
   */
  private async fillFromWbApi(
    userId: number,
    _supplierId: string,
    valuation: number,
    examples: FeedbackExample[],
    dbFeedbackIds: string[],
    limit: number,
    fallbackThreshold: number,
  ): Promise<void> {
    const officialSupplierId = await resolveOfficialSupplierId(
      userId,
      'QUESTIONS_AND_REVIEWS',
    );
    if (!officialSupplierId) {
      return;
    }

    logger.info(
      `DB examples insufficient for valuation ${valuation} (${examples.length} < ${fallbackThreshold}), fetching from WB API`,
    );

    try {
      const wbAnswers: FeedbackExampleWithId[] = [];
      let offset = 0;
      let hasMore = true;
      let pagesFetched = 0;
      const maxPages = 3;

      while (
        hasMore &&
        wbAnswers.length < fallbackThreshold &&
        pagesFetched < maxPages
      ) {
        const res = await wbFeedbackOfficialService.getFeedbacks({
          supplierId: officialSupplierId,
          isAnswered: true,
          limit: 100,
          offset,
        });

        pagesFetched++;

        const feedbacks = res.data.feedbacks || [];
        if (feedbacks.length > 0) {
          for (const f of feedbacks) {
            if (!f.answer) continue;
            if (f.valuation !== valuation) continue;
            wbAnswers.push({
              feedbackId: f.id,
              feedbackText: f.feedbackInfo?.feedbackText || '',
              answerText: f.answer?.answerText || '',
              valuation: f.valuation,
              feedbackTextPros: f.feedbackInfo?.feedbackTextPros || null,
              feedbackTextCons: f.feedbackInfo?.feedbackTextCons || null,
            });
            if (wbAnswers.length >= fallbackThreshold) break;
          }
        }

        hasMore = feedbacks.length === 100 && res.data.pages?.next !== '';
        offset += 100;
      }

      logger.info(
        `Fetched ${wbAnswers.length} answered feedbacks for valuation ${valuation} from WB API (${pagesFetched} page(s))`,
      );

      const seenIds = new Set(dbFeedbackIds);
      for (const wb of wbAnswers) {
        if (seenIds.has(wb.feedbackId)) continue;
        examples.push({
          feedbackText: wb.feedbackText,
          answerText: wb.answerText,
          valuation: wb.valuation,
          feedbackTextPros: wb.feedbackTextPros,
          feedbackTextCons: wb.feedbackTextCons,
        });
        if (examples.length >= limit) break;
      }
    } catch (error) {
      logger.warn(
        `Fallback WB API fetch failed for valuation ${valuation}, using DB only:`,
        error,
      );
    }
  }
}

export const feedbackExampleService = new FeedbackExampleService();
