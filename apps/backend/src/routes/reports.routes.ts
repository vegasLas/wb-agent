/**
 * Reports Routes
 * API endpoints for sales reports and analytics
 */

import { Router } from 'express';
import { fetchSalesReport, fetchReport } from '../controllers/reports.controller';

const router = Router();

/**
 * @route   GET /api/v1/reports/sales
 * @desc    Get sales report for date range
 * @query   dateFrom - Start date (DD.MM.YY or YYYY-MM-DD)
 * @query   dateTo - End date (DD.MM.YY or YYYY-MM-DD)
 * @access  Private
 */
router.get('/sales', fetchSalesReport);

/**
 * @route   GET /api/v1/reports
 * @desc    Get user's legacy report data (booking stats)
 * @access  Private
 */
router.get('/', fetchReport);

export default router;
