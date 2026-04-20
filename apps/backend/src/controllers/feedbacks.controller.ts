/**
 * Feedbacks Controller
 * HTTP request handlers for feedback endpoints
 * All operations are scoped to the user's selected supplier
 */

import { Request, Response } from 'express';
import {
  feedbackReviewService,
  resolveSupplierId,
} from '@/services/domain/feedback/feedback-review.service';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { logger } from '@/utils/logger';

/**
 * GET /api/v1/feedbacks
 * Get feedbacks list for the authenticated user
 */
export const fetchFeedbacks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

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

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchFeedbacks controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * GET /api/v1/feedbacks/count-unanswered
 * Count total unanswered feedbacks
 */
export const countUnansweredFeedbacks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    logger.info(`Counting unanswered feedbacks for user ${userId}`);

    const count = await feedbackReviewService.countUnansweredFeedbacks(userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    logger.error('Error in countUnansweredFeedbacks controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/feedbacks/answer-all
 * Batch process all unanswered feedbacks
 */
export const answerAllFeedbacks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    logger.info(
      `Answering all feedbacks for user ${userId}, supplier ${supplierId}`,
    );

    const result = await feedbackReviewService.processUnansweredFeedbacks(
      userId,
      supplierId,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in answerAllFeedbacks controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/feedbacks/generate
 * Generate answer for a single feedback
 */
export const generateFeedbackAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { feedbackId } = req.body as { feedbackId: string };

    if (!feedbackId) {
      res.status(400).json({
        success: false,
        error: 'feedbackId is required',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    logger.info(
      `Generating answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`,
    );

    const answerText = await feedbackReviewService.generateAnswerForFeedback(
      userId,
      supplierId,
      feedbackId,
    );

    res.status(200).json({
      success: true,
      data: { answerText, feedbackId },
    });
  } catch (error) {
    logger.error('Error in generateFeedbackAnswer controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/feedbacks/accept
 * Accept and post a generated answer
 */
export const acceptFeedbackAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { feedbackId } = req.body as { feedbackId: string };

    if (!feedbackId) {
      res.status(400).json({
        success: false,
        error: 'feedbackId is required',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    logger.info(
      `Accepting answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`,
    );

    await feedbackReviewService.acceptAnswer(userId, supplierId, feedbackId);

    res.status(200).json({
      success: true,
      data: { posted: true },
    });
  } catch (error) {
    logger.error('Error in acceptFeedbackAnswer controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/feedbacks/reject
 * Reject a generated answer
 */
export const rejectFeedbackAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { feedbackId } = req.body as { feedbackId: string };

    if (!feedbackId) {
      res.status(400).json({
        success: false,
        error: 'feedbackId is required',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    logger.info(
      `Rejecting answer for feedback ${feedbackId}, user ${userId}, supplier ${supplierId}`,
    );

    await feedbackReviewService.rejectAnswer(userId, supplierId, feedbackId);

    res.status(200).json({
      success: true,
      data: { rejected: true },
    });
  } catch (error) {
    logger.error('Error in rejectFeedbackAnswer controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * GET /api/v1/feedbacks/statistics
 * Get auto-answer statistics
 */
export const fetchFeedbackStatistics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    const stats = await feedbackReviewService.getStatistics(userId, supplierId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error in fetchFeedbackStatistics controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * GET /api/v1/feedbacks/settings
 * Get user feedback settings
 */
export const fetchFeedbackSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    const settings = await feedbackReviewService.getSettings(
      userId,
      supplierId,
    );
    const productSettings = await feedbackReviewService.getProductSettings(
      userId,
      supplierId,
    );

    res.status(200).json({
      success: true,
      data: {
        settings,
        productSettings,
      },
    });
  } catch (error) {
    logger.error('Error in fetchFeedbackSettings controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/v1/feedbacks/settings
 * Update global auto-answer setting
 */
export const updateFeedbackSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { autoAnswerEnabled } = req.body as { autoAnswerEnabled: boolean };

    if (typeof autoAnswerEnabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'autoAnswerEnabled boolean is required',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    const settings = await feedbackReviewService.updateSettings(
      userId,
      supplierId,
      autoAnswerEnabled,
    );

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error in updateFeedbackSettings controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * PUT /api/v1/feedbacks/settings/product
 * Update per-product auto-answer setting
 */
export const updateProductFeedbackSetting = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { nmId, autoAnswerEnabled } = req.body as {
      nmId: number;
      autoAnswerEnabled: boolean;
    };

    if (typeof nmId !== 'number' || typeof autoAnswerEnabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'nmId and autoAnswerEnabled are required',
      });
      return;
    }

    const supplierId = await resolveSupplierId(userId);
    const setting = await feedbackReviewService.updateProductSetting(
      userId,
      supplierId,
      nmId,
      autoAnswerEnabled,
    );

    res.status(200).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    logger.error('Error in updateProductFeedbackSetting controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * GET /api/v1/feedbacks/templates
 * Get seller feedback templates
 */
export const fetchFeedbackTemplates = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const data = await wbFeedbackService.getFeedbackTemplates({ userId });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchFeedbackTemplates controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
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
