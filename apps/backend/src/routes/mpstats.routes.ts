/**
 * MPStats Routes
 * API endpoints for MPStats analytics and SKU card management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '@/middleware/auth.middleware';
import { asyncHandler } from '@/middleware/feedback.middleware';
import { validationMiddleware } from '@/middleware/error.middleware';
import {
  checkMpstatsToken,
  saveMpstatsToken,
  removeMpstatsToken,
  getItemFull,
  saveSkuCard,
  getFavorites,
  addFavorite,
  removeFavorite,
  updateFavoriteTitle,
  getHistory,
  getSkuSummary,
} from '@/controllers/mpstats.controller';

const router = Router();

/**
 * @route   GET /api/v1/mpstats/token
 * @desc    Check whether the user has an MPStats token
 * @access  Private
 */
router.get('/token', authenticate, asyncHandler(checkMpstatsToken));

/**
 * @route   POST /api/v1/mpstats/token
 * @desc    Save or update the user's MPStats token
 * @body    token - MPStats API token
 * @access  Private
 */
router.post(
  '/token',
  authenticate,
  body('token').notEmpty().withMessage('MPStats token is required').isString().withMessage('MPStats token must be a string'),
  validationMiddleware,
  asyncHandler(saveMpstatsToken),
);

/**
 * @route   DELETE /api/v1/mpstats/token
 * @desc    Remove the user's MPStats token
 * @access  Private
 */
router.delete('/token', authenticate, asyncHandler(removeMpstatsToken));

/**
 * @route   GET /api/v1/mpstats/items/:nmId/full
 * @desc    Get full MPStats item info and sync to local cache
 * @param   nmId - Wildberries NM ID
 * @query   d1 - Start date (YYYY-MM-DD)
 * @query   d2 - End date (YYYY-MM-DD)
 * @access  Private
 */
router.get(
  '/items/:nmId/full',
  authenticate,
  param('nmId').isInt().withMessage('nmId must be a number'),
  query('d1').optional().isString(),
  query('d2').optional().isString(),
  validationMiddleware,
  asyncHandler(getItemFull),
);

/**
 * @route   POST /api/v1/mpstats/cards/save
 * @desc    Save or update a SKU card manually
 * @body    nmID, subjectID, subjectName, brand, name, image, photo
 * @access  Private
 */
router.post(
  '/cards/save',
  authenticate,
  body('nmID').isInt().withMessage('nmID is required and must be a number'),
  validationMiddleware,
  asyncHandler(saveSkuCard),
);

/**
 * @route   GET /api/v1/mpstats/favorites
 * @desc    Get user's favourited SKU cards
 * @access  Private
 */
router.get('/favorites', authenticate, asyncHandler(getFavorites));

/**
 * @route   POST /api/v1/mpstats/favorites
 * @desc    Mark a SKU card as favourite
 * @body    nmID
 * @access  Private
 */
router.post(
  '/favorites',
  authenticate,
  body('nmID').isInt().withMessage('nmID is required and must be a number'),
  validationMiddleware,
  asyncHandler(addFavorite),
);

/**
 * @route   DELETE /api/v1/mpstats/favorites/:nmId
 * @desc    Remove a SKU card from favourites
 * @param   nmId - Wildberries NM ID
 * @access  Private
 */
router.delete(
  '/favorites/:nmId',
  authenticate,
  param('nmId').isInt().withMessage('nmId must be a number'),
  validationMiddleware,
  asyncHandler(removeFavorite),
);

/**
 * @route   PATCH /api/v1/mpstats/favorites/:nmId/title
 * @desc    Update the custom title of a favorited SKU card
 * @param   nmId - Wildberries NM ID
 * @body    customTitle - Custom title string or null to clear
 * @access  Private
 */
router.patch(
  '/favorites/:nmId/title',
  authenticate,
  param('nmId').isInt().withMessage('nmId must be a number'),
  body('customTitle').optional({ nullable: true }).isString().withMessage('customTitle must be a string'),
  validationMiddleware,
  asyncHandler(updateFavoriteTitle),
);

/**
 * @route   GET /api/v1/mpstats/history
 * @desc    Get user's recently viewed SKU cards (last 50)
 * @access  Private
 */
router.get('/history', authenticate, asyncHandler(getHistory));

/**
 * @route   GET /api/v1/mpstats/sku/:nmId/summary
 * @desc    Get combined MPStats data for a SKU
 * @param   nmId - Wildberries NM ID
 * @query   d1 - Start date (YYYY-MM-DD)
 * @query   d2 - End date (YYYY-MM-DD)
 * @access  Private
 */
router.get(
  '/sku/:nmId/summary',
  authenticate,
  param('nmId').isInt().withMessage('nmId must be a number'),
  query('d1').optional().isString(),
  query('d2').optional().isString(),
  validationMiddleware,
  asyncHandler(getSkuSummary),
);

export default router;
