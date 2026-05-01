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
 * Create and fetch promotion Excel report for the authenticated user
 */
export const fetchPromotionExcel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = assertUser(req);
    const { periodID, isRecovery, hasStarted } = req.body as {
      periodID?: number;
      isRecovery?: boolean;
      hasStarted?: boolean;
    };

    const recoveryFlag = isRecovery !== false;

    const result = await getPromotionExcel({
      userId: user.id,
      periodID,
      isRecovery: recoveryFlag,
      hasStarted,
    });

    if (result.error && !result.items) {
      if (result.reportPending) {
        successResponse(
          res,
          {
            items: null,
            error: result.error,
            reportPending: true,
            estimatedWaitTime: result.estimatedWaitTime || 30,
          },
          202,
        );
        return;
      }

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
    logger.error('Error in fetchPromotionExcel:', error);
    errorResponse(res, error as Error);
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
    const user = assertUser(req);
    const { periodID, selectedItems, isRecovery } = req.body as {
      periodID?: number;
      selectedItems?: string[];
      isRecovery?: boolean;
    };

    const result = await applyPromotionRecovery({
      userId: user.id,
      periodID,
      selectedItems,
      isRecovery,
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
    logger.error('Error in promotionRecovery:', error);
    errorResponse(res, error as Error);
  }
};

export default {
  fetchPromotionsTimeline,
  fetchPromotionDetail,
  fetchPromotionExcel,
  promotionRecovery,
};
