import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '@/middleware/auth.middleware';
import { userService } from '@/services/user.service';
import { ApiError } from '@/utils/errors';

const router = Router();

// GET /api/v1/user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await userService.findById(req.user!.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json({
      name: user.name,
      autobookingCount: user.autobookingCount,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      agreeTerms: user.agreeTerms,
      selectedAccountId: user.selectedAccountId || undefined,
      payments: (user.payments || [])
        .map(
          (payment: {
            createdAt: Date;
            amount: number;
            currency: string;
            status: string;
            tariffId: string;
          }) => ({
            createdAt: payment.createdAt.toISOString(),
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            tariffId: payment.tariffId,
          }),
        )
        .sort(
          (a: { createdAt: string }, b: { createdAt: string }) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      supplierApiKey: user.supplierApiKey
        ? {
            isExistAPIKey: true,
            createdAt: user.supplierApiKey.createdAt.toISOString(),
            updatedAt: user.supplierApiKey.updatedAt.toISOString(),
          }
        : undefined,
      accounts: (user.accounts || []).map(
        (account: {
          id: string;
          phoneWb: string | null;
          selectedSupplierId: string | null;
          suppliers: { supplierId: string; supplierName: string }[];
          createdAt: Date;
          updatedAt: Date;
        }) => ({
          id: account.id,
          phoneWb: account.phoneWb || undefined,
          selectedSupplierId: account.selectedSupplierId || undefined,
          suppliers: (account.suppliers || []).map(
            (supplier: { supplierId: string; supplierName: string }) => ({
              supplierId: supplier.supplierId,
              supplierName: supplier.supplierName,
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

// POST /api/v1/user/update
router.post(
  '/update',
  authenticate,
  body('agreeTerms').optional().isBoolean(),
  body('selectedAccountId').optional().isString(),
  async (req, res, next) => {
    try {
      const { agreeTerms, selectedAccountId } = req.body;

      if (agreeTerms !== undefined) {
        await userService.agreeToTerms(req.user!.id);
        res.json({ success: true });
        return;
      }

      if (selectedAccountId !== undefined) {
        await userService.updateSelectedAccount(
          req.user!.id,
          selectedAccountId || null,
        );
        res.json({ success: true });
        return;
      }

      throw ApiError.badRequest('Invalid request body');
    } catch (error) {
      next(error);
    }
  },
);

export default router;
