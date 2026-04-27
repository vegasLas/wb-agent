import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/errors';
import { parseInitData } from '@/utils/parseInitData';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { identityService } from '@/services/auth/identity.service';
import { AuthProvider } from '@prisma/client';

export interface AuthUser {
  id: number;
  authType: 'telegram' | 'browser';
  subscriptionExpiresAt?: Date | null;
  subscriptionTier?: 'LITE' | 'PRO' | 'MAX';
  selectedAccountId?: string | null;
  chatId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

declare module 'express' {
  export interface Request {
    user?: AuthUser;
  }
}

/**
 * Resolve user from Telegram initData without subscription check
 */
async function tryTelegramAuth(req: Request): Promise<AuthUser | null> {
  const initDataRaw = req.headers['x-init-data'] as string | undefined;
  if (!initDataRaw) return null;

  try {
    const initData = parseInitData(req);
    const identity = await prisma.userIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: 'TELEGRAM',
          providerId: String(initData.user.id),
        },
      },
      include: { user: { include: { telegram: true } } },
    });

    let user = identity?.user ?? null;

    if (!user) {
      // Auto-create user on first Mini App open with valid initData
      const telegramUser = initData.user;
      logger.info(`Auto-creating user from initData: ${telegramUser.id}`);

      const result = await identityService.createUserWithIdentity(
        {
          name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
          username: telegramUser.username,
          languageCode: telegramUser.language_code,
        },
        {
          provider: AuthProvider.TELEGRAM,
          providerId: String(telegramUser.id),
        },
      );

      user = await prisma.user.findUnique({
        where: { id: result.userId },
        include: { telegram: true },
      });

      if (!user) {
        throw ApiError.internal('Failed to create user from initData');
      }
    }

    return {
      id: user.id,
      authType: 'telegram',
      selectedAccountId: user.selectedAccountId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionTier: user.subscriptionTier ?? 'LITE',
      chatId: user.telegram?.chatId ?? null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.warn('Telegram auth failed, trying JWT:', error);
    return null;
  }
}

/**
 * Resolve user from JWT Bearer token without subscription check
 */
async function tryJWTAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers['authorization'] as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.substring(7);
    const payload = jwtAuthService.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { telegram: true },
    });

    if (!user) {
      throw ApiError.unauthorized('Пользователь не найден');
    }

    return {
      id: user.id,
      authType: 'browser',
      selectedAccountId: user.selectedAccountId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionTier: user.subscriptionTier ?? 'LITE',
      chatId: user.telegram?.chatId ?? null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.warn('JWT auth failed:', error);
    throw ApiError.unauthorized('Недействительный токен авторизации');
  }
}

/**
 * Authentication middleware that validates user but skips subscription check.
 * Use for endpoints that must work even with expired subscription (e.g. /user).
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let authUser = await tryTelegramAuth(req);
    if (!authUser) {
      authUser = await tryJWTAuth(req);
    }
    if (!authUser) {
      throw ApiError.unauthorized('Требуется авторизация');
    }
    req.user = authUser;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    if (error instanceof Error && error.message.includes('expired')) {
      next(
        ApiError.unauthorized(
          'Сессия истекла. Пожалуйста, переоткройте кабинет для обновления данных авторизации.',
          'SESSION_EXPIRED',
        ),
      );
      return;
    }

    next(ApiError.unauthorized('Ошибка авторизации'));
  }
};

/**
 * Authentication middleware supporting both Telegram initData and JWT Bearer tokens
 * Validates authentication and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Skip auth for excluded paths
    const path = req.path;
    if (
      path.includes('_nuxt_icon') ||
      path.includes('payments/check') ||
      path.includes('webhooks/yookassa') ||
      path.includes('auth/register') ||
      path.includes('auth/verify-email') ||
      path.includes('auth/resend-verification') ||
      path.includes('auth/forgot-password') ||
      path.includes('auth/reset-password') ||
      path.includes('auth/email-login') ||
      path.includes('auth/vk') ||
      path.includes('health')
    ) {
      return next();
    }

    // Check for technical mode (maintenance mode)
    const technicalModeUserIds = process.env.TECHNICAL_MODE_USER_IDS;
    if (technicalModeUserIds) {
      try {
        const initData = parseInitData(req);
        const userId = initData.user.id.toString();

        if (technicalModeUserIds.split(',').includes(userId)) {
          logger.info('Technical mode: allowing user', userId);
          const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { identities: { where: { provider: 'TELEGRAM' } }, telegram: true },
          });

          if (user) {
            req.user = {
              id: user.id,
              authType: 'telegram',
              selectedAccountId: user.selectedAccountId,
              subscriptionExpiresAt: user.subscriptionExpiresAt,
              subscriptionTier: user.subscriptionTier ?? 'LITE',
              chatId: user.telegram?.chatId ?? null,
            };
          }
          return next();
        } else {
          logger.info('Technical mode: blocking user', userId);
          throw ApiError.forbidden(
            '🔧 Ведутся технические работы. Сервис временно недоступен. Пожалуйста, попробуйте позже.',
            'TECHNICAL_MODE',
          );
        }
      } catch (error) {
        if (error instanceof ApiError && error.code === 'INIT_DATA_EXPIRED') {
          throw ApiError.unauthorized(
            'Сессия истекла. Пожалуйста, переоткройте кабинет для обновления данных авторизации.',
            'SESSION_EXPIRED',
          );
        }
        throw ApiError.forbidden(
          '🔧 Ведутся технические работы. Сервис временно недоступен.',
          'TECHNICAL_MODE',
        );
      }
    }

    // Try Telegram auth first (initData in x-init-data header)
    const authUser = await tryTelegramAuth(req);

    if (authUser) {
      if (!authUser.subscriptionExpiresAt || new Date(authUser.subscriptionExpiresAt) <= new Date()) {
        throw ApiError.forbidden(
          'Требуется активная подписка.',
          'SUBSCRIPTION_REQUIRED',
        );
      }

      req.user = authUser;
      return next();
    }

    // Try JWT auth (Authorization: Bearer <token> header)
    const jwtUser = await tryJWTAuth(req);
    if (jwtUser) {
      if (!jwtUser.subscriptionExpiresAt || new Date(jwtUser.subscriptionExpiresAt) <= new Date()) {
        throw ApiError.forbidden(
          'Требуется активная подписка.',
          'SUBSCRIPTION_REQUIRED',
        );
      }

      req.user = jwtUser;
      return next();
    }

    throw ApiError.unauthorized('Требуется авторизация');
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    if (error instanceof Error && error.message.includes('expired')) {
      next(
        ApiError.unauthorized(
          'Сессия истекла. Пожалуйста, переоткройте кабинет для обновления данных авторизации.',
          'SESSION_EXPIRED',
        ),
      );
      return;
    }

    next(ApiError.unauthorized('Ошибка авторизации'));
  }
};
