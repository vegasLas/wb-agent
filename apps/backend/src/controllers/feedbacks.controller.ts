/**
 * Feedbacks Controller
 * HTTP request handlers for feedback endpoints.
 * Assumes authenticate + resolveSupplier middleware have already run.
 */

import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { feedbackReviewService } from '@/services/domain/feedback/feedback-review.service';
import { feedbackRejectedService } from '@/services/domain/feedback/feedback-rejected.service';
import { feedbackGoodsGroupService } from '@/services/domain/feedback/feedback-goods-group.service';
import { feedbackSettingsService } from '@/services/domain/feedback/feedback-settings.service';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { mapFeedbackItemToDTO } from '@/services/domain/feedback/feedback-mapper';
import { successResponse } from '@/utils/response';
import type { FeedbackItem } from '@/types/wb';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import type { FeedbackProductRuleInput } from '@/services/domain/feedback/feedback-settings.service';

function getUserId(req: Request): number {
  return req.user!.id;
}

function getSupplierId(req: Request): string {
  return req.supplierId!;
}

function mapDbRowToFeedbackItemDTO(row: {
  feedbackId: string;
  feedbackDate: number | null;
  valuation: number;
  feedbackText: string;
  feedbackTextPros: string | null;
  feedbackTextCons: string | null;
  photos: unknown;
  video: unknown;
  userName: string | null;
  purchaseDate: bigint | null;
  feedbackDate: bigint | null;
  productName: string | null;
  productBrand: string | null;
  productCategory: string | null;
  supplierArticle: string | null;
  nmId: number;
  answerText: string;
  status: string;
}) {
  return {
    id: row.feedbackId,
    createdDate: row.feedbackDate ? Number(row.feedbackDate) : 0,
    valuation: row.valuation,
    trustFactor: 'buyout',
    answer: null,
    feedbackInfo: {
      feedbackText: row.feedbackText,
      feedbackTextPros: row.feedbackTextPros ?? '',
      feedbackTextCons: row.feedbackTextCons ?? '',
      photos: (row.photos as { fullSizeUrl: string; thumbUrl: string }[] | null) ?? null,
      video: (row.video as { durationSec: number; link: string; previewImage: string } | null) ?? null,
      userName: row.userName ?? '',
      purchaseDate: row.purchaseDate ? Number(row.purchaseDate) : 0,
      isHidden: false,
    },
    productInfo: {
      brand: row.productBrand ?? '',
      name: row.productName ?? '',
      supplierArticle: row.supplierArticle ?? '',
      wbArticle: row.nmId,
      category: row.productCategory ?? '',
    },
    aiAnswer: {
      answerText: row.answerText,
      status: row.status,
    },
  };
}

/**
 * GET /api/v1/feedbacks
 */
