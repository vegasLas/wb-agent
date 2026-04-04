/**
 * Coefficients Routes
 * Handles acceptance coefficients from WB API
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { triggerService } from '../services/trigger.service';
import { ApiError } from '../utils/errors';

const router = Router();

/**
 * GET /api/v1/coefficients
 * Get acceptance coefficients from WB API
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const warehouseIDs = req.query.warehouseIDs as string | undefined;

      const coefficients = await triggerService.getCoefficients(warehouseIDs);

      res.json({
        success: true,
        data: coefficients,
      });
    } catch (error) {
      if (error instanceof Error) {
        next(new ApiError(503, error.message, 'COEFFICIENTS_FETCH_ERROR'));
      } else {
        next(error);
      }
    }
  },
);

export default router;
