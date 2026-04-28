import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '@/middleware/auth.middleware';
import {
  autobookingService,
  AutobookingUpdateError,
} from '@/services/domain/autobooking/autobooking.service';
import { ApiError } from '@/utils/errors';

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

// GET /api/v1/autobooking - Get user's autobookings with counts
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
      const result = await autobookingService.getUserAutobookings(
        req.user!.id,
        page,
      );
      res.json(result);
    } catch (error) {
      return next(error);
    }
  },
);

// POST /api/v1/autobooking - Create new autobooking
router.post(
  '/',
  authenticate,
  body('accountId').isUUID().withMessage('Valid account ID is required'),
  body('draftId').notEmpty().withMessage('Draft ID is required'),
  body('warehouseId')
    .isInt({ min: 1 })
    .withMessage('Valid warehouse ID is required'),
  body('supplyType')
    .isIn(['BOX', 'MONOPALLETE', 'SUPERSAFE'])
    .withMessage('Invalid supply type'),
  body('dateType')
    .isIn([
      'WEEK',
      'MONTH',
      'CUSTOM_PERIOD',
      'CUSTOM_DATES',
      'CUSTOM_DATES_SINGLE',
    ])
    .withMessage('Invalid date type'),
  body('maxCoefficient')
    .isFloat({ min: 0, max: 20 })
    .withMessage('Max coefficient must be between 0 and 20'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const {
        accountId,
        draftId,
        warehouseId,
        transitWarehouseId,
        transitWarehouseName,
        supplyType,
        dateType,
        startDate,
        endDate,
        customDates,
        maxCoefficient,
        monopalletCount,
      } = req.body;

      // Handle transitWarehouseId type conversion (string -> number)
      const parsedTransitWarehouseId =
        transitWarehouseId !== undefined
          ? typeof transitWarehouseId === 'string'
            ? parseInt(transitWarehouseId, 10)
            : transitWarehouseId
          : null;

      const autobooking = await autobookingService.createAutobooking(
        req.user!.id,
        {
          accountId,
          draftId,
          warehouseId,
          transitWarehouseId: parsedTransitWarehouseId,
          transitWarehouseName,
          supplyType,
          dateType,
          startDate: parseDateField(startDate),
          endDate: parseDateField(endDate),
          customDates: parseDateArray(customDates),
          maxCoefficient,
          monopalletCount,
        },
      );

      res.json(autobooking);
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

// PUT /api/v1/autobooking - Update autobooking
router.put(
  '/',
  authenticate,
  body('id').isUUID().withMessage('Valid autobooking ID is required'),
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
        draftId,
        warehouseId,
        transitWarehouseId,
        transitWarehouseName,
        supplyType,
        dateType,
        startDate,
        endDate,
        customDates,
        maxCoefficient,
        monopalletCount,
        status,
      } = req.body;

      // Handle transitWarehouseId type conversion
      const parsedTransitWarehouseId =
        transitWarehouseId !== undefined
          ? transitWarehouseId === null
            ? null
            : typeof transitWarehouseId === 'string'
              ? parseInt(transitWarehouseId, 10)
              : transitWarehouseId
          : undefined;

      const updated = await autobookingService.updateAutobooking(userId, {
        id,
        draftId,
        warehouseId,
        transitWarehouseId: parsedTransitWarehouseId,
        transitWarehouseName,
        supplyType,
        dateType,
        startDate:
          startDate !== undefined ? parseDateField(startDate) : undefined,
        endDate: endDate !== undefined ? parseDateField(endDate) : undefined,
        customDates: customDates ? parseDateArray(customDates) : undefined,
        maxCoefficient:
          maxCoefficient !== undefined ? Number(maxCoefficient) : undefined,
        monopalletCount:
          monopalletCount !== undefined ? Number(monopalletCount) : undefined,
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

// DELETE /api/v1/autobooking - Delete autobooking
router.delete(
  '/',
  authenticate,
  body('id').isUUID().withMessage('Valid autobooking ID is required'),
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

      const result = await autobookingService.deleteAutobooking(userId, id);

      res.json({
        success: true,
        message: result.message,
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
