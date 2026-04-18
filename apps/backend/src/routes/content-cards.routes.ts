/**
 * Content Cards Routes
 * API endpoints for WB content-card, commissions, and tariffs
 */

import { Router } from 'express';
import {
  fetchContentCardsTableList,
  fetchContentCardCommissions,
  fetchContentCardTariffsByNmID,
} from '@/controllers/content-cards.controller';

const router = Router();

/**
 * @route   GET /api/v1/content-cards
 * @desc    Get content cards table list
 * @query   n - Number of cards to fetch (default: 20)
 * @access  Private
 */
router.get('/', fetchContentCardsTableList);

/**
 * @route   POST /api/v1/content-cards/:nmID/commissions
 * @desc    Get commissions for a specific content card (auto-resolves via getImt)
 * @param   nmID - NM ID of the card
 * @access  Private
 */
router.post('/:nmID/commissions', fetchContentCardCommissions);

/**
 * @route   POST /api/v1/content-cards/:nmID/tariffs
 * @desc    Get tariffs for a specific content card (auto-resolves dimensions via getImt)
 * @param   nmID - NM ID of the card
 * @access  Private
 */
router.post('/:nmID/tariffs', fetchContentCardTariffsByNmID);

export default router;
