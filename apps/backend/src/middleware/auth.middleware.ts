import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';
import { parseInitData } from '../utils/parseInitData';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  id: number;
  userId: number;
  telegramId: string;
  role?: string;
}

/**
 * Extended Express Request interface with user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authenticate using Telegram Mini App initData
 * This is the primary authentication method for the WB Agent
 */
export const authenticateTelegram = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
              userId: user.id,
              telegramId: initData.user.id.toString(),
            };
          }
          return next();
        } else {
          logger.info('Technical mode: blocking user', userId);
          throw ApiError.forbidden(
            '🔧 Ведутся технические работы. Сервис временно недоступен. Пожалуйста, попробуйте позже.'
          );
        }
      } catch (error) {
        if (error instanceof ApiError && error.code === 'INIT_DATA_EXPIRED') {
          throw ApiError.unauthorized(
            'Сессия истекла. Пожалуйста, переоткройте кабинет для обновления данных авторизации.',
            'SESSION_EXPIRED'
          );
        }
        throw ApiError.forbidden(
          '🔧 Ведутся технические работы. Сервис временно недоступен.'
        );
      }
    }

    // Normal authentication flow
    const initData = parseInitData(req);
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: BigInt(initData.user.id) },
    });

    if (!user) {
      // Create new user from Telegram data
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(initData.user.id),
          name: initData.user.first_name || initData.user.username || 'User',
          username: initData.user.username,
          languageCode: initData.user.language_code,
        },
      });
      logger.info('New user created from Telegram:', user.id);
    }

    // Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
      telegramId: initData.user.id.toString(),
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
          'SESSION_EXPIRED'
        )
      );
      return;
    }

    next(ApiError.unauthorized('Authentication failed'));
  }
};

/**
 * Authentication middleware using JWT
 * Used for API key-based or legacy authentication
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw ApiError.unauthorized('Invalid token format');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(ApiError.unauthorized('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication - doesn't fail if no auth
 * Attaches user to request if valid, otherwise continues
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try Telegram auth first
    const initDataRaw = req.headers['x-init-data'] as string | undefined;
    if (initDataRaw) {
      try {
        const initData = parseInitData(req);
        const user = await prisma.user.findUnique({
          where: { telegramId: BigInt(initData.user.id) },
        });
        if (user) {
          req.user = {
            id: user.id,
            userId: user.id,
            telegramId: initData.user.id.toString(),
          };
        }
        next();
        return;
      } catch {
        // Continue without auth
      }
    }

    // Try JWT auth
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
        req.user = decoded;
      } catch {
        // Continue without auth
      }
    }

    next();
  } catch {
    next();
  }
};

/**
 * Require active subscription for certain endpoints
 * Must be used after authenticateTelegram middleware
 */
export const requireSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { subscriptionExpiresAt: true },
    });

    if (
      !user?.subscriptionExpiresAt ||
      new Date(user.subscriptionExpiresAt) <= new Date()
    ) {
      throw ApiError.forbidden(
        'Требуется активная подписка. Для добавления новых аккаунтов необходима активная подписка.',
        'SUBSCRIPTION_REQUIRED'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Admin role middleware
 * Requires user to have admin role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }

  if (req.user.role !== 'admin') {
    next(ApiError.forbidden('Admin access required'));
    return;
  }

  next();
};