export const fetchFeedbacks = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { tab, limit, cursor, searchText } = req.query as {
    tab?: string;
    limit?: string;
    cursor?: string;
    searchText?: string;
  };

  const pageLimit = limit ? Number(limit) : 100;
  const pageCursor = cursor || '';

  logger.info(`Fetching feedbacks for user ${userId}, tab=${tab}`);

  if (tab === 'ai-posted' || tab === 'ai-pending') {
    const status = tab === 'ai-posted' ? 'POSTED' : 'PENDING';
    const skip = pageCursor ? Number(pageCursor) : 0;

    const rows = await prisma.feedbackAutoAnswer.findMany({
      where: {
        userId,
        supplierId,
        status,
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit,
      skip,
    });

    const totalCount = await prisma.feedbackAutoAnswer.count({
      where: {
        userId,
        supplierId,
        status,
      },
    });

    const feedbacks = rows
      .filter((row) => row.productName && row.feedbackText !== undefined)
      .map(mapDbRowToFeedbackItemDTO);

    const hasMore = skip + rows.length < totalCount;

    successResponse(res, {
      countUnanswered: 0,
      feedbacks,
      pages: {
        last: '',
        next: hasMore ? String(skip + pageLimit) : '',
      },
    });
    return;
  }

  // Default: unanswered tab
  // WB API isAnswered filter is unreliable; fetch both and filter client-side
  const [answeredRes, unansweredRes] = await Promise.all([
    wbFeedbackService.getFeedbacks({
      userId,
      isAnswered: true,
      limit: pageLimit,
      cursor: pageCursor,
      searchText: searchText || '',
    }),
    wbFeedbackService.getFeedbacks({
      userId,
      isAnswered: false,
      limit: pageLimit,
      cursor: pageCursor,
      searchText: searchText || '',
    }),
  ]);

  // Merge and deduplicate by id
  // Unanswered first, then answered — answered wins if a feedback
  // appears in both (WB API may return stale data after an answer is posted)
  const merged = new Map<string, FeedbackItem>();
  for (const f of unansweredRes.feedbacks || []) {
    merged.set(f.id, f);
  }
  for (const f of answeredRes.feedbacks || []) {
    merged.set(f.id, f);
  }

  // Filter: only feedbacks that genuinely have no answer
  const filteredFeedbacks = Array.from(merged.values())
    .filter((f) => !f.answer)
    .sort((a, b) => b.createdDate - a.createdDate)
    .slice(0, pageLimit)
    .map(mapFeedbackItemToDTO);

  const hasMore = (answeredRes.pages?.next || unansweredRes.pages?.next) !== '';

  successResponse(res, {
    countUnanswered: unansweredRes.countUnanswered,
    feedbacks: filteredFeedbacks,
    pages: {
      last: '',
      next: hasMore ? (pageCursor ? String(Number(pageCursor) + pageLimit) : String(pageLimit)) : '',
    },
  });
};

/**
 * GET /api/v1/feedbacks/count-unanswered
 */
export const countUnansweredFeedbacks = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  logger.info(`Counting unanswered feedbacks for user ${userId}`);

  const count = await feedbackReviewService.countUnansweredFeedbacks(userId);
  successResponse(res, { count });
};

/**
 * POST /api/v1/feedbacks/answer-all
 */
export const answerAllFeedbacks = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  logger.info(`Answering all feedbacks for user ${userId}, supplier ${supplierId}`);

  const result = await feedbackReviewService.processUnansweredFeedbacks(userId, supplierId);
  successResponse(res, result);
};

/**
 * POST /api/v1/feedbacks/generate
 */
export const generateFeedbackAnswer = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { feedbackId, feedback } = req.body as { feedbackId: string; feedback: unknown };

  if (!feedbackId) {
    throw ApiError.badRequest('feedbackId is required');
  }
  if (!feedback) {
    throw ApiError.badRequest('feedback data is required');
  }

  logger.info(`Generating answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`);

  const answerText = await feedbackReviewService.generateAnswerForFeedback(userId, supplierId, feedbackId, feedback as FeedbackItem);
  successResponse(res, { answerText, feedbackId });
};

/**
 * POST /api/v1/feedbacks/accept
 */
export const acceptFeedbackAnswer = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { feedbackId } = req.body as { feedbackId: string };

  if (!feedbackId) {
    throw ApiError.badRequest('feedbackId is required');
  }

  logger.info(`Accepting answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`);

  await feedbackReviewService.acceptAnswer(userId, supplierId, feedbackId);
  successResponse(res, { posted: true });
};

/**
 * POST /api/v1/feedbacks/reject
 */
export const rejectFeedbackAnswer = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { feedbackId, userFeedback } = req.body as { feedbackId: string; userFeedback?: string };

  if (!feedbackId) {
    throw ApiError.badRequest('feedbackId is required');
  }

  logger.info(`Rejecting answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`);

  await feedbackReviewService.rejectAnswer(userId, supplierId, feedbackId, userFeedback);
  successResponse(res, { rejected: true });
};

/**
 * POST /api/v1/feedbacks/regenerate
 */
export const regenerateFeedbackAnswer = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { feedbackId, feedback, userFeedback } = req.body as { feedbackId: string; feedback: unknown; userFeedback?: string };

  if (!feedbackId) {
    throw ApiError.badRequest('feedbackId is required');
  }
  if (!feedback) {
    throw ApiError.badRequest('feedback data is required');
  }

  logger.info(`Regenerating answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`);

  const answerText = await feedbackReviewService.regenerateAnswer(
    userId,
    supplierId,
    feedbackId,
    feedback as FeedbackItem,
    userFeedback,
  );
  successResponse(res, { answerText, feedbackId });
};

