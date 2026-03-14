/**
 * Custom API Error class
 * Used for operational errors that we want to return to the client
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code?: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(400, message, code || 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Unauthorized', code?: string): ApiError {
    return new ApiError(401, message, code || 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden', code?: string): ApiError {
    return new ApiError(403, message, code || 'FORBIDDEN');
  }

  static notFound(message: string = 'Not found', code?: string): ApiError {
    return new ApiError(404, message, code || 'NOT_FOUND');
  }

  static conflict(message: string, code?: string): ApiError {
    return new ApiError(409, message, code || 'CONFLICT');
  }

  static validation(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static tooManyRequests(message: string = 'Too many requests'): ApiError {
    return new ApiError(429, message, 'RATE_LIMITED');
  }

  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
