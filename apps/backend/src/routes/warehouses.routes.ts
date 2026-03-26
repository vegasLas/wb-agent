/**
 * Warehouse Routes
 * Migrated from deprecated project server/api/v1/warehouses/
 * Handles warehouse-related endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { wbWarehouseService } from '../services/wb-warehouse.service';
import { wbSupplierService } from '../services/wb-supplier.service';
import { accountService } from '../services/account.service';
import { userService } from '../services/user.service';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { UserEnvInfo } from '../types/wb';

const router = Router();

// Cache configuration
const CACHE_KEY = 'warehouses';
const CACHE_DURATION = 14 * 24 * 60 * 60 * 1000; // 14 days

// In-memory cache (in production, use Redis or similar)
const cache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Helper to get user environment info
 */
async function getUserEnvInfo(userId: number): Promise<UserEnvInfo> {
  const user = await userService.findById(userId);
  const envInfo = user?.envInfo as unknown as UserEnvInfo | undefined;
  if (!envInfo?.userAgent) {
    throw new ApiError(400, 'User environment info not available');
  }
  return envInfo;
}

/**
 * Helper to get and validate account
 */
async function getValidatedAccount(userId: number, accountId: string) {
  const account = await accountService.getAccountById(accountId, userId);
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  return account;
}

/**
 * Helper to get supplier ID from account
 */
function getSupplierId(account: {
  selectedSupplierId: string | null;
  suppliers: { supplierId: string }[];
}): string {
  const supplierId =
    account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) {
    throw new ApiError(400, 'No supplier found for account');
  }
  return supplierId;
}

/**
 * GET /api/v1/warehouses
 * Get all warehouses list with caching
 */
