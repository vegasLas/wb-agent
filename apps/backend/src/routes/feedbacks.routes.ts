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

// Goods groups
router.get('/goods-groups', resolveSupplier, asyncHandler(fetchGoodsGroups));
router.post(
  '/goods-groups',
  resolveSupplier,
  body('nmIds').isArray({ min: 2 }).withMessage('nmIds must be an array with at least 2 items'),
  body('nmIds.*').isInt().withMessage('Each nmId must be an integer'),
  validationMiddleware,
  asyncHandler(createGoodsGroup),
);
router.put(
  '/goods-groups/:id',
  resolveSupplier,
  param('id').notEmpty().withMessage('id is required'),
  body('nmIds').isArray({ min: 2 }).withMessage('nmIds must be an array with at least 2 items'),
  body('nmIds.*').isInt().withMessage('Each nmId must be an integer'),
  validationMiddleware,
  asyncHandler(updateGoodsGroup),
);
router.delete(
  '/goods-groups/:id',
  resolveSupplier,
  param('id').notEmpty().withMessage('id is required'),
  validationMiddleware,
  asyncHandler(deleteGoodsGroup),
);
router.post(
  '/goods-groups/merge',
  resolveSupplier,
  body('sourceNmId').isInt().withMessage('sourceNmId must be an integer'),
  body('targetNmId').isInt().withMessage('targetNmId must be an integer'),
  validationMiddleware,
  asyncHandler(mergeGoods),
);
router.post(
  '/goods-groups/:id/remove',
  resolveSupplier,
  param('id').notEmpty().withMessage('id is required'),
  body('nmId').isInt().withMessage('nmId must be an integer'),
  validationMiddleware,
  asyncHandler(removeNmIdFromGroup),
);

router.get('/statistics', resolveSupplier, asyncHandler(fetchFeedbackStatistics));
router.get('/settings', resolveSupplier, asyncHandler(fetchFeedbackSettings));
router.put('/settings', resolveSupplier, asyncHandler(updateFeedbackSettings));
router.put('/settings/product', resolveSupplier, asyncHandler(updateProductFeedbackSetting));
router.get('/templates', asyncHandler(fetchFeedbackTemplates));

// Goods & rules endpoints
router.get('/goods', resolveSupplier, asyncHandler(fetchGoodsByCategory));
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
