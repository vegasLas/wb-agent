import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '@/services';
import { userService } from '@/services';
import { authenticate } from '@/middleware/auth.middleware';
import { sendLogoutNotification } from '@/utils/TBOT';
import { ApiError } from '@/utils/errors';

const router = Router();

// POST /api/v1/auth/verify-phone
// Requires subscription (checked in auth middleware)
router.post(
  '/verify-phone',
  authenticate,
  body('phoneNumber')
    .matches(/^\+\d{10,15}$/)
    .withMessage(
      'Invalid phone number format. Please use international format (+1234567890)',
    ),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { phoneNumber } = req.body;
      const userId = req.user!.id;

      const result = await authService.verifyPhone({
        userId,
        phoneNumber,
      });

      if (!result.success) {
        throw ApiError.badRequest(
          result.error?.message || 'Phone verification failed',
        );
      }

      res.json({
        success: true,
        sessionId: result.sessionId,
        requiresSMSCode: result.requiresSMSCode,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/verify-sms
router.post(
  '/verify-sms',
  body('smsCode').isLength({ min: 6, max: 6 }).isNumeric(),
  body('sessionId').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { smsCode, sessionId } = req.body;

      const result = await authService.verifySMS({
        smsCode,
        sessionId,
      });

      if (!result.success) {
        throw ApiError.badRequest(
          result.error?.message || 'SMS verification failed',
        );
      }

      res.json({
        success: true,
        sessionId: result.sessionId,
        requiresTwoFactor: result.requiresTwoFactor,
        supplierName: result.supplierName,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/verify-two-factor
router.post(
  '/verify-two-factor',
  body('twoFactorCode').isLength({ min: 6, max: 6 }).isNumeric(),
  body('sessionId').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { twoFactorCode, sessionId } = req.body;

      const result = await authService.verifyTwoFactor({
        twoFactorCode,
        sessionId,
      });

      if (!result.success) {
        throw ApiError.badRequest(
          result.error?.message || 'Two-factor verification failed',
        );
      }

      res.json({
        success: true,
        supplierName: result.supplierName,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/cancel
router.post('/cancel', async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      await authService.cancelAuth(sessionId);
    }

    res.json({ success: true, message: 'Authentication session cancelled' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { accountId } = req.body;

    if (accountId) {
      // Logout specific account
      await userService.logoutAccount(req.user!.id, accountId);
    } else {
      // Logout all accounts
      await userService.logoutWb(BigInt(req.user!.telegramId));

      // Send Telegram notification
      const user = await userService.findByIdWithChatId(req.user!.id);
      if (user?.chatId) {
        await sendLogoutNotification(user.chatId);
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