router.get(
  '/',
  authenticate,
  query('accountId').isUUID().withMessage('Valid account ID is required'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { accountId } = req.query as { accountId: string };

      // Check cache first
      const cachedData = cache.get(CACHE_KEY);
      if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        res.json({
          success: true,
          data: cachedData.data,
          cached: true,
        });
        return;
      }

      const account = await getValidatedAccount(req.user!.id, accountId);
      const envInfo = await getUserEnvInfo(req.user!.id);
      const supplierId = getSupplierId(account);

      const warehousesResponse = await wbWarehouseService
        .getAllWarehousesByAccount({
          accountId: account.id,
          supplierId,
          userAgent: envInfo.userAgent,
          proxy: envInfo.proxy,
        })
        .catch((error: unknown) => {
          logger.error('Warehouse fetch error:', error);
          const errorMessage = (error as Error).message || '';

          if (errorMessage.includes('Rate limit')) {
            throw new ApiError(
              429,
              'Rate limit exceeded. Please try again later.',
            );
          }
          if (
            errorMessage.includes('SSL') ||
            errorMessage.includes('ECONNREFUSED')
          ) {
            throw new ApiError(
              503,
              'Unable to securely connect to the warehouse service',
            );
          }
          throw new ApiError(
            503,
            'Service Unavailable',
            'WAREHOUSE_SERVICE_ERROR',
          );
        });

      if (!warehousesResponse?.result?.resp?.data) {
        throw new ApiError(404, 'No warehouses data available');
      }

      // Transform the response to match the Warehouse interface
      const warehouses = warehousesResponse.result.resp.data.map(
        (warehouse) => ({
          ID: warehouse.origid,
          name: warehouse.warehouse,
          address: warehouse.address,
          workTime: warehouse.workTime,
          acceptsQr: warehouse.isAcceptsQRScan,
        }),
      );

      // Store in cache
      cache.set(CACHE_KEY, { data: warehouses, timestamp: Date.now() });

      res.json({
        success: true,
        data: warehouses,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/warehouses/transits
 * Get transit offices for a warehouse
 */
router.post(
  '/transits',
  authenticate,
  body('accountId').isUUID().withMessage('Valid account ID is required'),
  body('warehouseId')
    .isInt({ min: 1 })
    .withMessage('Valid warehouse ID is required'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { accountId, warehouseId } = req.body as {
        accountId: string;
        warehouseId: number;
      };

      const account = await getValidatedAccount(req.user!.id, accountId);
      const envInfo = await getUserEnvInfo(req.user!.id);
      const supplierId = getSupplierId(account);

      const transitions = await wbWarehouseService.getTransitionsByAccount({
        accountId: account.id,
        supplierId,
        warehouseId,
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      res.json({
        success: true,
        data: transitions.result?.items || [],
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/warehouses/validate
 * Validate warehouse goods for a draft
 */
router.post(
  '/validate',
  authenticate,
  body('accountId').isUUID().withMessage('Valid account ID is required'),
  body('draftID').notEmpty().withMessage('Draft ID is required'),
  body('warehouseId')
    .isInt({ min: 1 })
    .withMessage('Valid warehouse ID is required'),
  body('transitWarehouseId')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Transit warehouse ID must be a number'),
  body('supplierId')
    .optional()
    .isString()
    .withMessage('Supplier ID must be a string'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const {
        accountId,
        draftID,
        warehouseId,
        transitWarehouseId,
        supplierId: bodySupplierId,
      } = req.body as {
        accountId: string;
        draftID: string;
        warehouseId: number;
        transitWarehouseId?: number | null;
        supplierId?: string;
      };

      // Get base account
      const account = await getValidatedAccount(req.user!.id, accountId);
      const envInfo = await getUserEnvInfo(req.user!.id);

      // Determine target supplier and account
      let targetSupplierId =
        bodySupplierId ||
        account.selectedSupplierId ||
        account.suppliers[0]?.supplierId;
      let targetAccountId = account.id;

      // If supplierId is provided and different from account's supplier, find the correct account
      if (
        bodySupplierId &&
        bodySupplierId !==
          (account.selectedSupplierId || account.suppliers[0]?.supplierId)
      ) {
        // Find the account that contains this supplierId and ensure user owns it
        const targetAccount = await accountService.findAccountBySupplierId(
          req.user!.id,
          bodySupplierId,
        );

        if (!targetAccount) {
          throw new ApiError(
            400,
            'Specified supplier not found or not accessible',
          );
        }

        targetAccountId = targetAccount.id;
        targetSupplierId = bodySupplierId;
      }

      if (!targetSupplierId) {
        throw new ApiError(400, 'No supplier found for account');
      }

      const result = await wbSupplierService.validateWarehouseGoodsV2ByAccount({
        accountId: targetAccountId,
        supplierId: targetSupplierId,
        params: {
          draftID,
          warehouseId,
          transitWarehouseId: transitWarehouseId || null,
        },
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Handle specific error cases
      const errorMessage = (error as Error).message || '';

      if (errorMessage === 'Неактивный склад') {
        next(new ApiError(400, 'Inactive warehouse', 'INACTIVE_WAREHOUSE'));
        return;
      }

      if (errorMessage.includes('Rate limit')) {
        next(new ApiError(429, 'Rate limit exceeded'));
        return;
      }

      next(error);
    }
  },
);

/**
 * GET /api/v1/warehouses/cache/status
 * Get warehouse cache status (admin/debug endpoint)
 */
router.get(
  '/cache/status',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cachedData = cache.get(CACHE_KEY);

      res.json({
        success: true,
        data: {
          hasCache: !!cachedData,
          cacheAge: cachedData ? Date.now() - cachedData.timestamp : null,
          cacheExpiry: cachedData
            ? cachedData.timestamp + CACHE_DURATION
            : null,
          warehouseCount: cachedData
            ? (cachedData.data as unknown[]).length
            : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/warehouses/cache/clear
 * Clear warehouse cache (admin/debug endpoint)
 */
router.post(
  '/cache/clear',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      cache.delete(CACHE_KEY);

      res.json({
        success: true,
        message: 'Warehouse cache cleared',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
