import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/errors';
import { parseInitData } from '@/utils/parseInitData';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { jwtAuthService } from '@/services/user/jwt-auth.service';

export interface AuthUser {
  id: number;
  telegramId: string;  // REQUIRED - always present
  login?: string;      // May be set for browser users
  authType: 'telegram' | 'browser';
  subscriptionExpiresAt?: Date | null;
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
      path.includes('auth/login') ||  // Browser login is public
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
          // Set user for request
          const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(initData.user.id) },
          });

          if (user) {
            req.user = {
              id: user.id,
              telegramId: initData.user.id.toString(),
              login: user.login || undefined,
              authType: 'telegram',
              selectedAccountId: user.selectedAccountId,
              subscriptionExpiresAt: user.subscriptionExpiresAt,
              chatId: user.chatId,
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
    const initDataRaw = req.headers['x-init-data'] as string | undefined;
    
    if (initDataRaw) {
      try {
        const initData = parseInitData(req);
        const user = await prisma.user.findUnique({
          where: { telegramId: BigInt(initData.user.id) },
        });

        if (!user) {
          throw ApiError.unauthorized('Пользователь не найден');
        }

        // Check subscription
        if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= new Date()) {
          throw ApiError.forbidden(
            'Требуется активная подписка.',
            'SUBSCRIPTION_REQUIRED',
          );
        }

        req.user = {
          id: user.id,
          telegramId: initData.user.id.toString(),
          login: user.login || undefined,
          authType: 'telegram',
          selectedAccountId: user.selectedAccountId,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          chatId: user.chatId,
        };
        
        return next();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.warn('Telegram auth failed, trying JWT:', error);
        // Don't throw here - try JWT auth next
      }
    }

    // Try JWT auth (Authorization: Bearer <token> header)
    const authHeader = req.headers['authorization'] as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = jwtAuthService.verifyAccessToken(token);
        
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });
        
        if (!user) {
          throw ApiError.unauthorized('Пользователь не найден');
        }

        // Check subscription
        if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= new Date()) {
          throw ApiError.forbidden(
            'Требуется активная подписка.',
            'SUBSCRIPTION_REQUIRED',
          );
        }

        req.user = {
          id: user.id,
          telegramId: user.telegramId.toString(),
          login: payload.login,
          authType: 'browser',
          selectedAccountId: user.selectedAccountId,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          chatId: user.chatId,
        };
        
        return next();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.warn('JWT auth failed:', error);
        throw ApiError.unauthorized('Недействительный токен авторизации');
      }
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
