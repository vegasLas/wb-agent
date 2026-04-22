/**
 * Feedback Review Service
 * Core business logic for AI-powered feedback answering.
 * Delegates prompt generation, example fetching, and settings to dedicated services.
 */

import { prisma } from '@/config/database';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { feedbackPromptService } from './feedback-prompt.service';
import { feedbackExampleService } from './feedback-example.service';
import { feedbackRejectedService } from './feedback-rejected.service';

import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackReview');

import type { FeedbackItem, FeedbackTemplate } from '@/types/wb';
import type { FeedbackExample } from './feedback-example.service';
import type { FeedbackProductRule } from '@prisma/client';

export interface ProcessResult {
  processed: number;
  posted: number;
  skipped: number;
  failed: number;
}

export class FeedbackReviewService {
  /**
   * Count total unanswered feedbacks by fetching all pages
   */
  async countUnansweredFeedbacks(userId: number): Promise<number> {
    try {
      const [answeredRaw, unansweredRaw] = await Promise.all([
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: true }),
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: false }),
      ]);
      // Merge: answered overwrites unanswered to avoid stale data from WB API
      const merged = new Map<string, typeof answeredRaw[0]>();
      for (const f of unansweredRaw) merged.set(f.id, f);
      for (const f of answeredRaw) merged.set(f.id, f);
      return Array.from(merged.values()).filter((f) => !f.answer).length;
    } catch (error) {
      logger.error(
        `Error counting unanswered feedbacks for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process all unanswered feedbacks for a user + supplier
   * Used by both cron job and manual "Answer All" button
   */
  async processUnansweredFeedbacks(
    userId: number,
    supplierId: string,
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      posted: 0,
      skipped: 0,
      failed: 0,
    };

    const globalSettings = await prisma.feedbackSettings.findUnique({
      where: {
        userId_supplierId: {
          userId,
          supplierId,
        },
      },
    });
    if (!globalSettings?.autoAnswerEnabled) {
      logger.info(
        `Auto-answer disabled for user ${userId}, supplier ${supplierId}, skipping`,
      );
      return result;
    }

    try {
      const [answeredRaw, unansweredRaw] = await Promise.all([
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: true }),
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: false }),
      ]);

      const unansweredFeedbacks = [...answeredRaw, ...unansweredRaw].filter(
        (f) => !f.answer,
      );

      if (unansweredFeedbacks.length === 0) {
        logger.info(
          `No unanswered feedbacks for user ${userId}, supplier ${supplierId}`,
        );
        return result;
      }

      logger.info(
        `Processing ${unansweredFeedbacks.length} unanswered feedbacks for user ${userId}, supplier ${supplierId}`,
      );

      let templates: FeedbackTemplate[] = [];
      try {
        const templateData = await wbFeedbackService.getFeedbackTemplates({
          userId,
        });
        templates = templateData.templates || [];
      } catch (err) {
        logger.warn(`Failed to fetch templates for user ${userId}:`, err);
      }

      const allProductSettings = await prisma.feedbackProductSetting.findMany({
        where: { userId, supplierId },
      });
      const productSettingsMap = new Map<number, boolean>();
      for (const ps of allProductSettings) {
        productSettingsMap.set(ps.nmId, ps.autoAnswerEnabled);
      }

      const allProductRules = await prisma.feedbackProductRule.findMany({
        where: { userId, supplierId },
      });
      const productRulesMap = new Map<number, FeedbackProductRule>();
      for (const pr of allProductRules) {
        productRulesMap.set(pr.nmId, pr);
      }

      const feedbackIds = unansweredFeedbacks.map((f) => f.id);
      const existingAutoAnswers = await prisma.feedbackAutoAnswer.findMany({
        where: {
          userId,
          supplierId,
          feedbackId: { in: feedbackIds },
        },
      });

      const existingAutoAnswerMap = new Map<
        string,
        (typeof existingAutoAnswers)[0]
      >();
      for (const row of existingAutoAnswers) {
        existingAutoAnswerMap.set(row.feedbackId, row);
      }

      const uniqueValuations = [
        ...new Set(
          unansweredFeedbacks
            .map((f) => f.valuation)
            .filter((v) => v !== undefined),
        ),
      ];
      const examplesByValuation =
        await feedbackExampleService.fetchExamplesByValuation(
          userId,
          supplierId,
          uniqueValuations,
          10,
          3,
        );

      for (const feedback of unansweredFeedbacks) {
        try {
          const nmId = feedback.productInfo?.wbArticle;
          const rejectedAnswers = nmId
            ? await feedbackRejectedService.getRecentRejectedAnswers(
                userId,
                supplierId,
                30,
                nmId,
              )
            : [];

          const processResult = await this.processSingleFeedback(
            userId,
            supplierId,
            feedback,
            templates,
            globalSettings,
            productSettingsMap,
            productRulesMap,
            existingAutoAnswerMap,
            examplesByValuation,
            rejectedAnswers,
          );

          result.processed++;
          if (processResult === 'posted') result.posted++;
          else if (processResult === 'skipped') result.skipped++;
        } catch (error) {
          result.failed++;
          logger.error(
            `Failed to process feedback ${feedback.id} for user ${userId}, supplier ${supplierId}:`,
            error,
          );
        }
      }

      logger.info(
        `Completed processing for user ${userId}, supplier ${supplierId}:`,
        result,
      );

      return result;
    } catch (error) {
      logger.error(
        `Error processing unanswered feedbacks for user ${userId}, supplier ${supplierId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process a single feedback
   * Returns: 'posted' | 'skipped' | 'pending'
   */
  private async processSingleFeedback(
    userId: number,
    supplierId: string,
    feedback: FeedbackItem,
    templates: FeedbackTemplate[],
    settings: { autoAnswerEnabled: boolean },
    productSettingsMap: Map<number, boolean>,
    productRulesMap: Map<number, FeedbackProductRule>,
    existingAutoAnswerMap: Map<string, { status: string }>,
    examplesByValuation: Map<number, FeedbackExample[]>,
    rejectedAnswers: import('./feedback-rejected.service').RejectedAnswerContext[] = [],
  ): Promise<'posted' | 'skipped' | 'pending'> {
    const nmId = feedback.productInfo?.wbArticle;
    if (!nmId) {
      logger.warn(`Feedback ${feedback.id} has no nmId, skipping`);
      return 'skipped';
    }

    const existing = existingAutoAnswerMap.get(feedback.id);
    if (existing && existing.status === 'POSTED') {
      return 'skipped';
    }

    // 1. Global settings already checked in caller
    // 2. Extract nmId

    // 3. Product setting check
    const productEnabled = productSettingsMap.get(nmId) ?? true;
    if (!productEnabled) {
      logger.debug(
        `Product ${nmId} auto-answer disabled for user ${userId}, supplier ${supplierId}`,
      );
      return 'skipped';
    }

    // 5-7. Product rule checks
    const rule = productRulesMap.get(nmId);
    if (rule) {
      if (!rule.enabled) {
        logger.debug(
          `Product ${nmId} rule disabled for user ${userId}, supplier ${supplierId}`,
        );
        return 'skipped';
      }

      if (rule.minRating !== null && rule.minRating !== undefined) {
        if (feedback.valuation < rule.minRating) {
          logger.debug(
            `Feedback ${feedback.id} rating ${feedback.valuation} < minRating ${rule.minRating}, skipping`,
          );
          return 'skipped';
        }
      }

      if (rule.maxRating !== null && rule.maxRating !== undefined) {
        if (feedback.valuation > rule.maxRating) {
          logger.debug(
            `Feedback ${feedback.id} rating ${feedback.valuation} > maxRating ${rule.maxRating}, skipping`,
          );
          return 'skipped';
        }
      }

      if (rule.excludeKeywords && rule.excludeKeywords.length > 0) {
        const text = (feedback.feedbackInfo?.feedbackText || '').toLowerCase();
        const matchedKeyword = rule.excludeKeywords.find((kw) =>
          text.includes(kw.toLowerCase()),
        );
        if (matchedKeyword) {
          logger.debug(
            `Feedback ${feedback.id} contains excluded keyword "${matchedKeyword}", skipping`,
          );
          return 'skipped';
        }
      }
    }

    const feedbackText = feedback.feedbackInfo?.feedbackText || '';
    const feedbackTextPros = feedback.feedbackInfo?.feedbackTextPros || null;
    const feedbackTextCons = feedback.feedbackInfo?.feedbackTextCons || null;
    const trustFactor = feedback.trustFactor || 'buyout';

    const productInfo = feedback.productInfo;
    const feedbackInfo = feedback.feedbackInfo;

    const recentAnswers = examplesByValuation.get(feedback.valuation) || [];

    const answerText = await feedbackPromptService.generateAnswer(
      feedback,
      recentAnswers,
      templates,
      rejectedAnswers,
      rule,
    );

    if (!answerText) {
      logger.warn(`Empty AI answer for feedback ${feedback.id}`);
      return 'skipped';
    }

    await prisma.feedbackAutoAnswer.upsert({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId: feedback.id,
        },
      },
      update: {
        feedbackText,
        answerText,
        valuation: feedback.valuation,
        status: 'PENDING',
        trustFactor,
        feedbackTextCons,
        feedbackTextPros,
        productName: productInfo?.name || null,
        productBrand: productInfo?.brand || null,
        supplierArticle: productInfo?.supplierArticle || null,
        userName: feedbackInfo?.userName || null,
        purchaseDate: feedbackInfo?.purchaseDate || null,
        feedbackDate: feedback.createdDate || null,
        photos: feedbackInfo?.photos || null,
        video: feedbackInfo?.video || null,
      },
      create: {
        userId,
        supplierId,
        feedbackId: feedback.id,
        nmId,
        feedbackText,
        answerText,
        valuation: feedback.valuation,
        status: 'PENDING',
        trustFactor,
        feedbackTextCons,
        feedbackTextPros,
        productName: productInfo?.name || null,
        productBrand: productInfo?.brand || null,
        supplierArticle: productInfo?.supplierArticle || null,
        userName: feedbackInfo?.userName || null,
        purchaseDate: feedbackInfo?.purchaseDate || null,
        feedbackDate: feedback.createdDate || null,
        photos: feedbackInfo?.photos || null,
        video: feedbackInfo?.video || null,
      },
    });

    // 10. Auto-post only if global+product enabled AND rule.requireApproval is false
    const autoPostEnabled = productSettingsMap.get(nmId) ?? true;
    const ruleRequiresApproval = rule?.requireApproval ?? false;
    if (settings.autoAnswerEnabled && autoPostEnabled && !ruleRequiresApproval) {
      try {
        await wbFeedbackService.answerFeedback({
          userId,
          feedbackId: feedback.id,
          nmId,
          answerText,
        });

        await prisma.feedbackAutoAnswer.update({
          where: {
            userId_supplierId_feedbackId: {
              userId,
              supplierId,
              feedbackId: feedback.id,
            },
          },
          data: { status: 'POSTED' },
        });

        return 'posted';
      } catch (error) {
        logger.error(`Auto-post failed for feedback ${feedback.id}:`, error);
      }
    }

    return 'pending';
  }

  /**
   * Manually generate answer for a single feedback
   * Receives feedback data directly from frontend to avoid WB API lookup
   */
  async generateAnswerForFeedback(
    userId: number,
    supplierId: string,
    feedbackId: string,
    feedback: FeedbackItem,
  ): Promise<string> {
    const nmId = feedback.productInfo?.wbArticle;
    if (!nmId) {
      throw new Error('Feedback has no nmId');
    }

    let templates: FeedbackTemplate[] = [];
    try {
      const templateData = await wbFeedbackService.getFeedbackTemplates({
        userId,
      });
      templates = templateData.templates || [];
    } catch (err) {
      logger.warn(`Failed to fetch templates for user ${userId}:`, err);
    }

    const feedbackText = feedback.feedbackInfo?.feedbackText || '';
    const feedbackTextPros = feedback.feedbackInfo?.feedbackTextPros || null;
    const feedbackTextCons = feedback.feedbackInfo?.feedbackTextCons || null;
    const trustFactor = feedback.trustFactor || 'buyout';
    const productInfo = feedback.productInfo;
    const feedbackInfo = feedback.feedbackInfo;

    const recentAnswers =
      await feedbackExampleService.getRecentAnswersWithFallback(
        userId,
        supplierId,
        nmId,
        20,
        3,
        feedback.valuation,
      );

    const rejectedAnswers =
      await feedbackRejectedService.getRecentRejectedAnswers(
        userId,
        supplierId,
        20,
        nmId,
      );

    const productRule = await prisma.feedbackProductRule.findUnique({
      where: {
        userId_supplierId_nmId: {
          userId,
          supplierId,
          nmId,
        },
      },
    });

    const answerText = await feedbackPromptService.generateAnswer(
      feedback,
      recentAnswers,
      templates,
      rejectedAnswers,
      productRule,
    );
    await prisma.feedbackAutoAnswer.upsert({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId,
        },
      },
      update: {
        feedbackText,
        answerText,
        valuation: feedback.valuation,
        status: 'PENDING',
        trustFactor,
        feedbackTextCons,
        feedbackTextPros,
        productName: productInfo?.name || null,
        productBrand: productInfo?.brand || null,
        supplierArticle: productInfo?.supplierArticle || null,
        userName: feedbackInfo?.userName || null,
        purchaseDate: feedbackInfo?.purchaseDate || null,
        feedbackDate: feedback.createdDate || null,
        photos: feedbackInfo?.photos || null,
        video: feedbackInfo?.video || null,
      },
      create: {
        userId,
        supplierId,
        feedbackId,
        nmId,
        feedbackText,
        answerText,
        valuation: feedback.valuation,
        status: 'PENDING',
        trustFactor,
        feedbackTextCons,
        feedbackTextPros,
        productName: productInfo?.name || null,
        productBrand: productInfo?.brand || null,
        supplierArticle: productInfo?.supplierArticle || null,
        userName: feedbackInfo?.userName || null,
        purchaseDate: feedbackInfo?.purchaseDate || null,
        feedbackDate: feedback.createdDate || null,
        photos: feedbackInfo?.photos || null,
        video: feedbackInfo?.video || null,
      },
    });

    return answerText;
  }

  /**
   * Regenerate answer for a feedback.
   * Saves the old answer as rejected, analyzes it, then generates a new one.
   */
  async regenerateAnswer(
    userId: number,
    supplierId: string,
    feedbackId: string,
    feedback: FeedbackItem,
    userFeedback?: string,
  ): Promise<string> {
    const nmId = feedback.productInfo?.wbArticle;
    if (!nmId) {
      throw new Error('Feedback has no nmId');
    }

    // Find existing auto-answer to get the old answer text
    const existing = await prisma.feedbackAutoAnswer.findUnique({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId,
        },
      },
    });

    if (existing && existing.answerText) {
      // Save the old answer as rejected
      try {
        await feedbackRejectedService.saveRejectedAnswer({
          userId,
          supplierId,
          feedbackId,
          nmId,
          feedbackText: existing.feedbackText,
          rejectedAnswerText: existing.answerText,
          valuation: existing.valuation,
          productName: existing.productName,
          userFeedback,
        });

        logger.info(`Saved rejected answer for feedback ${feedbackId}`);
      } catch (err) {
        // Don't block regeneration if save fails
        logger.error(
          `Failed to save rejected answer for feedback ${feedbackId}:`,
          err,
        );
      }
    }

    // Generate fresh answer (will include rejected history)
    return this.generateAnswerForFeedback(
      userId,
      supplierId,
      feedbackId,
      feedback,
    );
  }

  /**
   * Find a specific feedback by ID without fetching all pages.
   * Searches recent answered + unanswered pages (up to 3 pages each).
   */
  private async findFeedbackById(
    userId: number,
    feedbackId: string,
  ): Promise<FeedbackItem | undefined> {
    const maxPages = 3;

    for (const isAnswered of [false, true]) {
      let cursor = '';
      let hasMore = true;
      let pagesFetched = 0;

      while (hasMore && pagesFetched < maxPages) {
        const data = await wbFeedbackService.getFeedbacks({
          userId,
          isAnswered,
          limit: 100,
          cursor,
        });

        pagesFetched++;

        const found = data.feedbacks?.find((f) => f.id === feedbackId);
        if (found) return found;

        if (data.pages?.next) {
          cursor = data.pages.next;
        } else {
          hasMore = false;
        }
      }
    }

    return undefined;
  }

  /**
   * Accept a generated answer and post it to WB
   */
  async acceptAnswer(
    userId: number,
    supplierId: string,
    feedbackId: string,
  ): Promise<void> {
    const autoAnswer = await prisma.feedbackAutoAnswer.findUnique({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId,
        },
      },
    });

    if (!autoAnswer) {
      throw new Error('Generated answer not found');
    }

    if (autoAnswer.status === 'POSTED') {
      return;
    }

    await wbFeedbackService.answerFeedback({
      userId,
      feedbackId,
      nmId: autoAnswer.nmId,
      answerText: autoAnswer.answerText,
    });

    await prisma.feedbackAutoAnswer.update({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId,
        },
      },
      data: { status: 'POSTED' },
    });
  }

  /**
   * Reject a generated answer.
   * Saves the rejected answer before marking as rejected.
   */
  async rejectAnswer(
    userId: number,
    supplierId: string,
    feedbackId: string,
    userFeedback?: string,
  ): Promise<void> {
    const autoAnswer = await prisma.feedbackAutoAnswer.findUnique({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId,
        },
      },
    });

    if (autoAnswer && autoAnswer.answerText) {
      try {
        await feedbackRejectedService.saveRejectedAnswer({
          userId,
          supplierId,
          feedbackId,
          nmId: autoAnswer.nmId,
          feedbackText: autoAnswer.feedbackText,
          rejectedAnswerText: autoAnswer.answerText,
          valuation: autoAnswer.valuation,
          productName: autoAnswer.productName,
          userFeedback,
        });

        logger.info(
          `Saved rejected answer on reject for feedback ${feedbackId}`,
        );
      } catch (err) {
        logger.error(
          `Failed to save rejected answer on reject for feedback ${feedbackId}:`,
          err,
        );
      }
    }

    await prisma.feedbackAutoAnswer.update({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId,
        },
      },
      data: { status: 'REJECTED' },
    });
  }
}

export const feedbackReviewService = new FeedbackReviewService();
