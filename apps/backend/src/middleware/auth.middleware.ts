import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { parseInitData } from '../utils/parseInitData';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface AuthUser {
  id: number;
  telegramId: string;
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
 * Authentication middleware using Telegram Mini App initData
 * Validates x-init-data header and attaches user to request
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
      path.includes('webhooks/yookassa')
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
              selectedAccountId: user.selectedAccountId,
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

    // Normal authentication flow
    const initData = parseInitData(req);

    // Find user
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(initData.user.id) },
    });

    if (!user) {
      throw ApiError.unauthorized('Не авторизован');
    }

    // Check subscription for auth endpoints that require active subscription
    const authEndpointsRequiringSubscription = [
      '/v1/auth/verify-phone',
      '/v1/auth/verify-sms',
      '/v1/auth/verify-two-factor',
    ];

    if (
      authEndpointsRequiringSubscription.some((endpoint) => path === endpoint)
    ) {
      if (
        !user.subscriptionExpiresAt ||
        new Date(user.subscriptionExpiresAt) <= new Date()
      ) {
        throw ApiError.forbidden(
          'Требуется активная подписка. Для добавления новых аккаунтов необходима активная подписка.',
          'SUBSCRIPTION_REQUIRED',
        );
      }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      telegramId: initData.user.id.toString(),
      selectedAccountId: user.selectedAccountId,
    };
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

    next(ApiError.unauthorized('Не авторизован'));
  }
};
