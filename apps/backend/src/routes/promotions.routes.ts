/**
 * Promotions Routes
 * API endpoints for WB promotions calendar
 */

import { Router } from 'express';
import {
  fetchPromotionsTimeline,
  fetchPromotionDetail,
  fetchPromotionExcel,
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
 * @access  Private
 */
router.post('/excel', fetchPromotionExcel);

export default router;
