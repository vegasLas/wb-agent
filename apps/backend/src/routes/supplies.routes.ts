/**
 * Supplies Routes
 * Migrated from deprecated project server/api/v1/supplies/*.ts
 * Handles all supply-related endpoints with multi-account support
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import {
  authenticate,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { wbSupplierService } from '../services';
import { accountService } from '../services';
import { userService } from '../services';
import { ApiError } from '../utils/errors';
import { prisma } from '../config/database';
import type { UserEnvInfo } from '../types/wb';

const router = Router();

/**
 * Helper to get validated account for user
 */
async function getValidatedAccount(userId: number, accountId: string) {
  const account = await accountService.getAccountById(accountId, userId);
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  return account;
}

/**
 * Helper to get user environment info
 */
async function getUserEnvInfo(userId: number): Promise<UserEnvInfo> {
  const user = await userService.findById(userId);
  const envInfo = user?.envInfo as unknown as UserEnvInfo | null | undefined;
  if (!envInfo?.userAgent) {
    throw new ApiError(400, 'User environment info not available');
  }
  return envInfo;
}

// POST /api/v1/supplies/list
// List supplies for an account
router.post(
  '/list',
  authenticate,
  [
    body('accountId').isUUID().withMessage('Valid account ID is required'),
    body('supplierId').notEmpty().withMessage('Supplier ID is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const { accountId, supplierId } = req.body;

      // Validate account belongs to user and contains the supplier
      const account = await getValidatedAccount(user.id, accountId);

      // Verify the supplier belongs to this account
      const supplierExists = account.suppliers.some(
        (s: { supplierId: string }) => s.supplierId === supplierId,
      );

      if (!supplierExists) {
        throw new ApiError(400, 'Supplier not found in the specified account');
      }

      const envInfo = await getUserEnvInfo(user.id);

      const result = await wbSupplierService.listSuppliesByAccount({
        accountId,
        supplierId,
        params: {
          pageNumber: 1,
          pageSize: 100, // Adjust as needed
          sortBy: 'createdAt',
          sortDirection: 'DESC',
          statusId: -2, // -2 means "Все статусы" (All statuses) to get all supplies
        },
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      // Filter supplies with statusId 1 and 3 only
      const filteredSupplies = result.result.data;

      res.json({
        success: true,
        data: filteredSupplies,
        totalCount: filteredSupplies.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/v1/supplies/supply-details
// Get details for a specific supply
router.get(
  '/supply-details',
  authenticate,
  [query('supplyId').isNumeric().withMessage('Valid supplyId is required')],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as AuthenticatedRequest).user!;

      // Get account using selectedAccountId from user
      if (!user.selectedAccountId) {
        throw new ApiError(400, 'No account selected for user');
      }

      const account = await prisma.account.findUnique({
        where: { id: user.selectedAccountId },
        include: { suppliers: true },
      });

      if (!account) {
        throw new ApiError(400, 'Selected account not found');
      }

      const supplierId =
        account.selectedSupplierId || account.suppliers[0]?.supplierId;

      if (!supplierId) {
        throw new ApiError(400, 'No supplier found for account');
      }

      const supplyId = req.query.supplyId as string;

      if (!supplyId || isNaN(Number(supplyId))) {
        throw new ApiError(400, 'Valid supplyId is required');
      }

      const envInfo = await getUserEnvInfo(user.id);

      const response = await wbSupplierService.getSupplyDetailsByAccount({
        accountId: account.id,
        supplierId,
        params: {
          pageNumber: 1,
          pageSize: 100, // Get more items to show all goods
          preorderID: null,
          search: '',
          supplyID: Number(supplyId),
        },
        userAgent: envInfo.userAgent,
        proxy: envInfo.proxy,
      });

      // Check if supply was removed/not found
      if (!response || !response.result || !response.result.supply) {
        res.json({
          success: false,
          error: 'SUPPLY_REMOVED',
          data: {
            supply: null,
            goods: [],
            totalCount: 0,
          },
        });
        return;
      }

      // Extract only the goods data that we need for the UI
      const goods = response.result.data.map(
        (item: {
          imgSrc?: string;
          imtName?: string;
          quantity?: number;
          barcode?: string;
          brandName?: string;
          subjectName?: string;
          colorName?: string;
        }) => ({
          imgSrc: item.imgSrc,
          imtName: item.imtName,
          quantity: item.quantity,
          barcode: item.barcode,
          brandName: item.brandName,
          subjectName: item.subjectName,
          colorName: item.colorName,
        }),
      );

      res.json({
        success: true,
        data: {
          supply: response.result.supply,
          goods,
          totalCount: response.result.totalCount,
        },
      });
    } catch (error: unknown) {
      const err = error as { message?: string; status?: number };
      // Handle specific supply removal errors
      if (
        err.message === 'SUPPLY_REMOVED' ||
        err.status === 404 ||
        (typeof err.message === 'string' &&
          (err.message.includes('not found') ||
            err.message.includes('removed') ||
            err.message.includes('deleted') ||
            err.message.includes('не найден') ||
            err.message.includes('удалена')))
      ) {
        res.json({
          success: false,
          error: 'SUPPLY_REMOVED',
          data: {
            supply: null,
            goods: [],
            totalCount: 0,
          },
        });
        return;
      }

      // For other errors, pass to error handler
      next(error);
    }
  },
);

export default router;
