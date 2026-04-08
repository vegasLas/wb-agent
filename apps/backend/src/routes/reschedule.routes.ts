import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '@/middleware/auth.middleware';
import { rescheduleService } from '@/services';
import { ApiError } from '@/utils/errors';
import { AutobookingUpdateError } from '@/services';

const router = Router();

// In-memory queue for concurrent operation prevention
const userQueue = new Set<number>();

/**
 * Type guard to check if value is a valid Date
 */
function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Parse date field with UTC midnight normalization
 * Matches deprecated project behavior
 */
function parseDateField(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
    );
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return new Date(
      Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
    );
  }

  return null;
}

/**
 * Parse array of date fields, filtering out nulls
 */
function parseDateArray(values: (string | Date | null | undefined)[]): Date[] {
  return values.map(parseDateField).filter(isValidDate);
}

// GET /api/v1/reschedule - Get user's reschedules with counts
router.get(
  '/',
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const result = await rescheduleService.getUserReschedules(
        req.user!.id,
        page,
      );
      res.json(result);
    } catch (error) {
      return next(error);
    }
  },
);

// POST /api/v1/reschedule - Create new reschedule
router.post(
  '/',
  authenticate,
  body('warehouseId')
    .isInt({ min: 1 })
    .withMessage('Valid warehouse ID is required'),
  body('dateType')
    .isIn(['WEEK', 'MONTH', 'CUSTOM_PERIOD', 'CUSTOM_DATES_SINGLE'])
    .withMessage('Invalid date type'),
  body('currentDate').notEmpty().withMessage('Current date is required'),
  body('supplyType')
    .isIn(['BOX', 'MONOPALLETE', 'SUPERSAFE'])
    .withMessage('Invalid supply type'),
  body('supplyId').notEmpty().withMessage('Supply ID is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const {
        warehouseId,
        dateType,
        startDate,
        endDate,
        currentDate,
        customDates,
        supplyType,
        supplyId,
        maxCoefficient,
      } = req.body;

      // Use user's selected account from the user object (matching deprecated behavior)
      const selectedAccountId = req.user!.selectedAccountId;

      if (!selectedAccountId) {
        throw new ApiError(400, 'No account selected');
      }

      const reschedule = await rescheduleService.createReschedule(
        req.user!.id,
        selectedAccountId,
        {
          warehouseId,
          dateType,
          startDate: parseDateField(startDate),
          endDate: parseDateField(endDate),
          currentDate: parseDateField(currentDate) || new Date(),
          customDates: customDates ? parseDateArray(customDates) : undefined,
          supplyType,
          supplyId,
          maxCoefficient: maxCoefficient || 0,
        },
      );

      res.json(reschedule);
    } catch (error) {
      if (error instanceof AutobookingUpdateError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      return next(error);
    }
  },
);

// PUT /api/v1/reschedule - Update reschedule
router.put(
  '/',
  authenticate,
  body('id').isUUID().withMessage('Valid reschedule ID is required'),
  async (req, res, next) => {
    const userId = req.user!.id;

    // Check queue - prevent concurrent operations
    if (userQueue.has(userId)) {
      return res.status(429).json({
        success: false,
        error: 'Подождите завершения предыдущей операции',
        code: 'CONCURRENT_OPERATION',
      });
    }

    userQueue.add(userId);

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const {
        id,
        warehouseId,
        dateType,
        startDate,
        endDate,
        customDates,
        maxCoefficient,
        supplyType,
        supplyId,
        status,
      } = req.body;

      const updated = await rescheduleService.updateReschedule(userId, {
        id,
        warehouseId,
        dateType,
        startDate:
          startDate !== undefined ? parseDateField(startDate) : undefined,
        endDate: endDate !== undefined ? parseDateField(endDate) : undefined,
        customDates: customDates ? parseDateArray(customDates) : undefined,
        maxCoefficient:
          maxCoefficient !== undefined ? Number(maxCoefficient) : undefined,
        supplyType,
        supplyId,
        status,
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      if (error instanceof AutobookingUpdateError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      return next(error);
    } finally {
      userQueue.delete(userId);
    }
  },
);

// DELETE /api/v1/reschedule - Delete reschedule
router.delete(
  '/',
  authenticate,
  body('id').isUUID().withMessage('Valid reschedule ID is required'),
  async (req, res, next) => {
    const userId = req.user!.id;

    // Check queue - prevent concurrent operations
    if (userQueue.has(userId)) {
      return res.status(429).json({
        success: false,
        error: 'Подождите завершения предыдущей операции',
        code: 'CONCURRENT_OPERATION',
      });
    }

    userQueue.add(userId);

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { id } = req.body;

      const result = await rescheduleService.deleteReschedule(userId, id);

      res.json({
        success: true,
        message: result.message,
        returnedCredits: result.returnedCredits,
      });
    } catch (error) {
      if (error instanceof AutobookingUpdateError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      }
      return next(error);
    } finally {
      userQueue.delete(userId);
    }
  },
);

export default router;
