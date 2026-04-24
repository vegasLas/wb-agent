/**
 * Feedback-specific middleware
 * - resolveSupplier: attaches supplierId to req after auth
 * - asyncHandler: wraps async route handlers to catch errors
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { resolveSupplierId } from '@/utils/supplier-resolver';
import { errorResponse } from '@/utils/response';

declare module 'express' {
  export interface Request {
    supplierId?: string;
  }
}

/**
 * Middleware that resolves the user's supplier and attaches it to req.supplierId.
 * Must be applied AFTER authenticate middleware.
 */
export const resolveSupplier = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next(new Error('User not authenticated'));
      return;
    }

    req.supplierId = await resolveSupplierId(userId);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Wraps an async Express handler so errors are passed to the error middleware.
 * Eliminates repetitive try/catch blocks in controllers.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Sends a standardized error response for feedback endpoints.
 * Used by route-level error handlers.
 */
export function sendFeedbackError(res: Response, error: unknown): void {
  errorResponse(
    res,
    error instanceof Error ? error : new Error(String(error)),
  );
}
