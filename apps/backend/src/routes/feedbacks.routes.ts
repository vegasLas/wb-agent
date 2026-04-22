/**
 * Feedbacks Routes
 * API endpoints for WB feedback/review management
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { resolveSupplier, asyncHandler } from '@/middleware/feedback.middleware';
import { validationMiddleware } from '@/middleware/error.middleware';
import {
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
} from '@/controllers/feedbacks.controller';

const router = Router();

router.get('/', resolveSupplier, asyncHandler(fetchFeedbacks));
router.get('/count-unanswered', asyncHandler(countUnansweredFeedbacks));
router.post('/answer-all', resolveSupplier, asyncHandler(answerAllFeedbacks));
router.post('/generate', resolveSupplier, asyncHandler(generateFeedbackAnswer));
router.post('/accept', resolveSupplier, asyncHandler(acceptFeedbackAnswer));
router.post('/reject', resolveSupplier, asyncHandler(rejectFeedbackAnswer));
router.post('/regenerate', resolveSupplier, asyncHandler(regenerateFeedbackAnswer));

// Rejected answers
router.get('/rejected', resolveSupplier, asyncHandler(fetchRejectedAnswers));
router.put(
  '/rejected/:id',
  resolveSupplier,
  param('id').notEmpty().withMessage('id is required'),
  body('userFeedback').optional().isString(),
  body('nmIds').optional().isArray().withMessage('nmIds must be an array'),
  body('nmIds.*').optional().isInt(),
  validationMiddleware,
  asyncHandler(updateRejectedAnswer),
);
router.delete(
  '/rejected/:id',
  resolveSupplier,
  param('id').notEmpty().withMessage('id is required'),
  validationMiddleware,
  asyncHandler(deleteRejectedAnswer),
);

router.get('/statistics', resolveSupplier, asyncHandler(fetchFeedbackStatistics));
router.get('/settings', resolveSupplier, asyncHandler(fetchFeedbackSettings));
router.put('/settings', resolveSupplier, asyncHandler(updateFeedbackSettings));
router.put('/settings/product', resolveSupplier, asyncHandler(updateProductFeedbackSetting));
router.get('/templates', asyncHandler(fetchFeedbackTemplates));

// Category & rules endpoints
router.get('/goods', resolveSupplier, asyncHandler(fetchGoodsByCategory));
router.get('/category-stats', resolveSupplier, asyncHandler(fetchCategoryStats));
router.put(
  '/settings/category',
  resolveSupplier,
  body('category').notEmpty().withMessage('category is required').isString(),
  body('autoAnswerEnabled').isBoolean().withMessage('autoAnswerEnabled must be a boolean'),
  validationMiddleware,
  asyncHandler(updateCategoryFeedbackSetting),
);
router.get('/rules', resolveSupplier, asyncHandler(fetchProductRules));
router.put(
  '/rules/:nmId',
  resolveSupplier,
  param('nmId').isInt({ min: 1 }).withMessage('nmId must be a positive integer'),
  body('minRating').optional().isInt({ min: 1, max: 5 }).withMessage('minRating must be 1-5'),
  body('maxRating').optional().isInt({ min: 1, max: 5 }).withMessage('maxRating must be 1-5'),
  body('excludeKeywords').optional().isArray().withMessage('excludeKeywords must be an array'),
  body('excludeKeywords.*').optional().isString(),
  body('requireApproval').optional().isBoolean(),
  body('enabled').optional().isBoolean(),
  validationMiddleware,
  asyncHandler(updateProductRule),
);

export default router;
