/**
 * Promotions Controller
 * HTTP request handlers for promotions endpoints
 */

import { Request, Response } from 'express';
import {
  getPromotionsTimeline,
  getPromotionDetail,
  getPromotionExcel,
} from '../services/promotions.service';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/promotions/timeline
 * Get promotions timeline for the authenticated user
 */
export const fetchPromotionsTimeline = async (req: Request, res: Response): Promise<void> => {
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
export const fetchPromotionDetail = async (req: Request, res: Response): Promise<void> => {
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

    logger.info(`Fetching promotion detail for user ${userId}, promoID: ${promoID}`);

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
export const fetchPromotionExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { periodID } = req.body as { periodID?: number };

    if (!periodID) {
      res.status(400).json({
        success: false,
        error: 'periodID is required',
      });
      return;
    }

    logger.info(`Fetching promotion Excel for user ${userId}, periodID: ${periodID}`);

    const result = await getPromotionExcel({
      userId,
      periodID,
    });

    if (result.error && !result.parsedData) {
      if (result.reportPending) {
        res.status(202).json({
          success: true,
          data: {
            parsedData: null,
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
        parsedData: result.parsedData,
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

export default {
  fetchPromotionsTimeline,
  fetchPromotionDetail,
  fetchPromotionExcel,
};
