/**
 * Promotions Routes
 * API endpoints for WB promotions calendar
 */

import { Router } from 'express';
import {
  fetchPromotionsTimeline,
  fetchPromotionDetail,
  fetchPromotionExcel,
  promotionRecovery,
} from '../controllers/promotions.controller';

const router = Router();

/**
 * @route   GET /api/v1/promotions/timeline
 * @desc    Get promotions timeline
 * @query   startDate - Start date (ISO string)
 * @query   endDate - End date (ISO string)
 * @query   filter - Filter type (e.g. PARTICIPATING)
 * @access  Private
 */
router.get('/timeline', fetchPromotionsTimeline);

/**
 * @route   GET /api/v1/promotions/detail
 * @desc    Get promotion detail by promoID
 * @query   promoID - Promotion ID
 * @access  Private
 */
router.get('/detail', fetchPromotionDetail);

/**
 * @route   POST /api/v1/promotions/excel
 * @desc    Create and fetch promotion Excel report
 * @body    periodID - Period ID
 * @body    isRecovery - true = recovery mode, false = exclusion mode (default: true)
 * @access  Private
 */
router.post('/excel', fetchPromotionExcel);

/**
 * @route   POST /api/v1/promotions/recovery
 * @desc    Apply promotion recovery with selected items
 * @body    periodID - Period ID
 * @body    selectedItems - Array of supplier article IDs
 * @body    isRecovery - true = recover selected items, false = exclude selected items
 * @access  Private
 */
router.post('/recovery', promotionRecovery);

export default router;
