import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { env } from '@/config/env';
import { prisma } from '@/config/database';
import { authService, userService } from '@/services/user/';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { emailAuthService } from '@/services/auth/email-auth.service';
import { vkAuthService } from '@/services/auth/vk-auth.service';
import { authenticate } from '@/middleware/auth.middleware';
import { sendLogoutNotification } from '@/utils/TBOT';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthRoutes');
const router = Router();

// Rate limiters for public auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Слишком много попыток. Пожалуйста, попробуйте позже.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Слишком много попыток. Пожалуйста, попробуйте позже.',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});

// POST /api/v1/auth/register - Register with email (public)
router.post(
  '/register',
  strictAuthLimiter,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Имя должно быть не менее 2 символов'),
    body('email').isEmail().normalizeEmail().withMessage('Неверный формат email'),
    body('password').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      const { name, email, password } = req.body;
      const result = await emailAuthService.register({ name, email, password });

      res.status(201).json({
        success: true,
        message: 'Регистрация успешна. Проверьте email для подтверждения.',
        userId: result.userId,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/verify-email - Verify email (public)
router.post(
  '/verify-email',
  [
    body('token').isString().notEmpty().withMessage('Токен обязателен'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      await emailAuthService.verifyEmail(req.body.token);

      res.json({
        success: true,
        message: 'Email успешно подтвержден. Теперь вы можете войти.',
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/resend-verification - Resend verification email (public)
router.post(
  '/resend-verification',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Неверный формат email'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      const normalizedEmail = req.body.email.toLowerCase().trim();
      const identity = await prisma.userIdentity.findUnique({
        where: { provider_email: { provider: 'EMAIL', email: normalizedEmail } },
      });

      if (identity && !identity.emailVerifiedAt) {
        await emailAuthService.sendVerificationEmail(identity.id, normalizedEmail);
      }

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'Если пользователь существует, письмо отправлено.',
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/forgot-password - Request password reset (public)
router.post(
  '/forgot-password',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Неверный формат email'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      await emailAuthService.requestPasswordReset(req.body.email);

      res.json({
        success: true,
        message: 'Если пользователь существует, письмо для сброса пароля отправлено.',
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/reset-password - Reset password with token (public)
router.post(
  '/reset-password',
  strictAuthLimiter,
  [
    body('token').isString().notEmpty().withMessage('Токен обязателен'),
    body('password').isLength({ min: 8 }).withMessage('Пароль должен быть не менее 8 символов'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      await emailAuthService.resetPassword(req.body.token, req.body.password);

      res.json({
        success: true,
        message: 'Пароль успешно изменен. Войдите с новым паролем.',
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/email-login - Email login (public)
router.post(
  '/email-login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Неверный формат email'),
    body('password').exists().withMessage('Пароль обязателен'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Ошибка валидации', { errors: errors.array() });
      }

      const { email, password } = req.body;
      const result = await jwtAuthService.emailLogin(email, password);

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

// POST /api/v1/auth/login - Legacy browser login (public)
router.post(
  '/login',
  authLimiter,
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

// GET /api/v1/auth/vk - Initiate VK OAuth (public)
router.get('/vk', (req, res, next) => {
  try {
    if (!vkAuthService.isConfigured()) {
      throw ApiError.internal('VK OAuth не настроен');
    }

    const state = vkAuthService.generateState();
    const redirectUrl = vkAuthService.getAuthorizeUrl(state);

    res.redirect(redirectUrl);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/vk/callback - VK OAuth callback (public)
router.get('/vk/callback', async (req, res, next) => {
  try {
    const { code, state, error: vkError, error_description } = req.query;

    if (vkError) {
      logger.warn('VK OAuth error:', vkError, error_description);
      return res.redirect(`${env.FRONTEND_URL}/login?error=vk_denied`);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.redirect(`${env.FRONTEND_URL}/login?error=invalid_request`);
    }

    if (!vkAuthService.verifyState(state)) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=invalid_state`);
    }

    const vkData = await vkAuthService.exchangeCode(code);
    const result = await vkAuthService.handleVKCallback(vkData);

    const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set('access_token', result.accessToken);
    redirectUrl.searchParams.set('refresh_token', result.refreshToken);
    redirectUrl.searchParams.set('expires_in', String(result.expiresIn));

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('VK callback error:', error);
    return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

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

      const { userId } = await jwtAuthService.verifyRefreshToken(refreshToken);
      const newRefreshToken = await jwtAuthService.rotateRefreshToken(refreshToken, userId);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: { select: { name: true } },
        },
      });

      if (!user) {
        throw ApiError.unauthorized('Пользователь не найден');
      }

      if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= new Date()) {
        throw ApiError.forbidden('Требуется активная подписка', 'SUBSCRIPTION_REQUIRED');
      }

      // Get primary identity for token
      const primaryIdentity = await prisma.userIdentity.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      const accessToken = jwtAuthService.generateAccessToken({
        userId: user.id,
        identityId: primaryIdentity?.id ?? 0,
        authType: 'browser',
      });

      const expiresIn = jwtAuthService.getAccessTokenExpirySeconds();

      logger.info(`Token refreshed for user: ${user.id}`);

      res.json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        user: {
          id: user.id,
          name: user.profile?.name,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/auth/verify-phone
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

    if (allDevices || !refreshToken) {
      await jwtAuthService.revokeAllUserRefreshTokens(req.user!.id);
    } else {
      await jwtAuthService.revokeRefreshToken(refreshToken);
    }

    if (accountId) {
      await userService.logoutAccount(req.user!.id, accountId);
    } else {
      await userService.logoutWb(req.user!.id);

      if (req.user?.authType === 'telegram' && req.user?.chatId) {
        await sendLogoutNotification(req.user.chatId);
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
