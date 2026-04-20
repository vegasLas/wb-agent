/**
 * Feedbacks Routes
 * API endpoints for WB feedback/review management
 */

import { Router } from 'express';
import { resolveSupplier, asyncHandler } from '@/middleware/feedback.middleware';
import {
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
} from '@/controllers/feedbacks.controller';

const router = Router();

router.get('/', resolveSupplier, asyncHandler(fetchFeedbacks));
router.get('/count-unanswered', asyncHandler(countUnansweredFeedbacks));
router.post('/answer-all', resolveSupplier, asyncHandler(answerAllFeedbacks));
router.post('/generate', resolveSupplier, asyncHandler(generateFeedbackAnswer));
router.post('/accept', resolveSupplier, asyncHandler(acceptFeedbackAnswer));
router.post('/reject', resolveSupplier, asyncHandler(rejectFeedbackAnswer));
router.get('/statistics', resolveSupplier, asyncHandler(fetchFeedbackStatistics));
router.get('/settings', resolveSupplier, asyncHandler(fetchFeedbackSettings));
router.put('/settings', resolveSupplier, asyncHandler(updateFeedbackSettings));
router.put('/settings/product', resolveSupplier, asyncHandler(updateProductFeedbackSetting));
router.get('/templates', asyncHandler(fetchFeedbackTemplates));

export default router;
