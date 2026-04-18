/**
 * Promotions Routes
 * API endpoints for WB promotions calendar
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import {
  fetchPromotionsTimeline,
  fetchPromotionDetail,
  fetchPromotionExcel,
  promotionRecovery,
} from '@/controllers/promotions.controller';
import { validationMiddleware } from '@/middleware/error.middleware';

const router = Router();

// Rate limiter for expensive WB operations (Excel generation / recovery)
const wbOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: 'Слишком много запросов. Пожалуйста, подождите.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id ?? req.ip),
});

/**
 * @route   GET /api/v1/promotions/timeline
 * @desc    Get promotions timeline
 * @query   startDate - Start date (ISO string)
 * @query   endDate - End date (ISO string)
 * @query   filter - Filter type (PARTICIPATING | SKIPPING | AVAILABLE)
 * @access  Private
 */
router.get(
  '/timeline',
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('filter')
    .optional()
    .isIn(['PARTICIPATING', 'SKIPPING', 'AVAILABLE'])
    .withMessage('filter must be PARTICIPATING, SKIPPING, or AVAILABLE'),
  validationMiddleware,
  fetchPromotionsTimeline,
);

/**
 * @route   GET /api/v1/promotions/detail
 * @desc    Get promotion detail by promoID
 * @query   promoID - Promotion ID
 * @access  Private
 */
router.get(
  '/detail',
  query('promoID')
    .notEmpty()
    .withMessage('promoID is required')
    .isInt({ min: 1 })
    .withMessage('promoID must be a positive integer'),
  validationMiddleware,
  fetchPromotionDetail,
);

/**
 * @route   POST /api/v1/promotions/excel
 * @desc    Create and fetch promotion Excel report
 * @body    periodID - Period ID
 * @body    isRecovery - true = recovery mode, false = exclusion mode (default: true)
 * @body    hasStarted - true = promotion already started, false = not started yet
 * @access  Private
 */
router.post(
  '/excel',
  wbOperationLimiter,
  body('periodID')
    .notEmpty()
    .withMessage('periodID is required')
    .isInt({ min: 1 })
    .withMessage('periodID must be a positive integer'),
  body('isRecovery').optional().isBoolean(),
  body('hasStarted').optional().isBoolean(),
  validationMiddleware,
  fetchPromotionExcel,
);

/**
 * @route   POST /api/v1/promotions/recovery
 * @desc    Apply promotion recovery with selected items
 * @body    periodID - Period ID
 * @body    selectedItems - Array of supplier article IDs
 * @body    isRecovery - true = recover selected items, false = exclude selected items
 * @access  Private
 */
router.post(
  '/recovery',
  wbOperationLimiter,
  body('periodID')
    .notEmpty()
    .withMessage('periodID is required')
    .isInt({ min: 1 })
    .withMessage('periodID must be a positive integer'),
  body('selectedItems')
    .isArray({ min: 1 })
    .withMessage('selectedItems must be a non-empty array'),
  body('selectedItems.*').isString().withMessage('Each item must be a string'),
  body('isRecovery').isBoolean().withMessage('isRecovery must be a boolean'),
  validationMiddleware,
  promotionRecovery,
);

export default router;
