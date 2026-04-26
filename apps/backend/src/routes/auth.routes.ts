import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '@/config/database';
import { authService, userService } from '@/services/user/';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { authenticate } from '@/middleware/auth.middleware';
import { sendLogoutNotification } from '@/utils/TBOT';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthRoutes');
const router = Router();

// POST /api/v1/auth/login - Browser login (public)
router.post(
  '/login',
  [
    body('login').trim().isLength({ min: 3 }).withMessage('Логин должен быть не менее 3 символов'),
    body('password').exists().withMessage('Пароль обязателен'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      const { login, password } = req.body;
      const result = await jwtAuthService.browserLogin(login, password);

      res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/refresh - Refresh access token using refresh token (public)
router.post(
  '/refresh',
  [
    body('refreshToken').isString().notEmpty().withMessage('Refresh token is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      const { refreshToken } = req.body;

      // Verify refresh token and get userId
      const { userId } = await jwtAuthService.verifyRefreshToken(refreshToken);

      // Rotate refresh token (revoke old, create new)
      const newRefreshToken = await jwtAuthService.rotateRefreshToken(refreshToken, userId);

      // Get user data for new access token
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          login: true,
          name: true,
          telegramId: true,
          subscriptionExpiresAt: true,
        },
      });

      if (!user || !user.login) {
        throw ApiError.unauthorized('Пользователь не найден или не имеет данных для входа');
      }

      // Check subscription
      if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= new Date()) {
        throw ApiError.forbidden('Требуется активная подписка', 'SUBSCRIPTION_REQUIRED');
      }

      // Generate new access token
      const accessToken = jwtAuthService.generateAccessToken({
        userId: user.id,
        login: user.login,
        telegramId: user.telegramId.toString(),
        authType: 'browser',
      });

      const expiresIn = jwtAuthService.getAccessTokenExpirySeconds();

      logger.info(`Token refreshed for user: ${user.login}`);

      res.json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        user: {
          id: user.id,
          login: user.login,
          name: user.name,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

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
    const { refreshToken, allDevices, accountId } = req.body;

    // Revoke refresh token(s)
    if (allDevices || !refreshToken) {
      await jwtAuthService.revokeAllUserRefreshTokens(req.user!.id);
    } else {
      await jwtAuthService.revokeRefreshToken(refreshToken);
    }

    if (accountId) {
      // Logout specific account
      await userService.logoutAccount(req.user!.id, accountId);
    } else {
      // Logout all accounts
      await userService.logoutWb(BigInt(req.user!.telegramId));

      // Send Telegram notification only for Telegram auth users
      if (req.user?.authType === 'telegram') {
        const user = await userService.findByIdWithChatId(req.user!.id);
        if (user?.chatId) {
          await sendLogoutNotification(user.chatId);
        }
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
