import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';

/**
 * Global error handling middleware
 * Catches all errors and returns a standardized response
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Log the error
  if (err instanceof ApiError) {
    logger.warn(`API Error: ${err.message}`, {
      statusCode: err.statusCode,
      code: err.code,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unexpected error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Handle ApiError (operational errors)
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // Handle JSON parsing errors (from express.json())
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      code: 'INVALID_JSON',
    });
    return;
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    res.status(422).json({
      success: false,
      error: err.message,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    // @ts-expect-error - Prisma error has code property
    const prismaErrorCode = err.code;

    // Unique constraint violation
    if (prismaErrorCode === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'A record with this data already exists',
        code: 'DUPLICATE_ENTRY',
      });
      return;
    }

    // Record not found
    if (prismaErrorCode === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    // Foreign key constraint failed
    if (prismaErrorCode === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'Referenced record does not exist',
        code: 'FOREIGN_KEY_VIOLATION',
      });
      return;
    }
  }

  // Default: Internal server error
  console.error('[INTERNAL_ERROR]', err.message);
  console.error('[INTERNAL_ERROR] stack:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message,
    code: 'INTERNAL_ERROR',
    stack: err.stack,
  });
};

/**
 * 404 Not Found middleware
 * Handles requests to routes that don't exist
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
};

/**
 * Validation middleware for express-validator
 * Handles validation errors from request body/query/params
 */
export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map(
        (err) => `${err.type === 'field' ? err.path : err.type}: ${err.msg}`,
      );
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errorMessages,
    });
    return;
  }

  next();
};
