/**
 * Content Cards Controller
 * HTTP request handlers for WB content-card endpoints
 */

import { Request, Response } from 'express';
import { wbContentService } from '@/services/external/wb';
import { logger } from '@/utils/logger';

/**
 * GET /api/v1/content-cards
 * Get content cards table list for the authenticated user
 */
export const fetchContentCardsTableList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { n } = req.query as { n?: string };

    logger.info(`Fetching content cards table list for user ${userId}`);

    const data = await wbContentService.getContentCardsTableList({
      userId,
      n: n ? Number(n) : 20,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardsTableList controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/imt
 * Get IMT details for a specific content card
 */
export const fetchContentCardImt = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { nmID } = req.body as { nmID?: number };

    if (!nmID) {
      res.status(400).json({
        success: false,
        error: 'nmID is required',
      });
      return;
    }

    logger.info(`Fetching content card IMT for user ${userId}, nmID: ${nmID}`);

    const data = await wbContentService.getContentCardImt({
      userId,
      nmID: Number(nmID),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardImt controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/tariffs
 * Get tariffs by dimensions and subject
 */
export const fetchContentCardTariffs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { height, length, weight, width, subjectId } = req.body as {
      height?: number;
      length?: number;
      weight?: number;
      width?: number;
      subjectId?: number;
    };

    if (
      height === undefined ||
      length === undefined ||
      weight === undefined ||
      width === undefined ||
      subjectId === undefined
    ) {
      res.status(400).json({
        success: false,
        error: 'height, length, weight, width, and subjectId are required',
      });
      return;
    }

    logger.info(`Fetching tariffs for user ${userId}, subjectId: ${subjectId}`);

    const data = await wbContentService.getContentCardTariffs({
      userId,
      height: Number(height),
      length: Number(length),
      weight: Number(weight),
      width: Number(width),
      subjectId: Number(subjectId),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardTariffs controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/categories
 * Get categories/commissions by search text and category
 */
export const fetchContentCardCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { searchText, category, take, skip, sort, order } = req.body as {
      searchText?: string;
      category?: string[];
      take?: number;
      skip?: number;
      sort?: string;
      order?: string;
    };

    if (!searchText || !category) {
      res.status(400).json({
        success: false,
        error: 'searchText and category are required',
      });
      return;
    }

    logger.info(`Fetching categories for user ${userId}, searchText: ${searchText}`);

    const data = await wbContentService.getContentCardCategories({
      userId,
      searchText,
      category,
      take: take !== undefined ? Number(take) : 100,
      skip: skip !== undefined ? Number(skip) : 0,
      sort: sort || 'name',
      order: order || 'asc',
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardCategories controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/:nmID/commissions
 * Get commissions for a specific content card (auto-resolves subject/parent via getImt)
 */
export const fetchContentCardCommissions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { nmID } = req.params;

    if (!nmID) {
      res.status(400).json({
        success: false,
        error: 'nmID is required',
      });
      return;
    }

    logger.info(`Fetching commissions for user ${userId}, nmID: ${nmID}`);

    const data = await wbContentService.getContentCardCommissions({
      userId,
      nmID: Number(nmID),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardCommissions controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/:nmID/tariffs
 * Get tariffs for a specific content card (auto-resolves dimensions and subjectId via getImt)
 */
export const fetchContentCardTariffsByNmID = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { nmID } = req.params;

    if (!nmID) {
      res.status(400).json({
        success: false,
        error: 'nmID is required',
      });
      return;
    }

    logger.info(`Fetching tariffs by nmID for user ${userId}, nmID: ${nmID}`);

    const data = await wbContentService.getContentCardTariffsByNmID({
      userId,
      nmID: Number(nmID),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardTariffsByNmID controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

export default {
  fetchContentCardsTableList,
  fetchContentCardImt,
  fetchContentCardTariffs,
  fetchContentCardCategories,
  fetchContentCardCommissions,
  fetchContentCardTariffsByNmID,
};
