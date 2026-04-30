import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '@/middleware/auth.middleware';
import { userService } from '@/services/user/';
import { prisma } from '@/config/database';
import {
  AUTOBOOKING_SLOTS,
  RESCHEDULE_SLOTS,
  FEEDBACK_QUOTA,
  AI_CHAT_BUDGET_USD,
} from '@/constants/payments';
import { getBillingPeriodStart } from '@/utils/subscription';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserRoutes');

const router = Router();

// GET /api/v1/user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await userService.findById(req.user!.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const currentSub = user.subscriptions?.[0];
    const now = new Date();
    const isTrialActive = !!(
      user.trialUsedAt &&
      currentSub?.tier === 'LITE' &&
      currentSub?.endedAt &&
      currentSub.endedAt > now &&
      currentSub.endedAt.getTime() <= user.trialUsedAt.getTime() + 15 * 24 * 60 * 60 * 1000
    );

    res.json({
      id: user.id,
      name: user.profile?.name,
      subscriptionTier: currentSub?.tier ?? 'FREE',
      subscriptionExpiresAt: currentSub?.endedAt ?? null,
      maxAccounts: user.maxAccounts,
      trialUsedAt: user.trialUsedAt ?? null,
      isTrial: isTrialActive,
      trialExpiresAt: isTrialActive ? currentSub!.endedAt.toISOString() : null,
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
      hasMpstatsToken: !!user.mpstatsToken,

      accounts: (user.accounts || []).map(
        (account: {
          id: string;
          phoneWb: string | null;
          selectedSupplierId: string | null;
          suppliers: {
            supplierId: string;
            supplierName: string;
            permissions: string[];
          }[];
          createdAt: Date;
          updatedAt: Date;
        }) => ({
          id: account.id,
          phoneWb: account.phoneWb || undefined,
          selectedSupplierId: account.selectedSupplierId || undefined,
          suppliers: (account.suppliers || []).map(
            (supplier: {
              supplierId: string;
              supplierName: string;
              permissions: string[];
            }) => ({
              supplierId: supplier.supplierId,
              supplierName: supplier.supplierName,
              permissions: supplier.permissions || [],
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

// GET /api/v1/user/limits - Return current tier limits
router.get('/limits', authenticate, async (req, res, next) => {
  try {
    const user = await userService.findById(req.user!.id);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const currentSub = user.subscriptions?.[0];
    const tier = currentSub?.tier ?? 'FREE';

    const periodStart = await getBillingPeriodStart(user.id);

    // Compute AI chat budget reset date
    const now = new Date();
    let aiChatResetDate: Date;
    if (currentSub && currentSub.endedAt && currentSub.endedAt > now) {
      aiChatResetDate = currentSub.endedAt;
    } else {
      aiChatResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Count active autobooking slots
    const activeAutobookings = await prisma.autobooking.count({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    });

    const activeReschedules = await prisma.autobookingReschedule.count({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    });

    // Count monthly feedback AI replies
    const feedbackRepliesThisMonth = await prisma.feedbackAutoAnswer.count({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart },
        status: { in: ['PENDING', 'POSTED'] },
      },
    });

    // Sum AI chat usage
    const aiChatSpentResult = await prisma.aiUsageLog.aggregate({
      _sum: { cost: true },
      where: {
        userId: user.id,
        feature: 'ai_chat',
        createdAt: { gte: periodStart },
      },
    });
    const aiChatSpentUsd = aiChatSpentResult._sum.cost ?? 0;

    logger.info(
      `[USER-LIMITS] User ${user.id} | Tier: ${tier} | AI Chat Spent: $${Math.round(aiChatSpentUsd * 1000) / 1000} / $${AI_CHAT_BUDGET_USD[tier]} | Reset: ${aiChatResetDate.toISOString()}`,
    );

    res.json({
      tier,
      subscriptionExpiresAt: currentSub?.endedAt ?? null,
      maxAccounts: user.maxAccounts,
      autobookingSlots: {
        used: activeAutobookings,
        max: AUTOBOOKING_SLOTS[tier],
      },
      rescheduleSlots: {
        used: activeReschedules,
        max: RESCHEDULE_SLOTS[tier],
      },
      feedbackQuota: {
        used: feedbackRepliesThisMonth,
        max: FEEDBACK_QUOTA[tier] === Infinity ? null : FEEDBACK_QUOTA[tier],
      },
      aiChatBudget: {
        spent: Math.round(aiChatSpentUsd * 1000) / 1000,
        max: AI_CHAT_BUDGET_USD[tier],
        resetDate: aiChatResetDate.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
