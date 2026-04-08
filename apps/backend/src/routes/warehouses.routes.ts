/**
 * Warehouse Routes
 * Migrated from deprecated project server/api/v1/warehouses/
 * Handles warehouse-related endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { wbWarehouseService } from '../services';
import { wbSupplierService } from '../services';
import { accountService } from '../services';
import { userService } from '../services';
import { cacheService } from '../services';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { UserEnvInfo } from '../types/wb';

const router = Router();

// Cache configuration
const CACHE_KEY = 'warehouses';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check cache first
      const cachedData = cacheService.get<unknown[]>(CACHE_KEY, CACHE_DURATION);
      if (cachedData) {
        res.json({
          success: true,
          data: cachedData,
          cached: true,
        });
        return;
      }

      // Get user's accounts
      const userAccounts = await accountService.getUserAccounts(req.user!.id);

      let account;
      let envInfo;

      if (userAccounts.length === 0) {
        // User has no accounts, find a random user with an account
        logger.info(
          `User ${req.user!.id} has no accounts, finding random user with account`,
        );
        const randomUser = await userService.findRandomUserWithAccount();
        if (!randomUser) {
          throw new ApiError(404, 'No accounts available in the system');
        }
        account = randomUser.accounts[0];
        envInfo = randomUser.envInfo as unknown as UserEnvInfo | undefined;
        logger.info(
          `Using account ${account.id} from random user ${randomUser.id}`,
        );
        if (!envInfo?.userAgent) {
          throw new ApiError(400, 'User environment info not available');
        }
      } else {
        account = userAccounts[0];
        envInfo = await getUserEnvInfo(req.user!.id);
      }

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
      cacheService.set(CACHE_KEY, warehouses);

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
  body('supplierId').notEmpty().withMessage('Supplier ID is required'),
  body('draftID').notEmpty().withMessage('Draft ID is required'),
  body('warehouseId')
    .isInt({ min: 1 })
    .withMessage('Valid warehouse ID is required'),
  body('transitWarehouseId')
    .optional({ nullable: true })
    .isInt()
    .withMessage('Transit warehouse ID must be a number'),
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
        supplierId,
        draftID,
        warehouseId,
        transitWarehouseId,
      } = req.body as {
        accountId: string;
        supplierId: string;
        draftID: string;
        warehouseId: number;
        transitWarehouseId?: number | null;
      };

      // Validate account belongs to user and contains the supplier
      const account = await getValidatedAccount(req.user!.id, accountId);
      const envInfo = await getUserEnvInfo(req.user!.id);

      // Verify the supplier belongs to this account
      const supplierExists = account.suppliers.some(
        (s) => s.supplierId === supplierId,
      );

      if (!supplierExists) {
        throw new ApiError(400, 'Supplier not found in the specified account');
      }

      const result = await wbSupplierService.validateWarehouseGoodsV2ByAccount({
        accountId,
        supplierId,
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
      const cachedData = cacheService.get<unknown[]>(CACHE_KEY, CACHE_DURATION);

      res.json({
        success: true,
        data: {
          hasCache: !!cachedData,
          warehouseCount: cachedData ? cachedData.length : 0,
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
      cacheService.delete(CACHE_KEY);

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
