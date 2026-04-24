/**
 * Feedback Review Service
 * Core business logic for AI-powered feedback answering.
 * Delegates prompt generation, example fetching, and settings to dedicated services.
 */

import { prisma } from '@/config/database';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { feedbackPromptService } from './feedback-prompt.service';
import { feedbackExampleService } from './feedback-example.service';
import { feedbackGoodsGroupService } from './feedback-goods-group.service';
import {
  feedbackRejectedService,
  RejectedAnswerContext,
} from './feedback-rejected.service';

import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackReview');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type { FeedbackItem, FeedbackTemplate } from '@/types/wb';
import type { FeedbackExample } from './feedback-example.service';
import type { FeedbackRule } from '@prisma/client';

export interface ProcessResult {
  processed: number;
  posted: number;
  skipped: number;
  failed: number;
}

/**
 * Check if a feedback rule's conditions match the given feedback.
 * Evaluates minRating, maxRating, and keywords.
 */
function doesRuleApply(
  rule: FeedbackRule,
  valuation: number,
  feedbackTextLower: string,
): boolean {
  if (rule.minRating !== null && rule.minRating !== undefined) {
    if (valuation < rule.minRating) return false;
  }
  if (rule.maxRating !== null && rule.maxRating !== undefined) {
    if (valuation > rule.maxRating) return false;
  }
  if (rule.keywords && rule.keywords.length > 0) {
    const hasKeyword = rule.keywords.some((kw) =>
      feedbackTextLower.includes(kw.toLowerCase()),
    );
    if (!hasKeyword) return false;
  }
  return true;
}

