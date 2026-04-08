import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { triggerService } from '../services';
import { ApiError } from '../utils/errors';
import {
  TRIGGER_INTERVALS,
  MAX_WAREHOUSES_PER_TRIGGER,
} from '../constants/triggers';

const router = Router();

/**
 * GET /api/v1/triggers
 * Get all triggers for the authenticated user
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const triggers = await triggerService.getUserTriggers(req.user!.id);
      res.json(triggers);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/triggers
 * Create a new trigger
 */
router.post(
  '/',
  authenticate,
  [
    body('warehouseIds')
      .isArray({ min: 1, max: MAX_WAREHOUSES_PER_TRIGGER })
      .withMessage(`Выберите от 1 до ${MAX_WAREHOUSES_PER_TRIGGER} складов`),
    body('supplyTypes')
      .isArray({ min: 1 })
      .withMessage('Выберите хотя бы один тип поставки'),
    body('maxCoefficient')
      .isFloat({ min: 0, max: 20 })
      .withMessage('Коэффициент должен быть от 0 до 20'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const {
        warehouseIds,
        supplyTypes,
        checkInterval,
        maxCoefficient,
        searchMode,
        startDate,
        endDate,
        selectedDates,
      } = req.body;

      // Validate search mode and dates
      if (searchMode === 'CUSTOM_DATES') {
        if (!selectedDates?.length) {
          throw ApiError.badRequest('Выберите даты для поиска');
        }
      }

      if (searchMode === 'CUSTOM_DATES' && (!startDate || !endDate)) {
        throw ApiError.badRequest('Укажите период поиска');
      }

      // Validate check interval
      const isIntervalValid = TRIGGER_INTERVALS.find(
        (interval) => interval.value === checkInterval,
      );
      if (!isIntervalValid) {
        throw ApiError.badRequest('Неверный интервал проверки');
      }

      // Validate warehouse count
      if (warehouseIds.length > 3) {
        throw ApiError.badRequest('Нельзя выбрать более трех складов');
      }

      // Validate active triggers limit
      const activeTriggersCount = await triggerService.getActiveTriggersCount(
        req.user!.id,
      );
      if (activeTriggersCount >= 30) {
        throw ApiError.badRequest('Достигнут лимит активных таймслотов (30)');
      }

      const trigger = await triggerService.createTrigger(req.user!.id, {
        warehouseIds,
        supplyTypes,
        checkInterval,
        maxCoefficient,
        searchMode,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        selectedDates: selectedDates || [],
      });

      res.status(201).json(trigger);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /api/v1/triggers
 * Update an existing trigger
 */
router.put(
  '/',
  authenticate,
  [
    body('triggerId').isUUID().withMessage('Неверный ID триггера'),
    body('warehouseIds')
      .optional()
      .isArray({ max: MAX_WAREHOUSES_PER_TRIGGER }),
    body('supplyTypes').optional().isArray(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { triggerId, warehouseIds, supplyTypes, isActive } = req.body;

      const updated = await triggerService.updateTrigger(req.user!.id, {
        triggerId,
        warehouseIds,
        supplyTypes,
        isActive,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /api/v1/triggers
 * Toggle trigger active status
 */
router.patch(
  '/',
  authenticate,
  [body('triggerId').isUUID().withMessage('Неверный ID триггера')],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { triggerId } = req.body;

      // Get the trigger to check if we're activating or deactivating
      const trigger = await triggerService.getTrigger(req.user!.id, triggerId);

      // Only check limit when activating
      if (!trigger.isActive) {
        const activeTriggersCount = await triggerService.getActiveTriggersCount(
          req.user!.id,
        );
        if (activeTriggersCount >= 30) {
          throw ApiError.badRequest('Достигнут лимит активных таймслотов (30)');
        }
      }

      const updated = await triggerService.toggleTrigger(
        req.user!.id,
        triggerId,
      );
      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/v1/triggers
 * Delete a trigger
 */
router.delete(
  '/',
  authenticate,
  [body('triggerId').isUUID().withMessage('Неверный ID триггера')],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { triggerId } = req.body;

      await triggerService.deleteTrigger(req.user!.id, triggerId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
