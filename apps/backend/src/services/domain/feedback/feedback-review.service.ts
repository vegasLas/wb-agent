/**
 * Feedback Review Service
 * Core business logic for AI-powered feedback answering
 * Scoped per user + supplier (each supplier has different goods/feedbacks)
 */

import { prisma } from '@/config/database';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { createLogger } from '@/utils/logger';
import { deepseek } from '@ai-sdk/deepseek';
import * as aiSdk from 'ai';

const logger = createLogger('FeedbackReview');

import type { FeedbackItem, FeedbackTemplate } from '@/types/wb';

export interface ProcessOptions {
  // reserved for future options
}

export interface ProcessResult {
  processed: number;
  posted: number;
  skipped: number;
  failed: number;
}

export interface FeedbackStatistics {
  today: number;
  week: number;
  allTime: number;
}

/**
 * Resolve supplierId from user's selected account
 */
async function resolveSupplierId(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        include: {
          suppliers: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const account = user.accounts.find((a) => a.id === user.selectedAccountId);
  if (!account) {
    throw new Error('No account selected for user');
  }

  const supplierId =
    account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) {
    throw new Error('No supplier found for account');
  }

  return supplierId;
}

/**
 * Generate WB product image URL from wbArticle
 */
export function generateWbImageUrl(wbArticle: number): string {
  const articleStr = wbArticle.toString();
  const first4 = articleStr.slice(0, 4);
  const first6 = articleStr.slice(0, 6);
  return `https://rst-basket-cdn-06.geobasket.ru/vol${first4}/part${first6}/${wbArticle}/images/tm/1.webp`;
}

export class FeedbackReviewService {
  /**
   * Count total unanswered feedbacks by fetching all pages
   */
  async countUnansweredFeedbacks(userId: number): Promise<number> {
    try {
      const allFeedbacks = await wbFeedbackService.getAllFeedbacks({
        userId,
        isAnswered: false,
      });
      return allFeedbacks.length;
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
    options: ProcessOptions = {},
  ): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      posted: 0,
      skipped: 0,
      failed: 0,
    };