/**
 * GET /api/v1/feedbacks/rejected
 */
export const fetchRejectedAnswers = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  const rejectedAnswers = await feedbackRejectedService.getRecentRejectedAnswers(
    userId,
    supplierId,
    100,
  );
  successResponse(res, { rejectedAnswers });
};

/**
 * PUT /api/v1/feedbacks/rejected/:id
 */
export const updateRejectedAnswer = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { userFeedback } = req.body as { userFeedback?: string };

  if (!id) {
    throw ApiError.badRequest('id is required');
  }

  await feedbackRejectedService.updateRejectedAnswer(id, userId, {
    userFeedback,
  });
  successResponse(res, { updated: true });
};

/**
 * DELETE /api/v1/feedbacks/rejected/:id
 */
export const deleteRejectedAnswer = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('id is required');
  }

  await feedbackRejectedService.deleteRejectedAnswer(id, userId);
  successResponse(res, { deleted: true });
};

/**
 * GET /api/v1/feedbacks/statistics
 */
export const fetchFeedbackStatistics = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  const stats = await feedbackSettingsService.getStatistics(userId, supplierId);
  successResponse(res, stats);
};

/**
 * GET /api/v1/feedbacks/settings
 */
export const fetchFeedbackSettings = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  const settings = await feedbackSettingsService.getSettings(userId, supplierId);
  const productSettings = await feedbackSettingsService.getProductSettings(userId, supplierId);

  successResponse(res, { settings, productSettings });
};

/**
 * PUT /api/v1/feedbacks/settings
 */
export const updateFeedbackSettings = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { autoAnswerEnabled } = req.body as { autoAnswerEnabled: boolean };

  if (typeof autoAnswerEnabled !== 'boolean') {
    throw ApiError.badRequest('autoAnswerEnabled boolean is required');
  }

  const settings = await feedbackSettingsService.updateSettings(userId, supplierId, autoAnswerEnabled);
  successResponse(res, settings);
};

/**
 * PUT /api/v1/feedbacks/settings/product
 */
export const updateProductFeedbackSetting = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { nmId, autoAnswerEnabled } = req.body as { nmId: number; autoAnswerEnabled: boolean };

  if (typeof nmId !== 'number' || typeof autoAnswerEnabled !== 'boolean') {
    throw ApiError.badRequest('nmId and autoAnswerEnabled are required');
  }

  const setting = await feedbackSettingsService.updateProductSetting(userId, supplierId, nmId, autoAnswerEnabled);
  successResponse(res, setting);
};

/**
 * GET /api/v1/feedbacks/templates
 */
export const fetchFeedbackTemplates = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const data = await wbFeedbackService.getFeedbackTemplates({ userId });
  successResponse(res, data);
};

/**
 * GET /api/v1/feedbacks/goods
 */
export const fetchGoodsByCategory = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  logger.info(`Fetching goods by category for user ${userId}, supplier ${supplierId}`);

  const goodsByCategory = await feedbackSettingsService.getGoodsByCategory(userId, supplierId);
  successResponse(res, { goodsByCategory });
};

/**
 * GET /api/v1/feedbacks/category-stats
 */
export const fetchCategoryStats = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  logger.info(`Fetching category stats for user ${userId}, supplier ${supplierId}`);

  const stats = await feedbackSettingsService.getCategoryStats(userId, supplierId);
  successResponse(res, { stats });
};

/**
 * PUT /api/v1/feedbacks/settings/category
 */
export const updateCategoryFeedbackSetting = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { category, autoAnswerEnabled } = req.body as { category: string; autoAnswerEnabled: boolean };

  if (!category || typeof autoAnswerEnabled !== 'boolean') {
    throw ApiError.badRequest('category and autoAnswerEnabled are required');
  }

  logger.info(`Updating category setting for user ${userId}, supplier ${supplierId}, category ${category}`);

  const setting = await feedbackSettingsService.updateCategorySetting(
    userId,
    supplierId,
    category,
    autoAnswerEnabled,
  );
  successResponse(res, setting);
};

/**
 * GET /api/v1/feedbacks/rules
 */
