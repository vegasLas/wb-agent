/**
 * Suppliers Routes
 * Migrated from deprecated project server/api/v1/suppliers/
 * Handles supplier-related endpoints with multi-account support
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { wbSupplierService } from '../services/wb-supplier.service';
import { accountService } from '../services/account.service';
import { userService } from '../services/user.service';
import { ApiError } from '../utils/errors';
import { convertWarehouseName } from '../utils/warehouseNames';
import { logger } from '../utils/logger';
import { GoodBalance } from '../types/wb';
import { prisma } from '../config/database';

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
  query('supplierId').optional().isString(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { accountId, supplierId: querySupplierId } = req.query;

      let account;
      let supplierId: string;

      if (querySupplierId) {
        // If supplierId provided, find account containing this supplier
        account = await accountService.findAccountBySupplierId(
          req.user!.id,
          querySupplierId as string
        );

        if (!account) {
          throw new ApiError(400, 'Supplier not found in any of your accounts');
        }

        supplierId = querySupplierId as string;
      } else if (accountId) {
        // Use provided accountId
        account = await getValidatedAccount(req.user!.id, accountId as string);
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
          req.user!.id
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

      const response = await wbSupplierService.getBalancesByAccount({
        accountId: account.id,
        supplierId,
        params: { limit: 1000, offset: 0 },
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      if (!response.data?.table?.data) {
        logger.warn('No data found in balances response');
        return res.json({
          success: true,
          data: {},
        });
      }

      const headerFront = response.data.table.headerFront;
      if (!headerFront) {
        return res.json({
          success: true,
          data: {},
        });
      }

      // Get warehouse names from the second header row, starting from index 6
      // Skip first 6 columns: brand, subject, supplierArticle, transitToClient, transitFromClient, totalInWarehouses
      const warehouseNames = headerFront[1]?.cells
        ?.slice(6)
        .map((cell) => cell.value);

      if (!warehouseNames) {
        return res.json({
          success: true,
          data: {},
        });
      }

      // Convert English warehouse names to Russian for proper mapping
      const russianWarehouseNames = warehouseNames.map((name) =>
        convertWarehouseName(name)
      );

      // Process data rows to extract balances by warehouse
      const balancesByWarehouse: Record<number, GoodBalance[]> = {};

      // Build warehouse ID mapping from account suppliers data
      const warehouseMapping = new Map<string, number>();
      
      response.data.table.data.forEach((row) => {
        if (row.length < 6) return; // Skip incomplete rows

        const [
          brand,
          subject,
          supplierArticle,
          , // quantityInTransitToClient
          , // quantityInTransitFromClient
          , // totalInWarehouses
          ...warehouseQuantities
        ] = row;

        // Skip rows with empty essential data
        if (!brand || !subject || !supplierArticle) return;

        russianWarehouseNames.forEach((russianWarehouseName, index) => {
          const quantityStr = warehouseQuantities[index] || '0';
          const quantity = parseInt(quantityStr) || 0;

          if (quantity > 0) {
            // Use warehouse name hash as ID if not in mapping yet
            // This is a temporary solution until warehouse cache is implemented
            if (!warehouseMapping.has(russianWarehouseName)) {
              warehouseMapping.set(
                russianWarehouseName,
                Math.abs(
                  russianWarehouseName.split('').reduce((acc, char) => {
                    return acc + char.charCodeAt(0);
                  }, 0)
                )
              );
            }

            const warehouseId = warehouseMapping.get(russianWarehouseName)!;

            if (!balancesByWarehouse[warehouseId]) {
              balancesByWarehouse[warehouseId] = [];
            }

            balancesByWarehouse[warehouseId].push({
              goodName: supplierArticle,
              brand: brand || '',
              subject: subject || '',
              supplierArticle: supplierArticle || '',
              quantity,
            });
          }
        });
      });

      res.json({
        success: true,
        data: balancesByWarehouse,
      });
    } catch (error) {
      logger.error('Failed to get balances:', error);
      next(error);
    }
  }
);

/**
 * POST /api/v1/suppliers/drafts/list
 * List drafts for the selected account
 */
router.post(
  '/drafts/list',
  authenticate,
  body('accountId').optional().isUUID(),
  body('supplierId').optional().isString(),
  body('limit').optional().isInt(),
  body('offset').optional().isInt(),
  body('orderBy').optional().isObject(),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        accountId: bodyAccountId,
        supplierId: bodySupplierId,
        limit,
        offset,
        orderBy,
      } = req.body;

      let account;
      let supplierId: string;
      let targetAccountId: string;

      const user = await userService.findById(req.user!.id);

      if (bodySupplierId) {
        // Find account containing this supplier
        const targetSupplier = await prisma.supplier.findFirst({
          where: {
            supplierId: bodySupplierId,
            account: {
              userId: req.user!.id,
            },
          },
          include: { account: true },
        });

        if (!targetSupplier) {
          throw new ApiError(
            400,
            'Specified supplier not found or not accessible'
          );
        }

        targetAccountId = targetSupplier.account.id;
        supplierId = bodySupplierId;
      } else if (bodyAccountId) {
        targetAccountId = bodyAccountId;
        account = await getValidatedAccount(req.user!.id, bodyAccountId);
        supplierId =
          account.selectedSupplierId || account.suppliers[0]?.supplierId;

        if (!supplierId) {
          throw new ApiError(400, 'No supplier found for account');
        }
      } else {
        // Use selectedAccountId
        if (!user?.selectedAccountId) {
          throw new ApiError(400, 'No account selected for user');
        }

        targetAccountId = user.selectedAccountId;
        account = await accountService.getAccountById(
          targetAccountId,
          req.user!.id
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

      const result = await wbSupplierService.listDraftsByAccount({
        accountId: targetAccountId,
        supplierId,
        params: { limit, offset, orderBy },
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      res.json({
        success: true,
        data: result.result.drafts,
      });
    } catch (error) {
      logger.error('Failed to list drafts:', error);
      next(error);
    }
  }
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
  async (req: AuthenticatedRequest, res, next) => {
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
          bodySupplierId
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
          req.user!.id
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

      res.json({
        success: true,
        data: result.result.goods,
      });
    } catch (error) {
      logger.error('Failed to list goods:', error);
      next(error);
    }
  }
);

export default router;
