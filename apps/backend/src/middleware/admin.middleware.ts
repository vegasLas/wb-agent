import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { ApiError } from '@/utils/errors';

/**
 * Admin middleware.
 * Checks the Admin DB table first, then falls back to TECHNICAL_MODE_USER_IDS env var.
 * Attaches req.user.isAdmin = true when verified.
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('Требуется авторизация');
    }

    // 1. Check Admin table
    const adminRecord = await prisma.admin.findUnique({
      where: { userId: user.id },
    });

    if (adminRecord) {
      (req.user as any).isAdmin = true;
      return next();
    }

    // 2. Fallback to TECHNICAL_MODE_USER_IDS env var
    const technicalModeUserIds = process.env.TECHNICAL_MODE_USER_IDS;
    if (technicalModeUserIds) {
      const allowedIds = technicalModeUserIds.split(',').map((id) => id.trim());
      if (allowedIds.includes(user.telegramId)) {
        (req.user as any).isAdmin = true;
        return next();
      }
    }

    throw ApiError.forbidden('Доступ запрещен', 'ADMIN_REQUIRED');
  } catch (error) {
    next(error);
  }
};
