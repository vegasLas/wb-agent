/**
 * Feedbacks Controller
 * HTTP request handlers for feedback endpoints.
 * Assumes authenticate + resolveSupplier middleware have already run.
 */

import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { feedbackReviewService } from '@/services/domain/feedback/feedback-review.service';
import { feedbackRejectedService } from '@/services/domain/feedback/feedback-rejected.service';
import { feedbackSettingsService } from '@/services/domain/feedback/feedback-settings.service';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { mapFeedbackItemToDTO } from '@/services/domain/feedback/feedback-mapper';
import { successResponse } from '@/utils/response';
import type { FeedbackItem } from '@/types/wb';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

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
  const data = await wbFeedbackService.getFeedbacks({
    userId,
    isAnswered: true,
    limit: pageLimit,
    cursor: pageCursor,
    searchText: searchText || '',
  });

  const filteredFeedbacks = (data.feedbacks || [])
    .filter((f) => !f.answer)
    .map(mapFeedbackItemToDTO);

  successResponse(res, {
    countUnanswered: data.countUnanswered,
    feedbacks: filteredFeedbacks,
    pages: data.pages,
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
    30,
  );
  successResponse(res, { rejectedAnswers });
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

export default {
  fetchFeedbacks,
  countUnansweredFeedbacks,
  answerAllFeedbacks,
  generateFeedbackAnswer,
  acceptFeedbackAnswer,
  rejectFeedbackAnswer,
  regenerateFeedbackAnswer,
  fetchRejectedAnswers,
  fetchFeedbackStatistics,
  fetchFeedbackSettings,
  updateFeedbackSettings,
  updateProductFeedbackSetting,
  fetchFeedbackTemplates,
};