    // Check settings
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
      // Fetch both answered and unanswered feedbacks
      // WB API might return mixed results, so we fetch both and filter client-side
      const [answeredRaw, unansweredRaw] = await Promise.all([
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: true }),
        wbFeedbackService.getAllFeedbacks({ userId, isAnswered: false }),
      ]);

      // Filter unanswered: must have no answer
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

      // Fetch templates once for all feedbacks
      let templates: FeedbackTemplate[] = [];
      try {
        const templateData = await wbFeedbackService.getFeedbackTemplates({
          userId,
        });
        templates = templateData.templates || [];
      } catch (err) {
        logger.warn(`Failed to fetch templates for user ${userId}:`, err);
      }

      // Cache product settings to avoid repeated DB queries
      const allProductSettings = await prisma.feedbackProductSetting.findMany({
        where: { userId, supplierId },
      });
      const productSettingsMap = new Map<number, boolean>();
      for (const ps of allProductSettings) {
        productSettingsMap.set(ps.nmId, ps.autoAnswerEnabled);
      }

      // Batch fetch existing auto-answers to avoid N+1 queries
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

      // Pre-fetch example answers by valuation for all unique ratings
      // This avoids N API calls inside the per-feedback loop
      const uniqueValuations = [
        ...new Set(
          unansweredFeedbacks
            .map((f) => f.valuation)
            .filter((v) => v !== undefined),
        ),
      ];
      const examplesByValuation = await this.fetchExamplesByValuation(
        userId,
        supplierId,
        uniqueValuations,
        20,
        10,
      );

      // Process each feedback
      for (const feedback of unansweredFeedbacks) {
        try {
          const processResult = await this.processSingleFeedback(
            userId,
            supplierId,
            feedback,
            templates,
            globalSettings,
            productSettingsMap,
            existingAutoAnswerMap,
            examplesByValuation,
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
    existingAutoAnswerMap: Map<string, { status: string }>,
    examplesByValuation: Map<
      number,
      Array<{ feedbackText: string; answerText: string; valuation: number; feedbackTextPros?: string | null; feedbackTextCons?: string | null }>
    >,
  ): Promise<'posted' | 'skipped' | 'pending'> {
    const nmId = feedback.productInfo?.wbArticle;
    if (!nmId) {
      logger.warn(`Feedback ${feedback.id} has no nmId, skipping`);
      return 'skipped';
    }

    // Check if already processed using cached map
    const existing = existingAutoAnswerMap.get(feedback.id);
    if (existing && existing.status === 'POSTED') {
      return 'skipped';
    }

    // Check product-level setting from cached map
    const productEnabled = productSettingsMap.get(nmId) ?? true;
    if (!productEnabled) {
      logger.debug(
        `Product ${nmId} auto-answer disabled for user ${userId}, supplier ${supplierId}`,
      );
      return 'skipped';
    }

    const feedbackText = feedback.feedbackInfo?.feedbackText || '';
    const feedbackTextPros = feedback.feedbackInfo?.feedbackTextPros || null;
    const feedbackTextCons = feedback.feedbackInfo?.feedbackTextCons || null;
    const trustFactor = feedback.trustFactor || 'buyout';

    // Use pre-fetched examples with the same valuation (zero API calls)
    const recentAnswers = examplesByValuation.get(feedback.valuation) || [];

    // Generate AI answer
    const answerText = await this.generateAnswerWithAI(
      feedback,
      recentAnswers,
      templates,
    );

    if (!answerText) {
      logger.warn(`Empty AI answer for feedback ${feedback.id}`);
      return 'skipped';
    }

    // Upsert the auto answer record
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
      },
    });

    // Auto-post if enabled
    const autoPostEnabled = productSettingsMap.get(nmId) ?? true;
    if (settings.autoAnswerEnabled && autoPostEnabled) {
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
   * Get recent posted answers from our own DB for a specific product (nmId)
   * Uses FeedbackAutoAnswer table where status = 'POSTED' instead of fetching from WB API
   */
  /**
   * Pre-fetch example answers grouped by valuation for batch processing.
   * Queries DB first, then falls back to WB API if fewer than fallbackThreshold examples.
   */
  private async fetchExamplesByValuation(
    userId: number,
    supplierId: string,
    valuations: number[],
    limit = 20,
    fallbackThreshold = 10,
  ): Promise<
    Map<
      number,
      Array<{ feedbackText: string; answerText: string; valuation: number; feedbackTextPros?: string | null; feedbackTextCons?: string | null }>
    >
  > {
    const result = new Map<
      number,
      Array<{ feedbackText: string; answerText: string; valuation: number; feedbackTextPros?: string | null; feedbackTextCons?: string | null }>
    >();

    for (const valuation of valuations) {
      // Step A: DB first — all posted answers with this valuation for this user+supplier
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

      const examples = dbRows.map((r) => ({
        feedbackText: r.feedbackText,
        answerText: r.answerText,
        valuation: r.valuation,
        feedbackTextPros: r.feedbackTextPros,
        feedbackTextCons: r.feedbackTextCons,
      }));

      // Step B: WB API fallback if insufficient
      if (examples.length < fallbackThreshold) {
        logger.info(
          `DB examples insufficient for valuation ${valuation} (${examples.length} < ${fallbackThreshold}), fetching from WB API`,
        );

        try {
          const wbAnswers: Array<{
            feedbackId: string;
            feedbackText: string;
            answerText: string;
            valuation: number;
            feedbackTextPros?: string | null;
            feedbackTextCons?: string | null;
          }> = [];
          let cursor = '';
          let hasMore = true;
          let pagesFetched = 0;
          const maxPages = 3;

          while (
            hasMore &&
            wbAnswers.length < fallbackThreshold &&
            pagesFetched < maxPages
          ) {
            const data = await wbFeedbackService.getFeedbacks({
              userId,
              isAnswered: true,
              limit: 100,
              cursor,
              valuations: [valuation],
            });

            pagesFetched++;

            if (data.feedbacks && data.feedbacks.length > 0) {
              for (const f of data.feedbacks) {
                if (f.answer) {
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
            }

            if (data.pages?.next) {
              cursor = data.pages.next;
            } else {
              hasMore = false;
            }
          }

          logger.info(
            `Fetched ${wbAnswers.length} answered feedbacks for valuation ${valuation} from WB API (${pagesFetched} page(s))`,
          );

          // Merge: DB first, then WB deduplicated
          const seenIds = new Set(dbRows.map((r) => r.feedbackId));
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

      result.set(valuation, examples.slice(0, limit));
    }

    return result;
  }

  private async getRecentPostedAnswers(
    userId: number,
    supplierId: string,
    nmId: number,
    limit = 20,
    valuation?: number,
  ): Promise<
    Array<{
      feedbackId: string;
      feedbackText: string;
      answerText: string;
      valuation: number;
      feedbackTextPros?: string | null;
      feedbackTextCons?: string | null;
    }>
  > {
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
   * Get recent answers with fallback to WB API when our own cache is insufficient
   * If we have fewer than fallbackThreshold posted answers, fetch from WB API to supplement
   */
  private async getRecentAnswersWithFallback(
    userId: number,
    supplierId: string,
    nmId: number,
    limit = 20,
    postedAnswersByNmId?: Map<
      number,
      Array<{
        feedbackId: string;
        feedbackText: string;
        answerText: string;
        valuation: number;
        feedbackTextPros?: string | null;
        feedbackTextCons?: string | null;
      }>
    >,
    fallbackThreshold = 20,
    targetValuation?: number,
  ): Promise<
    Array<{ feedbackText: string; answerText: string; valuation: number; feedbackTextPros?: string | null; feedbackTextCons?: string | null }>
  > {
    // 1. Get our own posted answers from cache or DB
    const postedAnswers =
      postedAnswersByNmId?.get(nmId) ||
      (await this.getRecentPostedAnswers(
        userId,
        supplierId,
        nmId,
        limit,
        targetValuation,
      ));

    // 2. If enough context, return early (steady state)
    if (postedAnswers.length >= fallbackThreshold) {
      return postedAnswers.map((a) => ({
        feedbackText: a.feedbackText,
        answerText: a.answerText,
        valuation: a.valuation,
        feedbackTextPros: a.feedbackTextPros,
        feedbackTextCons: a.feedbackTextCons,
      }));
    }

    // 3. Not enough — fetch from WB API to supplement (cold start / warm-up)
    // We can search by wbArticle (nmId) via searchText param
    logger.info(
      `Posted answers insufficient for nmId ${nmId} valuation=${targetValuation ?? 'any'} (${postedAnswers.length} < ${fallbackThreshold}), fetching from WB API`,
    );

    try {
      // Fetch page-by-page using cursor, stop early when we have enough ANSWERED feedbacks
      // Note: even with isAnswered=true, some returned feedbacks may not have an answer field
      const wbAnswers: Array<{
        feedbackId: string;
        feedbackText: string;
        answerText: string;
        valuation: number;
        feedbackTextPros?: string | null;
        feedbackTextCons?: string | null;
      }> = [];
      let cursor = '';
      let hasMore = true;
      let pagesFetched = 0;
      const maxPages = 3; // up to 300 feedbacks max

      while (
        hasMore &&
        wbAnswers.length < fallbackThreshold &&
        pagesFetched < maxPages
      ) {
        const data = await wbFeedbackService.getFeedbacks({
          userId,
          isAnswered: true,
          searchText: nmId.toString(),
          limit: 100,
          cursor,
          valuations:
            targetValuation !== undefined ? [targetValuation] : undefined,
        });

        pagesFetched++;

        if (data.feedbacks && data.feedbacks.length > 0) {
          for (const f of data.feedbacks) {
            if (f.answer) {
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
        }

        if (data.pages?.next) {
          cursor = data.pages.next;
        } else {
          hasMore = false;
        }
      }

      logger.info(
        `Fetched ${wbAnswers.length} answered feedbacks for nmId ${nmId} valuation=${targetValuation ?? 'any'} from WB API (${pagesFetched} page(s))`,
      );

      // 4. Merge: posted answers first, then WB answers that aren't duplicates
      const seenIds = new Set(postedAnswers.map((a) => a.feedbackId));
      const merged = postedAnswers.map((a) => ({
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
   * Generate an AI answer for a feedback
   */
  async generateAnswerWithAI(
    feedback: FeedbackItem,
    recentAnswers: Array<{
      feedbackText: string;
      answerText: string;
      valuation: number;
      feedbackTextPros?: string | null;
      feedbackTextCons?: string | null;
    }>,
    templates: FeedbackTemplate[],
  ): Promise<string> {
    const productInfo = feedback.productInfo;
    const feedbackInfo = feedback.feedbackInfo;

    // Build context from recent posted answers
    const recentAnswersContext = recentAnswers
      .map(
        (a) => {
          const pros = a.feedbackTextPros ? ` | Достоинства: "${a.feedbackTextPros}"` : '';
          const cons = a.feedbackTextCons ? ` | Недостатки: "${a.feedbackTextCons}"` : '';
          return `- Отзыв: "${a.feedbackText}"${pros}${cons} | Оценка: ${a.valuation}/5 | Ответ: "${a.answerText}"`;
        },
      )
      .join('\n');

    // Build context from templates
    const templatesContext = templates
      .map((t) => `- ${t.name}: "${t.content}"`)
      .join('\n');

    // Build media context
    const hasPhotos = (feedbackInfo.photos?.length || 0) > 0;
    const hasVideo = !!feedbackInfo.video;
    const mediaContext = [
      hasPhotos
        ? `Покупатель приложил ${feedbackInfo.photos?.length} фото.`
        : '',
      hasVideo ? 'Покупатель приложил видео.' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const valuationLabels: Record<number, string> = {
      1: 'негативная (оставлена с оценкой)',
      2: 'плохая',
      3: 'неудовлетворительная',
      4: 'хорошая',
      5: 'максимальная',
    };
    const valuationLabel = valuationLabels[feedback.valuation] || 'не указана';

    const prompt = `Ты — профессиональный менеджер по работе с отзывами на маркетплейсе Wildberries.
Твоя задача — написать персонализированный, тёплый и профессиональный ответ на отзыв покупателя.

ИНФОРМАЦИЯ О ТОВАРЕ:
- Название: ${productInfo.name}
- Бренд: ${productInfo.brand}
- Категория: ${productInfo.category}
- Артикул поставщика: ${productInfo.supplierArticle}

ОТЗЫВ ПОКУПАТЕЛЯ:
- Имя: ${feedbackInfo.userName}
- Текст: ${feedbackInfo.feedbackText || '(без текста)'}
- Достоинства: ${feedbackInfo.feedbackTextPros || '(не указаны)'}
- Недостатки: ${feedbackInfo.feedbackTextCons || '(не указаны)'}
- Оценка: ${feedback.valuation} из 5 (${valuationLabel})
${mediaContext}

ШАБЛОНЫ ОТВЕТОВ ПРОДАВЦА (используй как референс стиля):
${templatesContext || '(шаблоны не заданы)'}

ПРИМЕРЫ ОТВЕТОВ НА ОТЗЫВЫ С ОЦЕНКОЙ ${feedback.valuation}/5 (используй как референс тона и стиля для этой оценки):
${recentAnswersContext || '(нет примеров)'}

ПРАВИЛА:
1. Обращайся к покупателю по имени (${feedbackInfo.userName}).
2. Поблагодари за покупку и отзыв.
3. Если есть достоинства — поблагодари за них.
4. Если есть недостатки — извинись, объясни ситуацию мягко.
5. Упомяни бренд "${productInfo.brand}".
6. Длина ответа: 100-300 символов.
7. Тон: дружелюбный, профессиональный.
8. Не используй шаблонные фразы — пиши живо.
9. Ответь ТОЛЬКО текстом ответа, без пояснений.

Ответ:`;

    const { text } = await (aiSdk as any).generateText({
      model: deepseek('deepseek-chat'),
      prompt,
      maxTokens: 512,
      temperature: 0.7,
    });

    return text.trim();
  }

  /**
   * Manually generate answer for a single feedback
   */
  async generateAnswerForFeedback(
    userId: number,
    supplierId: string,
    feedbackId: string,
  ): Promise<string> {
    // Fetch the feedback
    const allFeedbacks = await wbFeedbackService.getAllFeedbacks({
      userId,
      isAnswered: false,
    });

    const feedback = allFeedbacks.find((f) => f.id === feedbackId);
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    const nmId = feedback.productInfo?.wbArticle;
    if (!nmId) {
      throw new Error('Feedback has no nmId');
    }

    // Fetch templates and recent feedbacks
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

    // Fetch recent answered feedbacks with the same valuation for context
    const recentAnswers = await this.getRecentAnswersWithFallback(
      userId,
      supplierId,
      nmId,
      20,
      undefined,
      20,
      feedback.valuation,
    );

    const answerText = await this.generateAnswerWithAI(
      feedback,
      recentAnswers,
      templates,
    );

    // Save to database
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
      },
    });

    return answerText;
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
   * Reject a generated answer
   */
  async rejectAnswer(
    userId: number,
    supplierId: string,
    feedbackId: string,
  ): Promise<void> {
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

  /**
   * Get auto-answer statistics
   */
  async getStatistics(
    userId: number,
    supplierId: string,
  ): Promise<FeedbackStatistics> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
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
   * Get or create settings for a user + supplier
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
   * Update global auto-answer setting for a user + supplier
   */
  async updateSettings(
    userId: number,
    supplierId: string,
    autoAnswerEnabled: boolean,
  ) {
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
   * Update per-product auto-answer setting for a user + supplier
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
   * Get per-product settings for a user + supplier
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

// Export singleton instance
export const feedbackReviewService = new FeedbackReviewService();
export { resolveSupplierId };
