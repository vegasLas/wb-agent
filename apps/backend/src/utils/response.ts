import { Response } from 'express';
import { ApiError } from '@/utils/errors';

/**
 * Send a standardized success response
 */
export function successResponse<T>(
  res: Response,
  data: T,
  status = 200,
): void {
  res.status(status).json({
    success: true,
    data,
  });
}

/**
 * Send a standardized error response
 */
export function errorResponse(
  res: Response,
  error: ApiError | Error,
  status?: number,
): void {
  if (error instanceof ApiError) {
    res.status(status ?? error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  res.status(status ?? 500).json({
    success: false,
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
