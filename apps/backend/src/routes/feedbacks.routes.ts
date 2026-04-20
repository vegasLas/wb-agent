/**
 * Feedbacks Routes
 * API endpoints for WB feedback/review management
 */

import { Router } from 'express';
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

/**
 * @route   GET /api/v1/feedbacks
 * @desc    Get feedbacks list
 * @query   isAnswered - Filter by answered status
 * @query   limit - Number of records (default: 100)
 * @query   cursor - Pagination cursor
 * @query   searchText - Search text
 * @access  Private
 */
router.get('/', fetchFeedbacks);

/**
 * @route   GET /api/v1/feedbacks/count-unanswered
 * @desc    Count total unanswered feedbacks
 * @access  Private
 */
router.get('/count-unanswered', countUnansweredFeedbacks);

/**
 * @route   POST /api/v1/feedbacks/answer-all
 * @desc    Batch process all unanswered feedbacks
 * @access  Private
 */
router.post('/answer-all', answerAllFeedbacks);

/**
 * @route   POST /api/v1/feedbacks/generate
 * @desc    Generate answer for a single feedback
 * @body    feedbackId
 * @access  Private
 */
router.post('/generate', generateFeedbackAnswer);

/**
 * @route   POST /api/v1/feedbacks/accept
 * @desc    Accept and post generated answer
 * @body    feedbackId
 * @access  Private
 */
router.post('/accept', acceptFeedbackAnswer);

/**
 * @route   POST /api/v1/feedbacks/reject
 * @desc    Reject generated answer
 * @body    feedbackId
 * @access  Private
 */
router.post('/reject', rejectFeedbackAnswer);

/**
 * @route   GET /api/v1/feedbacks/statistics
 * @desc    Get auto-answer statistics
 * @access  Private
 */
router.get('/statistics', fetchFeedbackStatistics);

/**
 * @route   GET /api/v1/feedbacks/settings
 * @desc    Get user feedback settings
 * @access  Private
 */
router.get('/settings', fetchFeedbackSettings);

/**
 * @route   PUT /api/v1/feedbacks/settings
 * @desc    Update global auto-answer setting
 * @body    autoAnswerEnabled
 * @access  Private
 */
router.put('/settings', updateFeedbackSettings);

/**
 * @route   PUT /api/v1/feedbacks/settings/product
 * @desc    Update per-product auto-answer setting
 * @body    nmId, autoAnswerEnabled
 * @access  Private
 */
router.put('/settings/product', updateProductFeedbackSetting);

/**
 * @route   GET /api/v1/feedbacks/templates
 * @desc    Get seller feedback templates
 * @access  Private
 */
router.get('/templates', fetchFeedbackTemplates);

export default router;
