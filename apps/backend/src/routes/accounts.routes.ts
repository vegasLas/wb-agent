import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import axios from 'axios';
import { authenticate } from '../middleware/auth.middleware';
import { accountService } from '../services';
import { userService } from '../services';
import { supplierApiKeyService } from '../services';
import { ApiError } from '../utils/errors';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/v1/accounts - List all accounts for the user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const accounts = await accountService.getUserAccounts(req.user!.id);

    res.json({
      success: true,
      accounts: accounts.map(
        (account: {
          id: string;
          phoneWb: string | null;
          selectedSupplierId: string | null;
          suppliers?: { supplierId: string; supplierName: string }[];
          createdAt: Date;
          updatedAt: Date;
        }) => ({
          id: account.id,
          phoneWb: account.phoneWb || undefined,
          selectedSupplierId: account.selectedSupplierId || undefined,
          suppliers: account.suppliers?.map(
            (s: { supplierId: string; supplierName: string }) => ({
              supplierId: s.supplierId,
              supplierName: s.supplierName,
            }),
          ),
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        }),
      ),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/accounts/:id - Get a single account by ID
router.get(
  '/:id',
  authenticate,
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const id = req.params.id as string;
      const account = await accountService.getAccountById(id, req.user!.id);

      if (!account) {
        throw ApiError.notFound('Account not found');
      }

      res.json({
        success: true,
        account: {
          id: account.id,
          phoneWb: account.phoneWb || undefined,
          selectedSupplierId: account.selectedSupplierId || undefined,
          suppliers: account.suppliers?.map(
            (s: { supplierId: string; supplierName: string }) => ({
              supplierId: s.supplierId,
              supplierName: s.supplierName,
            }),
          ),
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/v1/accounts/:id - Delete an account
router.delete(
  '/:id',
  authenticate,
  param('id').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const id = req.params.id as string;

      await accountService.deleteAccount(id, req.user!.id);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        next(ApiError.notFound('Account not found'));
        return;
      }
      next(error);
    }
  },
);

// PATCH /api/v1/accounts/supplier - Update selected supplier for an account
router.patch(
  '/supplier',
  authenticate,
  body('accountId').isUUID().withMessage('Valid account ID is required'),
  body('supplierId').notEmpty().withMessage('Supplier ID is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { accountId, supplierId } = req.body;

      await accountService.updateSelectedSupplier(
        accountId,
        supplierId,
        req.user!.id,
      );

      res.json({
        success: true,
        accountId,
        supplierId,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        next(
          ApiError.notFound(
            'Account not found or does not contain the specified supplier',
          ),
        );
        return;
      }
      next(error);
    }
  },
);

// GET /api/v1/accounts/:accountId/suppliers - Sync and get suppliers for an account
router.get(
  '/:accountId/suppliers',
  authenticate,
  param('accountId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const accountId = req.params.accountId as string;

      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: {
          id: accountId,
          userId: req.user!.id,
        },
      });

      if (!account) {
        throw ApiError.notFound('Account not found');
      }

      // Get user environment info for API calls
      const user = await userService.findById(req.user!.id);
      const envInfo = user?.envInfo as {
        userAgent: string;
        proxy: {
          ip: string;
          port: string;
          username: string;
          password: string;
        };
      } | null;

      if (!envInfo) {
        throw ApiError.badRequest('User environment info not available');
      }

      // Sync suppliers for the account
      await accountService.syncAccountSuppliers(
        account.id,
        envInfo.userAgent,
        envInfo.proxy,
      );

      // Get updated account with suppliers
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
        include: { suppliers: true },
      });

      res.json({
        success: true,
        suppliers: updatedAccount?.suppliers || [],
      });
    } catch (error) {
      logger.error('Error syncing account suppliers:', error);
      next(error);
    }
  },
);

// POST /api/v1/accounts/:accountId/suppliers/sync - Explicitly sync suppliers
router.post(
  '/:accountId/suppliers/sync',
  authenticate,
  param('accountId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const accountId = req.params.accountId as string;

      // Verify account belongs to user
      const account = await prisma.account.findFirst({
        where: {
          id: accountId,
          userId: req.user!.id,
        },
      });

      if (!account) {
        throw ApiError.notFound('Account not found');
      }

      // Get user environment info for API calls
      const user = await userService.findById(req.user!.id);
      const envInfo = user?.envInfo as {
        userAgent: string;
        proxy: {
          ip: string;
          port: string;
          username: string;
          password: string;
        };
      } | null;

      if (!envInfo) {
        throw ApiError.badRequest('User environment info not available');
      }

      // Sync suppliers for the account
      await accountService.syncAccountSuppliers(
        account.id,
        envInfo.userAgent,
        envInfo.proxy,
      );

      // Get updated account with suppliers
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
        include: { suppliers: true },
      });

      res.json({
        success: true,
        message: 'Suppliers synced successfully',
        suppliers: updatedAccount?.suppliers || [],
      });
    } catch (error) {
      logger.error('Error syncing account suppliers:', error);
      next(error);
    }
  },
);

// ==========================================
// Supplier API Key Routes
// ==========================================

// GET /api/v1/accounts/api-key - Get user's API key (without decrypting)
router.get('/api-key', authenticate, async (req, res, next) => {
  try {
    const apiKey = await supplierApiKeyService.findByUserId(req.user!.id);

    if (!apiKey) {
      res.json({
        success: true,
        hasApiKey: false,
      });
      return;
    }

    res.json({
      success: true,
      hasApiKey: true,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/accounts/api-key - Create or update API key
router.post(
  '/api-key',
  authenticate,
  body('apiKey')
    .notEmpty()
    .withMessage('API key is required')
    .isLength({ min: 10 })
    .withMessage('API key must be at least 10 characters long'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { apiKey } = req.body;

      // Validate API key by making a test request to WB API
      try {
        await axios.get(
          'https://common-api.wildberries.ru/api/tariffs/v1/acceptance/coefficients',
          {
            headers: {
              Authorization: apiKey,
            },
            timeout: 10000,
          },
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {
            throw ApiError.badRequest(
              'Invalid API key. Please check your API key and try again.',
            );
          }
        }
        throw ApiError.badRequest(
          'Failed to validate API key. Please check your API key and try again.',
        );
      }

      const result = await supplierApiKeyService.upsert(req.user!.id, {
        apiKey,
      });

      res.json({
        success: true,
        message: 'API key saved successfully',
        data: {
          isExistAPIKey: true,
          isActive: result.isActive,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /api/v1/accounts/api-key - Update API key status
router.patch(
  '/api-key',
  authenticate,
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { isActive } = req.body;

      const result = await supplierApiKeyService.update(req.user!.id, {
        isActive,
      });

      res.json({
        success: true,
        message: `API key ${isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: result.isActive,
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/v1/accounts/api-key - Delete API key
router.delete('/api-key', authenticate, async (req, res, next) => {
  try {
    await supplierApiKeyService.delete(req.user!.id);

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