export class FeedbackReviewService {
  /**
   * Process all unanswered feedbacks for a user + supplier
   * Used by both cron job and manual "Answer All" button.
   * When nmIds is provided, only feedbacks for those nmIds are processed.
   */
  async processUnansweredFeedbacks(
    userId: number,
    supplierId: string,
    nmIds?: number[],
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

      let unansweredFeedbacks = [...answeredRaw, ...unansweredRaw].filter(
        (f) => !f.answer,
      );

      if (nmIds && nmIds.length > 0) {
        const nmIdSet = new Set(nmIds);
        unansweredFeedbacks = unansweredFeedbacks.filter(
          (f) =>
            f.productInfo?.wbArticle && nmIdSet.has(f.productInfo.wbArticle),
        );
      }

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

      const allFeedbackRules = await prisma.feedbackRule.findMany({
        where: { userId, supplierId },
      });
      const feedbackRulesMap = new Map<number, FeedbackRule[]>();
      for (const rule of allFeedbackRules) {
        for (const nmId of rule.nmIds) {
          const existing = feedbackRulesMap.get(nmId) || [];
          existing.push(rule);
          feedbackRulesMap.set(nmId, existing);
        }
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

      // Pre-load goods groups for group-aware examples
      const groups = await feedbackGoodsGroupService.getGroups(
        userId,
        supplierId,
      );
      const nmIdToGroupNmIds = new Map<number, number[]>();
      for (const group of groups) {
        for (const nmId of group.nmIds) {
          const related = group.nmIds.filter((id) => id !== nmId);
          nmIdToGroupNmIds.set(nmId, related);
        }
      }

      for (const feedback of unansweredFeedbacks) {
        try {
          const nmId = feedback.productInfo?.wbArticle;
          const rejectedAnswers = nmId
            ? await feedbackRejectedService.getRecentRejectedAnswers(
                userId,
                supplierId,
                40,
                nmId,
              )
            : [];

          // Fetch group-specific posted examples if this nmId belongs to a group
          let groupExamples: FeedbackExample[] = [];
          if (nmId && nmIdToGroupNmIds.has(nmId)) {
            groupExamples =
              await feedbackExampleService.getRecentPostedAnswersForGroup(
                userId,
                supplierId,
                nmId,
                10,
                feedback.valuation,
              );
          }

          const processResult = await this.processSingleFeedback(
            userId,
            supplierId,
            feedback,
            templates,
            globalSettings,
            productSettingsMap,
            feedbackRulesMap,
            existingAutoAnswerMap,
            examplesByValuation,
            rejectedAnswers,
            groupExamples,
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
   * Process unanswered feedbacks MANUALLY — bypasses all settings checks.
   * Used by the "Answer All" button in the UI. Always generates and posts answers.
   */
  async processUnansweredFeedbacksManual(
    userId: number,
    supplierId: string,
    nmIds?: number[],
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      posted: 0,
      skipped: 0,
      failed: 0,
    };

    try {
      const [answeredRaw, unansweredRaw] = await Promise.all([
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: true }),
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: false }),
      ]);

      let unansweredFeedbacks = [...answeredRaw, ...unansweredRaw].filter(
        (f) => !f.answer,
      );

      if (nmIds && nmIds.length > 0) {
        const nmIdSet = new Set(nmIds);
        unansweredFeedbacks = unansweredFeedbacks.filter(
          (f) =>
            f.productInfo?.wbArticle && nmIdSet.has(f.productInfo.wbArticle),
        );
      }

      if (unansweredFeedbacks.length === 0) {
        logger.info(
          `No unanswered feedbacks for user ${userId}, supplier ${supplierId}`,
        );
        return result;
      }

      logger.info(
        `Manual processing ${unansweredFeedbacks.length} unanswered feedbacks for user ${userId}, supplier ${supplierId}`,
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

      const allFeedbackRules = await prisma.feedbackRule.findMany({
        where: { userId, supplierId },
      });
      const feedbackRulesMap = new Map<number, FeedbackRule[]>();
      for (const rule of allFeedbackRules) {
        for (const nmId of rule.nmIds) {
          const existing = feedbackRulesMap.get(nmId) || [];
          existing.push(rule);
          feedbackRulesMap.set(nmId, existing);
        }
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

      // Pre-load goods groups for group-aware examples
      const groups = await feedbackGoodsGroupService.getGroups(
        userId,
        supplierId,
      );
      const nmIdToGroupNmIds = new Map<number, number[]>();
      for (const group of groups) {
        for (const nmId of group.nmIds) {
          const related = group.nmIds.filter((id) => id !== nmId);
          nmIdToGroupNmIds.set(nmId, related);
        }
      }

      // Pre-fetch rejected answers for all unique nmIds
      const uniqueNmIds = [
        ...new Set(
          unansweredFeedbacks
            .map((f) => f.productInfo?.wbArticle)
            .filter((n): n is number => n !== undefined),
        ),
      ];
      const rejectedAnswersByNmId = new Map<number, RejectedAnswerContext[]>();
      for (const nmId of uniqueNmIds) {
        const rejected = await feedbackRejectedService.getRecentRejectedAnswers(
          userId,
          supplierId,
          40,
          nmId,
        );
        rejectedAnswersByNmId.set(nmId, rejected);
      }

      // Phase 1: Generate all answers in parallel
      type GeneratedItem = {
        feedback: FeedbackItem;
        answerText: string;
        nmId: number;
      };

      const generationTasks = unansweredFeedbacks.map(async (feedback) => {
        try {
          const nmId = feedback.productInfo?.wbArticle;
          if (!nmId) {
            logger.warn(`Feedback ${feedback.id} has no nmId, skipping`);
            return null;
          }

          const existing = existingAutoAnswerMap.get(feedback.id);
          if (existing && existing.status === 'POSTED') {
            return null;
          }

          // Rule checks
          const rules = feedbackRulesMap.get(nmId);
          const enabledRules = rules?.filter((r) => r.enabled) || [];
          const feedbackTextLower = (
            feedback.feedbackInfo?.feedbackText || ''
          ).toLowerCase();

          for (const rule of enabledRules) {
            const ruleApplies = doesRuleApply(
              rule,
              feedback.valuation,
              feedbackTextLower,
            );
            if (ruleApplies && rule.mode !== 'instruction') {
              logger.debug(
                `Feedback ${feedback.id} matches skip rule ${rule.id}, skipping generation`,
              );
              return null;
            }
          }

          const rejectedAnswers = rejectedAnswersByNmId.get(nmId) || [];

          let groupExamples: FeedbackExample[] = [];
          if (nmIdToGroupNmIds.has(nmId)) {
            groupExamples =
              await feedbackExampleService.getRecentPostedAnswersForGroup(
                userId,
                supplierId,
                nmId,
                10,
                feedback.valuation,
              );
          }

          const recentAnswers = examplesByValuation.get(feedback.valuation) || [];
          const matchingInstructionRules = enabledRules.filter(
            (r) => doesRuleApply(r, feedback.valuation, feedbackTextLower) && r.mode === 'instruction',
          );

          const answerText = await feedbackPromptService.generateAnswer(
            feedback,
            recentAnswers,
            templates,
            rejectedAnswers,
            matchingInstructionRules,
            groupExamples,
          );

          if (!answerText) {
            logger.warn(`Empty AI answer for feedback ${feedback.id}`);
            return null;
          }

          // Save as PENDING
          const originalFeedbackText = feedback.feedbackInfo?.feedbackText || '';
          const feedbackTextPros = feedback.feedbackInfo?.feedbackTextPros || null;
          const feedbackTextCons = feedback.feedbackInfo?.feedbackTextCons || null;
          const trustFactor = feedback.trustFactor || 'buyout';
          const productInfo = feedback.productInfo;
          const feedbackInfo = feedback.feedbackInfo;

          await prisma.feedbackAutoAnswer.upsert({
            where: {
              userId_supplierId_feedbackId: {
                userId,
                supplierId,
                feedbackId: feedback.id,
              },
            },
            update: {
              feedbackText: originalFeedbackText,
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
              feedbackText: originalFeedbackText,
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

          return { feedback, answerText, nmId };
        } catch (error) {
          logger.error(
            `Failed to generate answer for feedback ${feedback.id}:`
            , error,
          );
          return null;
        }
      });

      const generatedResults = await Promise.all(generationTasks);
      const generatedItems = generatedResults.filter(
        (item): item is GeneratedItem => item !== null,
      );

      result.processed = generatedItems.length;
      const skippedCount = unansweredFeedbacks.length - generatedItems.length;
      result.skipped = skippedCount;

      logger.info(
        `Generated ${generatedItems.length} answers, skipped ${skippedCount} for user ${userId}, supplier ${supplierId}`,
      );

      // Phase 2: Post all answers sequentially
      for (let i = 0; i < generatedItems.length; i++) {
        const item = generatedItems[i];
        try {
          await wbFeedbackService.answerFeedback({
            userId,
            feedbackId: item.feedback.id,
            nmId: item.nmId,
            answerText: item.answerText,
          });

          logger.info(
            `Posted answer for feedback ${item.feedback.id} (user ${userId}, nmId ${item.nmId}): "${item.answerText}"`,
          );

          await prisma.feedbackAutoAnswer.update({
            where: {
              userId_supplierId_feedbackId: {
                userId,
                supplierId,
                feedbackId: item.feedback.id,
              },
            },
            data: { status: 'POSTED', postedAt: new Date() },
          });

          result.posted++;
        } catch (error) {
          result.failed++;
          logger.error(
            `Failed to post answer for feedback ${item.feedback.id}:`
            , error,
          );
        }
        // Small delay between posts to reduce rate-limiting pressure
        if (i < generatedItems.length - 1) {
          await sleep(2000);
        }
      }

      logger.info(
        `Completed manual processing for user ${userId}, supplier ${supplierId}:`,
        result,
      );

      return result;
    } catch (error) {
      logger.error(
        `Error manual processing unanswered feedbacks for user ${userId}, supplier ${supplierId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Post all pending AI-generated answers to WB API one by one.
   * Returns counts of posted and failed items.
   */
  async postPendingAnswers(
    userId: number,
    supplierId: string,
  ): Promise<{ posted: number; failed: number }> {
    const pending = await prisma.feedbackAutoAnswer.findMany({
      where: { userId, supplierId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    logger.info(
      `Posting ${pending.length} pending answers for user ${userId}, supplier ${supplierId}`,
    );

    let posted = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      try {
        await wbFeedbackService.answerFeedback({
          userId,
          feedbackId: item.feedbackId,
          nmId: item.nmId,
          answerText: item.answerText,
        });

        await prisma.feedbackAutoAnswer.update({
          where: {
            userId_supplierId_feedbackId: {
              userId,
              supplierId,
              feedbackId: item.feedbackId,
            },
          },
          data: { status: 'POSTED', postedAt: new Date() },
        });

        posted++;
        logger.info(`Posted pending answer for feedback ${item.feedbackId}`);
      } catch (error) {
        failed++;
        logger.error(`Failed to post pending answer for feedback ${item.feedbackId}:`, error);
      }

      if (i < pending.length - 1) {
        await sleep(2000);
      }
    }

    logger.info(
      `Completed posting pending answers for user ${userId}, supplier ${supplierId}: posted=${posted}, failed=${failed}`,
    );

    return { posted, failed };
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
    feedbackRulesMap: Map<number, FeedbackRule[]>,
    existingAutoAnswerMap: Map<string, { status: string }>,
    examplesByValuation: Map<number, FeedbackExample[]>,
    rejectedAnswers: RejectedAnswerContext[] = [],
    groupExamples: FeedbackExample[] = [],
    forcePost = false,
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

    // 3. Product setting check (skip when forcePost = true)
    if (!forcePost) {
      const productEnabled = productSettingsMap.get(nmId) ?? true;
      if (!productEnabled) {
        logger.debug(
          `Product ${nmId} auto-answer disabled for user ${userId}, supplier ${supplierId}`,
        );
        return 'skipped';
      }
    }

    // 5-7. Feedback rule checks
    // Each rule is evaluated independently. A rule causes a skip only when
    // ALL of its specified conditions match simultaneously.
    const rules = feedbackRulesMap.get(nmId);
    const enabledRules = rules?.filter((r) => r.enabled) || [];
    const feedbackTextLower = (
      feedback.feedbackInfo?.feedbackText || ''
    ).toLowerCase();
    const matchingInstructionRules: FeedbackRule[] = [];

    for (const rule of enabledRules) {
      const ruleApplies = doesRuleApply(
        rule,
        feedback.valuation,
        feedbackTextLower,
      );

      if (ruleApplies && rule.mode === 'instruction') {
        // Instruction rule: don't skip, collect for prompt only if matching
        matchingInstructionRules.push(rule);
        continue;
      }

      if (ruleApplies) {
        logger.debug(
          `Feedback ${feedback.id} matches skip rule ${rule.id} (rating ${feedback.valuation}, keywords: [${rule.keywords.join(', ')}]), skipping`,
        );
        return 'skipped';
      }
    }

    const originalFeedbackText = feedback.feedbackInfo?.feedbackText || '';
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
      matchingInstructionRules,
      groupExamples,
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
        feedbackText: originalFeedbackText,
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
        feedbackText: originalFeedbackText,
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

    // 10. Auto-post only if global+product enabled, or forcePost = true
    const autoPostEnabled = productSettingsMap.get(nmId) ?? true;
    if (forcePost || (settings.autoAnswerEnabled && autoPostEnabled)) {
      try {
        await wbFeedbackService.answerFeedback({
          userId,
          feedbackId: feedback.id,
          nmId,
          answerText,
        });

        logger.info(
          `Posted answer for feedback ${feedback.id} (user ${userId}, nmId ${nmId}): "${answerText}"`,
        );

        await prisma.feedbackAutoAnswer.update({
          where: {
            userId_supplierId_feedbackId: {
              userId,
              supplierId,
              feedbackId: feedback.id,
            },
          },
          data: { status: 'POSTED', postedAt: new Date() },
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

    const groupExamples =
      await feedbackExampleService.getRecentPostedAnswersForGroup(
        userId,
        supplierId,
        nmId,
        10,
        feedback.valuation,
      );

    const rejectedAnswers =
      await feedbackRejectedService.getRecentRejectedAnswers(
        userId,
        supplierId,
        40,
        nmId,
      );

    const feedbackRules = await prisma.feedbackRule.findMany({
      where: {
        userId,
        supplierId,
        nmIds: { has: nmId },
        enabled: true,
      },
    });

    // Evaluate skip rules for manual generation too
    const lowerFeedbackText = (
      feedback.feedbackInfo?.feedbackText || ''
    ).toLowerCase();
    const matchingInstructionRules: FeedbackRule[] = [];

    for (const rule of feedbackRules) {
      const ruleApplies = doesRuleApply(
        rule,
        feedback.valuation,
        lowerFeedbackText,
      );

      if (ruleApplies && rule.mode === 'instruction') {
        // Instruction rule: don't skip, collect for prompt only if matching
        matchingInstructionRules.push(rule);
        continue;
      }

      if (ruleApplies) {
        throw new Error(
          `Feedback matches skip rule: cannot generate answer for this review`,
        );
      }
    }

    const answerText = await feedbackPromptService.generateAnswer(
      feedback,
      recentAnswers,
      templates,
      rejectedAnswers,
      matchingInstructionRules,
      groupExamples,
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

    logger.info(
      `Posted answer for feedback ${feedbackId} (user ${userId}, nmId ${autoAnswer.nmId}): "${autoAnswer.answerText}"`,
    );

    await prisma.feedbackAutoAnswer.update({
      where: {
        userId_supplierId_feedbackId: {
          userId,
          supplierId,
          feedbackId,
        },
      },
      data: { status: 'POSTED', postedAt: new Date() },
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
