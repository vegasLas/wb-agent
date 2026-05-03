/**
 * Suppliers Routes
 * Migrated from deprecated project server/api/v1/suppliers/
 * Handles supplier-related endpoints with multi-account support
 */

import { Router, RequestHandler, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import {
  authenticate,
  AuthenticatedRequest,
} from '@/middleware/auth.middleware';
import {
  wbStatisticsOfficialService,
  mapWarehouseRemainsToBalancesByWarehouse,
  resolveOfficialSupplierId,
} from '@/services/external/wb/official';
import { wbSupplierService } from '@/services/external/wb/wb-supplier.service';
import { accountService, userService } from '@/services/user/';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { Warehouse } from '@/types/wb';
import { cacheService } from '@/services/infrastructure';

const router = Router();

// Helper to get account and validate
async function getValidatedAccount(userId: number, accountId: string) {
  const account = await accountService.getAccountById(accountId, userId);
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  return account;
}

// Helper to get user env info
async function getUserEnvInfo(userId: number) {
  const user = await userService.findById(userId);
  const envInfo = user?.envInfo as unknown as {
    userAgent: string;
    proxy?: {
      ip: string;
      port: string;
      username: string;
      password: string;
    };
  } | null;
  if (!envInfo?.userAgent) {
    throw new ApiError(400, 'User environment info not available');
  }
  return envInfo;
}

/**
 * GET /api/v1/suppliers/balances
 * Get warehouse balances for the selected account
 */
router.get(
  '/balances',
  authenticate,
  query('accountId').optional().isUUID(),
  (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const officialSupplierId = await resolveOfficialSupplierId(
        req.user!.id,
        'ANALYTICS',
      );

      if (!officialSupplierId) {
        throw new ApiError(
          400,
          'No official Analytics API key configured for this account',
        );
      }

      const items = await wbStatisticsOfficialService.getBalances({
        supplierId: officialSupplierId,
      });

      // Get cached warehouses for name to ID mapping
      const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
      const warehouses = cacheService.get<Warehouse[]>(
        'warehouses',
        CACHE_DURATION,
      );
      if (!warehouses) {
        throw new ApiError(
          503,
          'Warehouse data not available. Please refresh warehouses first.',
        );
      }

      const balancesArray = mapWarehouseRemainsToBalancesByWarehouse(
        items,
        warehouses,
      );

      return res.json(balancesArray);
    } catch (error) {
      logger.error('Failed to get balances:', error);
      next(error);
    }
  }) as RequestHandler,
);

/**
 * POST /api/v1/suppliers/drafts/list
 * List drafts for the selected account
 */
router.post(
  '/drafts/list',
  authenticate,
  body('accountId').isUUID().withMessage('Valid account ID is required'),
  body('supplierId').notEmpty().withMessage('Supplier ID is required'),
  body('limit').optional().isInt(),
  body('offset').optional().isInt(),
  body('orderBy').optional().isObject(),
  (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { accountId, supplierId, limit, offset, orderBy } = req.body;

      // Validate account belongs to user and contains the supplier
      const account = await getValidatedAccount(req.user!.id, accountId);

      // Verify the supplier belongs to this account
      const supplierExists = account.suppliers.some(
        (s) => s.supplierId === supplierId,
      );

      if (!supplierExists) {
        throw new ApiError(400, 'Supplier not found in the specified account');
      }

      const envInfo = await getUserEnvInfo(req.user!.id);

      const result = await wbSupplierService.listDraftsByAccount({
        accountId,
        supplierId,
        params: { limit, offset, orderBy },
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      // Transform WB API drafts to simplified format for frontend
      const drafts = result.result.drafts.map((draft) => ({
        id: draft.ID,
        supplierId: draft.supplierID,
        goodQuantity: draft.goodQuantity,
        barcodeQuantity: draft.barcodeQuantity,
        createdAt: draft.createdAt,
      }));

      return res.json({
        success: true,
        data: drafts,
      });
    } catch (error) {
      logger.error('Failed to list drafts:', error);
      next(error);
    }
  }) as RequestHandler,
);

/**
 * POST /api/v1/suppliers/goods/draft
 * List goods for a specific draft
 */
router.post(
  '/goods/draft',
  authenticate,
  body('accountId').optional().isUUID(),
  body('supplierId').optional().isString(),
  body('draftID').notEmpty(),
  body('search').optional().isString(),
  body('brands').optional().isArray(),
  body('subjects').optional().isArray(),
  body('limit').optional().isInt(),
  body('offset').optional().isInt(),
  (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        accountId: bodyAccountId,
        supplierId: bodySupplierId,
        draftID,
        search,
        brands,
        subjects,
        limit,
        offset,
      } = req.body;

      let account;
      let supplierId: string;

      if (bodySupplierId) {
        // Find account containing this supplier
        account = await accountService.findAccountBySupplierId(
          req.user!.id,
          bodySupplierId,
        );

        if (!account) {
          throw new ApiError(400, 'Supplier not found in any of your accounts');
        }

        supplierId = bodySupplierId;
      } else if (bodyAccountId) {
        account = await getValidatedAccount(req.user!.id, bodyAccountId);
        supplierId =
          account.selectedSupplierId || account.suppliers[0]?.supplierId;

        if (!supplierId) {
          throw new ApiError(400, 'No supplier found for account');
        }
      } else {
        // Use selectedAccountId if no supplierId provided
        const user = await userService.findById(req.user!.id);
        if (!user?.selectedAccountId) {
          throw new ApiError(400, 'No account selected for user');
        }

        account = await accountService.getAccountById(
          user.selectedAccountId,
          req.user!.id,
        );

        if (!account) {
          throw new ApiError(400, 'Selected account not found');
        }

        supplierId =
          account.selectedSupplierId || account.suppliers[0]?.supplierId;

        if (!supplierId) {
          throw new ApiError(400, 'No supplier found for account');
        }
      }

      const envInfo = await getUserEnvInfo(req.user!.id);

      const result = await wbSupplierService.listGoodsByAccount({
        accountId: account.id,
        supplierId,
        params: { draftID, search, brands, subjects, limit, offset },
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      return res.json({
        success: true,
        data: result.result.goods,
      });
    } catch (error) {
      logger.error('Failed to list goods:', error);
      next(error);
    }
  }) as RequestHandler,
);

export default router;
