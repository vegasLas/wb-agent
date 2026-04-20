/**
 * Feedbacks Controller
 * HTTP request handlers for feedback endpoints.
 * Assumes authenticate + resolveSupplier middleware have already run.
 */

import { Request, Response } from 'express';
import { feedbackReviewService } from '@/services/domain/feedback/feedback-review.service';
import { feedbackSettingsService } from '@/services/domain/feedback/feedback-settings.service';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { successResponse } from '@/utils/response';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

function getUserId(req: Request): number {
  return req.user!.id;
}

function getSupplierId(req: Request): string {
  return req.supplierId!;
}

/**
 * GET /api/v1/feedbacks
 */
export const fetchFeedbacks = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { isAnswered, limit, cursor, searchText } = req.query as {
    isAnswered?: string;
    limit?: string;
    cursor?: string;
    searchText?: string;
  };

  logger.info(`Fetching feedbacks for user ${userId}`);

  const data = await wbFeedbackService.getFeedbacks({
    userId,
    isAnswered: isAnswered === 'true',
    limit: limit ? Number(limit) : 100,
    cursor: cursor || '',
    searchText: searchText || '',
  });

  successResponse(res, data);
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
  const { feedbackId } = req.body as { feedbackId: string };

  if (!feedbackId) {
    throw ApiError.badRequest('feedbackId is required');
  }

  logger.info(`Generating answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`);

  const answerText = await feedbackReviewService.generateAnswerForFeedback(userId, supplierId, feedbackId);
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
  const { feedbackId } = req.body as { feedbackId: string };

  if (!feedbackId) {
    throw ApiError.badRequest('feedbackId is required');
  }

  logger.info(`Rejecting answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`);

  await feedbackReviewService.rejectAnswer(userId, supplierId, feedbackId);
  successResponse(res, { rejected: true });
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
  fetchFeedbackStatistics,
  fetchFeedbackSettings,
  updateFeedbackSettings,
  updateProductFeedbackSetting,
  fetchFeedbackTemplates,
};
