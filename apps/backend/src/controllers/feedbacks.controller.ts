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
import type { FeedbackRuleInput } from '@/services/domain/feedback/feedback-settings.service';

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
  supplierArticle: string | null;
  nmId: number;
  answerText: string;
  status: string;
  postedAt: Date | null;
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
    },
    aiAnswer: {
      answerText: row.answerText,
      status: row.status,
    },
    postedAt: row.postedAt ? Number(row.postedAt) : null,
  };
}

/**
 * GET /api/v1/feedbacks
 */
export const fetchFeedbacks = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { tab, page, pageSize, searchText } = req.query as {
    tab?: string;
    page?: string;
    pageSize?: string;
    searchText?: string;
  };

  const currentPage = page ? Math.max(1, Number(page)) : 1;
  const size = pageSize ? Math.max(1, Math.min(100, Number(pageSize))) : 10;
  const skip = (currentPage - 1) * size;

  logger.info(`Fetching feedbacks for user ${userId}, tab=${tab}, page=${currentPage}, pageSize=${size}`);

  if (tab === 'ai-posted' || tab === 'ai-pending') {
    const status = tab === 'ai-posted' ? 'POSTED' : 'PENDING';

    const rows = await prisma.feedbackAutoAnswer.findMany({
      where: {
        userId,
        supplierId,
        status,
      },
      orderBy: status === 'POSTED' ? { postedAt: 'desc' } : { feedbackDate: 'desc' },
      take: size,
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

    const totalPages = Math.ceil(totalCount / size);

    successResponse(res, {
      feedbacks,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalCount,
        totalPages,
        next: currentPage < totalPages ? currentPage + 1 : null,
        prev: currentPage > 1 ? currentPage - 1 : null,
      },
    });
    return;
  }

  // Default: unanswered tab
  // WB API isAnswered filter is unreliable; fetch both and filter client-side
  const pageCursor = skip === 0 ? '' : String(skip);

  const [answeredRes, unansweredRes] = await Promise.all([
    wbFeedbackService.getFeedbacks({
      userId,
      isAnswered: true,
      limit: size,
      cursor: pageCursor,
      searchText: searchText || '',
    }),
    wbFeedbackService.getFeedbacks({
      userId,
      isAnswered: false,
      limit: size,
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
    .slice(0, size)
    .map(mapFeedbackItemToDTO);

  const hasMore = (answeredRes.pages?.next || unansweredRes.pages?.next) !== '';
  const totalCount = unansweredRes.countUnanswered || 0;
  const totalPages = Math.ceil(totalCount / size);

  successResponse(res, {
    feedbacks: filteredFeedbacks,
    pagination: {
      page: currentPage,
      pageSize: size,
      totalCount,
      totalPages,
      next: hasMore ? currentPage + 1 : null,
      prev: currentPage > 1 ? currentPage - 1 : null,
    },
  });
};

/**
 * GET /api/v1/feedbacks/unanswered-summary
 * Collect all feedbacks (answered + unanswered), filter by no answer,
 * group by nmId, and enrich with DB stats (rejected / responses counts).
 */
export const fetchUnansweredSummary = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);

  logger.info(`Fetching unanswered summary for user ${userId}`);

  const [answeredRaw, unansweredRaw] = await Promise.all([
    wbFeedbackService.getAllFeedbacks({ userId, isAnswered: true }),
    wbFeedbackService.getAllFeedbacks({ userId, isAnswered: false }),
  ]);

  // Merge: answered overwrites unanswered to avoid stale data from WB API
  const merged = new Map<string, FeedbackItem>();
  for (const f of unansweredRaw) merged.set(f.id, f);
  for (const f of answeredRaw) merged.set(f.id, f);

  const unansweredFeedbacks = Array.from(merged.values()).filter((f) => !f.answer);

  // Group by nmId
  const groupMap = new Map<
    number,
    { nmId: number; vendorCode: string; count: number }
  >();

  for (const f of unansweredFeedbacks) {
    const nmId = f.productInfo?.wbArticle;
    if (!nmId) continue;
    const existing = groupMap.get(nmId);
    if (existing) {
      existing.count++;
    } else {
      groupMap.set(nmId, {
        nmId,
        vendorCode: f.productInfo?.supplierArticle || '',
        count: 1,
      });
    }
  }

  const groups = Array.from(groupMap.values());
  const nmIds = groups.map((g) => g.nmId);

  // Batch-fetch DB counts for all nmIds in parallel
  const [rejectedCounts, responsesCounts] = await Promise.all([
    prisma.feedbackRejectedAnswer.groupBy({
      by: ['nmId'],
      where: { userId, nmId: { in: nmIds } },
      _count: { nmId: true },
    }),
    prisma.feedbackAutoAnswer.groupBy({
      by: ['nmId'],
      where: { userId, nmId: { in: nmIds } },
      _count: { nmId: true },
    }),
  ]);

  const rejectedMap = new Map<number, number>();
  for (const r of rejectedCounts) {
    rejectedMap.set(r.nmId, r._count.nmId);
  }

  const responsesMap = new Map<number, number>();
  for (const r of responsesCounts) {
    responsesMap.set(r.nmId, r._count.nmId);
  }

  const enrichedGroups = groups.map((g) => {
    const rejectedCount = rejectedMap.get(g.nmId) || 0;
    const responsesCount = responsesMap.get(g.nmId) || 0;
    return {
      ...g,
      rejectedCount,
      responsesCount,
      hasEnoughHistory: rejectedCount >= 5 || responsesCount >= 10,
    };
  });

  successResponse(res, {
    totalCount: unansweredFeedbacks.length,
    groups: enrichedGroups,
  });
};

/**
 * POST /api/v1/feedbacks/answer-all
 * Fire-and-forget: starts processing in background and returns immediately.
 */
export const answerAllFeedbacks = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const { nmIds } = req.body as { nmIds: number[] };

  logger.info(`Starting async answer-all for user ${userId}, supplier ${supplierId}, nmIds=[${nmIds.join(', ')}]`);

  // Fire and forget — do not await, respond immediately
  feedbackReviewService.processUnansweredFeedbacksManual(userId, supplierId, nmIds)
    .then((result) => logger.info(`answer-all completed for user ${userId}:`, result))
    .catch((error) => logger.error(`answer-all failed for user ${userId}:`, error));

  successResponse(res, { started: true, nmIdsCount: nmIds.length });
};

/**
 * POST /api/v1/feedbacks/post-pending
 * Fire-and-forget: posts all pending AI answers to WB API one by one.
 */
export const postPendingAnswers = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  const pendingCount = await prisma.feedbackAutoAnswer.count({
    where: { userId, supplierId, status: 'PENDING' },
  });

  logger.info(`Starting async post-pending for user ${userId}, supplier ${supplierId}, pendingCount=${pendingCount}`);

  // Fire and forget
  feedbackReviewService.postPendingAnswers(userId, supplierId)
    .then((result) => logger.info(`post-pending completed for user ${userId}:`, result))
    .catch((error) => logger.error(`post-pending failed for user ${userId}:`, error));

  successResponse(res, { started: true, pendingCount });
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
 * GET /api/v1/feedbacks/rules
 */
export const fetchFeedbackRules = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);

  logger.info(`Fetching feedback rules for user ${userId}, supplier ${supplierId}`);

  const rules = await feedbackSettingsService.getFeedbackRules(userId, supplierId);
  successResponse(res, { rules });
};

