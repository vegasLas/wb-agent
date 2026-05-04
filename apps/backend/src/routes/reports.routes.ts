/**
 * Reports Routes
 * API endpoints for sales reports and analytics
 */

import { Router } from 'express';
import {
  fetchSalesReport,
  fetchOrdersReport,
  fetchRegionSales,
  fetchReport,
} from '@/controllers/reports.controller';

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
 * @route   GET /api/v1/reports/orders
 * @desc    Get orders report for date range (includes cancelled orders)
 * @query   dateFrom - Start date (DD.MM.YY or YYYY-MM-DD)
 * @query   dateTo - End date (DD.MM.YY or YYYY-MM-DD)
 * @access  Private
 */
router.get('/orders', fetchOrdersReport);

/**
 * @route   POST /api/v1/reports/region-sales
 * @desc    Get region sales report by federal districts
 * @body    dateFrom - Start date (DD.MM.YY)
 * @body    dateTo - End date (DD.MM.YY)
 * @body    limit - Number of records (default: 10)
 * @body    offset - Offset for pagination (default: 0)
 * @access  Private
 */
router.post('/region-sales', fetchRegionSales);

/**
 * @route   GET /api/v1/reports
 * @desc    Get user's legacy report data (booking stats)
 * @access  Private
 */
router.get('/', fetchReport);

export default router;
