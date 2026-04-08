/**
 * Promotions Controller
 * HTTP request handlers for promotions endpoints
 */

import { Request, Response } from 'express';
import {
  getPromotionsTimeline,
  getPromotionDetail,
  getPromotionExcel,
  applyPromotionRecovery,
} from '../services';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/promotions/timeline
 * Get promotions timeline for the authenticated user
 */
export const fetchPromotionsTimeline = async (
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

    const { startDate, endDate, filter } = req.query as {
      startDate?: string;
      endDate?: string;
      filter?: string;
    };

    logger.info(`Fetching promotions timeline for user ${userId}`);

    const data = await getPromotionsTimeline({
      userId,
      startDate,
      endDate,
      filter,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchPromotionsTimeline controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * GET /api/v1/promotions/detail
 * Get promotion detail for the authenticated user
 */
export const fetchPromotionDetail = async (
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

    const { promoID } = req.query as { promoID?: string };

    if (!promoID) {
      res.status(400).json({
        success: false,
        error: 'promoID is required',
      });
      return;
    }

    logger.info(
      `Fetching promotion detail for user ${userId}, promoID: ${promoID}`,
    );

    const data = await getPromotionDetail({
      userId,
      promoID: Number(promoID),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchPromotionDetail controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/promotions/excel
 * Create and fetch promotion Excel report for the authenticated user
 */
export const fetchPromotionExcel = async (
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

    const { periodID, isRecovery } = req.body as {
      periodID?: number;
      isRecovery?: boolean;
    };

    if (!periodID) {
      res.status(400).json({
        success: false,
        error: 'periodID is required',
      });
      return;
    }

    // Default to true if not provided
    const recoveryFlag = isRecovery !== false;

    logger.info(
      `Fetching promotion Excel for user ${userId}, periodID: ${periodID}, isRecovery: ${recoveryFlag}`,
    );

    const result = await getPromotionExcel({
      userId,
      periodID,
      isRecovery: recoveryFlag,
    });

    if (result.error && !result.items) {
      if (result.reportPending) {
        res.status(202).json({
          success: true,
          data: {
            items: null,
            error: result.error,
            reportPending: true,
            estimatedWaitTime: result.estimatedWaitTime || 30,
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        items: result.items,
        error: null,
        reportPending: false,
        estimatedWaitTime: null,
      },
    });
  } catch (error) {
    logger.error('Error in fetchPromotionExcel controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/promotions/recovery
 * Apply promotion recovery with selected items
 */
export const promotionRecovery = async (
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

    const { periodID, selectedItems, isRecovery } = req.body as {
      periodID?: number;
      selectedItems?: string[];
      isRecovery?: boolean;
    };

    if (!periodID) {
      res.status(400).json({
        success: false,
        error: 'periodID is required',
      });
      return;
    }

    if (!selectedItems || !Array.isArray(selectedItems)) {
      res.status(400).json({
        success: false,
        error: 'selectedItems is required and must be an array',
      });
      return;
    }

    if (typeof isRecovery !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'isRecovery is required and must be a boolean',
      });
      return;
    }

    logger.info(
      `Applying promotion recovery for user ${userId}, periodID: ${periodID}, items: ${selectedItems.length}, isRecovery: ${isRecovery}`,
    );

    const result = await applyPromotionRecovery({
      userId,
      periodID,
      selectedItems,
      isRecovery,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    logger.error('Error in promotionRecovery controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

export default {
  fetchPromotionsTimeline,
  fetchPromotionDetail,
  fetchPromotionExcel,
  promotionRecovery,
};