export const fetchProductRules = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  logger.info(`Fetching product rules for user ${userId}, supplier ${supplierId}`);

  const rules = await feedbackSettingsService.getProductRules(userId, supplierId);
  successResponse(res, { rules });
};

/**
 * PUT /api/v1/feedbacks/rules/:nmId
 */
export const updateProductRule = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const nmId = Number(req.params.nmId);
  const body = req.body as FeedbackProductRuleInput;

  if (!nmId || isNaN(nmId)) {
    throw ApiError.badRequest('nmId is required');
  }

  logger.info(`Updating product rule for user ${userId}, supplier ${supplierId}, nmId ${nmId}`);

  const rule = await feedbackSettingsService.updateProductRule(userId, supplierId, nmId, {
    minRating: body.minRating,
    maxRating: body.maxRating,
    excludeKeywords: body.excludeKeywords,
    requireApproval: body.requireApproval,
    enabled: body.enabled,
  });
  successResponse(res, rule);
};

/**
 * GET /api/v1/feedbacks/goods-groups
 */
export const fetchGoodsGroups = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  const groups = await feedbackGoodsGroupService.getGroups(userId, supplierId);
  successResponse(res, { groups });
};

/**
 * POST /api/v1/feedbacks/goods-groups
 */
export const createGoodsGroup = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { nmIds } = req.body as { nmIds: number[] };

  const group = await feedbackGoodsGroupService.createGroup(userId, supplierId, nmIds);
  successResponse(res, { group });
};

/**
 * PUT /api/v1/feedbacks/goods-groups/:id
 */
export const updateGoodsGroup = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { nmIds } = req.body as { nmIds: number[] };

  const group = await feedbackGoodsGroupService.updateGroup(id, userId, nmIds);
  successResponse(res, { group });
};

/**
 * DELETE /api/v1/feedbacks/goods-groups/:id
 */
export const deleteGoodsGroup = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { id } = req.params;

  await feedbackGoodsGroupService.deleteGroup(id, userId, supplierId);
  successResponse(res, { deleted: true });
};

/**
 * POST /api/v1/feedbacks/goods-groups/merge
 */
export const mergeGoods = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { sourceNmId, targetNmId } = req.body as {
    sourceNmId: number;
    targetNmId: number;
  };

  logger.info(
    `mergeGoods called: user=${userId}, supplier=${supplierId}, source=${sourceNmId}, target=${targetNmId}`,
  );

  try {
    const group = await feedbackGoodsGroupService.mergeGoods(
      userId,
      supplierId,
      sourceNmId,
      targetNmId,
    );
    logger.info(
      `mergeGoods success: group=${group.id}, nmIds=[${group.nmIds.join(', ')}]`,
    );
    successResponse(res, { group });
  } catch (error) {
    logger.error(
      `mergeGoods FAILED: user=${userId}, source=${sourceNmId}, target=${targetNmId}`,
      error,
    );
    throw error;
  }
};

/**
 * POST /api/v1/feedbacks/goods-groups/:id/remove
 */
export const removeNmIdFromGroup = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { id } = req.params;
  const { nmId } = req.body as { nmId: number };

  const result = await feedbackGoodsGroupService.removeNmIdFromGroup(
    id,
    userId,
    supplierId,
    nmId,
  );
  successResponse(res, { success: true, group: result || null });
};

export default {
  fetchFeedbacks,
  countUnansweredFeedbacks,
  answerAllFeedbacks,
  generateFeedbackAnswer,
  acceptFeedbackAnswer,
  rejectFeedbackAnswer,
  regenerateFeedbackAnswer,
  fetchRejectedAnswers,
  updateRejectedAnswer,
  deleteRejectedAnswer,
  fetchGoodsGroups,
  createGoodsGroup,
  updateGoodsGroup,
  deleteGoodsGroup,
  mergeGoods,
  removeNmIdFromGroup,
  fetchFeedbackStatistics,
  fetchFeedbackSettings,
  updateFeedbackSettings,
  updateProductFeedbackSetting,
  fetchFeedbackTemplates,
  fetchGoodsByCategory,
  fetchCategoryStats,
  updateCategoryFeedbackSetting,
  fetchProductRules,
  updateProductRule,
};
