import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/errors';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { jwtAuthService } from '@/services/user/jwt-auth.service';
import { UserTier } from '@/constants/payments';

export interface AuthUser {
  id: number;
  subscriptionTier: UserTier;
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
      include: { telegram: true, subscriptions: { orderBy: { startedAt: 'desc' }, take: 1 } },
    });

    if (!user) {
      throw ApiError.unauthorized('Пользователь не найден');
    }

    const currentSub = user.subscriptions?.[0];
    return {
      id: user.id,
      selectedAccountId: user.selectedAccountId,
      subscriptionTier: currentSub?.tier ?? 'FREE',
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
    const authUser = await tryJWTAuth(req);
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
          'Сессия истекла. Пожалуйста, войдите снова.',
          'SESSION_EXPIRED',
        ),
      );
      return;
    }

    next(ApiError.unauthorized('Ошибка авторизации'));
  }
};

/**
 * Authentication middleware supporting JWT Bearer tokens only.
 * Validates authentication and attaches user to request.
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
        const authUser = await tryJWTAuth(req);
        if (!authUser) {
          throw ApiError.forbidden(
            '🔧 Ведутся технические работы. Сервис временно недоступен. Пожалуйста, попробуйте позже.',
            'TECHNICAL_MODE',
          );
        }

        const allowedIds = technicalModeUserIds.split(',').map((id) => id.trim());
        const identity = await prisma.userIdentity.findFirst({
          where: { userId: authUser.id, provider: 'TELEGRAM' },
        });

        if (identity && allowedIds.includes(identity.providerId || '')) {
          logger.info('Technical mode: allowing user', authUser.id);
          req.user = authUser;
          return next();
        }

        logger.info('Technical mode: blocking user', authUser.id);
        throw ApiError.forbidden(
          '🔧 Ведутся технические работы. Сервис временно недоступен. Пожалуйста, попробуйте позже.',
          'TECHNICAL_MODE',
        );
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw ApiError.forbidden(
          '🔧 Ведутся технические работы. Сервис временно недоступен.',
          'TECHNICAL_MODE',
        );
      }
    }

    // JWT auth only
    const authUser = await tryJWTAuth(req);
    if (authUser) {
      req.user = authUser;
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
          'Сессия истекла. Пожалуйста, войдите снова.',
          'SESSION_EXPIRED',
        ),
      );
      return;
    }

    next(ApiError.unauthorized('Ошибка авторизации'));
  }
};
