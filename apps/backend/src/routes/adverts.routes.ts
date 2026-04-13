/**
 * Adverts Routes
 * API endpoints for WB adverts management
 */

import { Router } from 'express';
import {
  fetchAdverts,
  fetchAdvertPresetInfo,
} from '@/controllers/adverts.controller';

const router = Router();

/**
 * @route   GET /api/v1/adverts
 * @desc    Get adverts list
 * @query   pageNumber - Page number (default: 1)
 * @query   pageSize - Page size (default: 10)
 * @query   status - Array of status IDs (default: [4, 9, 11])
 * @query   order - Order field (default: 'createDate')
 * @query   direction - Sort direction (default: 'desc')
 * @query   autofill - Autofill filter (default: 'all')
 * @query   bidType - Array of bid types (default: [1, 2])
 * @query   type - Array of advert types (default: [8, 9])
 * @access  Private
 */
router.get('/', fetchAdverts);

/**
 * @route   GET /api/v1/adverts/:advertId/preset-info
 * @desc    Get advert preset info
 * @param   advertId - Advert ID
 * @query   pageSize - Page size (default: 20)
 * @query   pageNumber - Page number (default: 1)
 * @query   filterQuery - Filter query
 * @query   from - Start date
 * @query   to - End date
 * @query   sortDirection - Sort direction (default: 'descend')
 * @query   nmId - NM ID for filtering
 * @query   calcPages - Calculate pages (default: true)
 * @query   calcTotal - Calculate total (default: true)
 * @access  Private
 */
router.get('/:advertId/preset-info', fetchAdvertPresetInfo);

export default router;