/**
 * POST /api/v1/feedbacks/rules
 */
export const createFeedbackRule = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const supplierId = getSupplierId(req);
  const body = req.body as FeedbackRuleInput & { nmIds: number[] };

  logger.info(`Creating feedback rule for user ${userId}, supplier ${supplierId}`);

  const rule = await feedbackSettingsService.createFeedbackRule(userId, supplierId, {
    nmIds: body.nmIds,
    minRating: body.minRating,
    maxRating: body.maxRating,
    keywords: body.keywords,
    instruction: body.instruction,
    mode: body.mode,
    enabled: body.enabled,
  });
  successResponse(res, { rule });
};

/**
 * PUT /api/v1/feedbacks/rules/:id
 */
export const updateFeedbackRule = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params;
  const body = req.body as FeedbackRuleInput;

  if (!id) {
    throw ApiError.badRequest('id is required');
  }

  logger.info(`Updating feedback rule ${id} for user ${userId}`);

  const rule = await feedbackSettingsService.updateFeedbackRule(id, userId, {
    nmIds: body.nmIds,
    minRating: body.minRating,
    maxRating: body.maxRating,
    keywords: body.keywords,
    instruction: body.instruction,
    mode: body.mode,
    enabled: body.enabled,
  });
  successResponse(res, { rule });
};

/**
 * DELETE /api/v1/feedbacks/rules/:id
 */
export const deleteFeedbackRule = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('id is required');
  }

  logger.info(`Deleting feedback rule ${id} for user ${userId}`);

  await feedbackSettingsService.deleteFeedbackRule(id, userId);
  successResponse(res, { deleted: true });
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
  fetchUnansweredSummary,
  answerAllFeedbacks,
  postPendingAnswers,
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
  fetchFeedbackRules,
  createFeedbackRule,
  updateFeedbackRule,
  deleteFeedbackRule,
};
