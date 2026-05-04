/**
 * Promotions Controller
 * HTTP request handlers for promotions endpoints
 */

import { Request, Response } from 'express';
import {
  getPromotionsTimeline,
  getPromotionDetail,
  getPromotionGoods,
  managePromotionGoods as managePromotionGoodsService,
} from '@/services/domain/promotion/promotions.service';
import { successResponse, errorResponse } from '@/utils/response';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Assert that the request has an authenticated user.
 */
function assertUser(req: Request): { id: number } {
  if (!req.user) {
    throw ApiError.unauthorized('Unauthorized');
  }
  return req.user;
}

/**
 * GET /api/v1/promotions/timeline
 * Get promotions timeline for the authenticated user
 */
export const fetchPromotionsTimeline = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = assertUser(req);
    const { startDate, endDate, filter } = req.query as {
      startDate?: string;
      endDate?: string;
      filter?: string;
    };

    const data = await getPromotionsTimeline({
      userId: user.id,
      startDate,
      endDate,
      filter,
    });

    successResponse(res, data);
  } catch (error) {
    logger.error('Error in fetchPromotionsTimeline:', error);
    errorResponse(res, error as Error);
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
    const user = assertUser(req);
    const { promoID } = req.query as { promoID?: string };

    const data = await getPromotionDetail({
      userId: user.id,
      promoID: Number(promoID),
    });

    successResponse(res, data);
  } catch (error) {
    logger.error('Error in fetchPromotionDetail:', error);
    errorResponse(res, error as Error);
  }
};

/**
 * POST /api/v1/promotions/excel
 * Fetch promotion goods for the authenticated user
 */
export const fetchPromotionGoods = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = assertUser(req);
    const { promoID, periodID, mode } = req.body as {
      promoID?: number;
      periodID?: number;
      mode?: 'participating' | 'excluded';
    };

    if (!promoID || !periodID || !mode) {
      errorResponse(
        res,
        ApiError.badRequest(
          'promoID, periodID, and mode are required',
          'VALIDATION_ERROR',
        ),
        400,
      );
      return;
    }

    const result = await getPromotionGoods({
      userId: user.id,
      promoID,
      periodID,
      mode,
    });

    if (result.error && !result.items) {
      errorResponse(res, ApiError.badRequest(result.error, 'EXCEL_ERROR'), 400);
      return;
    }

    successResponse(res, {
      items: result.items,
      error: null,
      reportPending: false,
      estimatedWaitTime: null,
    });
  } catch (error) {
    logger.error('Error in fetchPromotionGoods:', error);
    errorResponse(res, error as Error);
  }
};

/**
 * POST /api/v1/promotions/recovery
 * Apply promotion recovery with selected items
 */
export const managePromotionGoods = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = assertUser(req);
    const { promoID, periodID, selectedItems, isRecovery } = req.body as {
      promoID?: number;
      periodID?: number;
      selectedItems?: string[];
      isRecovery?: boolean;
    };

    if (!promoID || !periodID || !selectedItems || selectedItems.length === 0) {
      errorResponse(
        res,
        ApiError.badRequest(
          'promoID, periodID, and selectedItems are required',
          'VALIDATION_ERROR',
        ),
        400,
      );
      return;
    }

    const result = await managePromotionGoodsService({
      userId: user.id,
      promoID,
      periodID,
      selectedItems,
      isRecovery: isRecovery ?? false,
    });

    if (!result.success) {
      errorResponse(
        res,
        ApiError.badRequest(
          result.error || 'Recovery failed',
          'RECOVERY_ERROR',
        ),
        400,
      );
      return;
    }

    successResponse(res, {});
  } catch (error) {
    logger.error('Error in managePromotionGoods:', error);
    errorResponse(res, error as Error);
  }
};

export default {
  fetchPromotionsTimeline,
  fetchPromotionDetail,
  fetchPromotionGoods,
  managePromotionGoods,
};
