/**
 * Centralized auth error types.
 * Mirrors all possible backend ApiError codes from auth endpoints.
 */

export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'EMAIL_NOT_VERIFIED'
  | 'RATE_LIMITED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REVOKED'
  | 'SESSION_EXPIRED'
  | 'TECHNICAL_MODE'
  | 'NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'INTERNAL_ERROR'
  | 'INVALID_JSON'
  | 'ROUTE_NOT_FOUND';

export interface ValidationErrorItem {
  type: 'field' | 'alternative' | 'unknown_fields';
  msg: string;
  path?: string;
  location?: string;
}

export class AuthAPIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: AuthErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthAPIError';
  }

  /**
   * Extract field-level validation errors from details.errors array.
   * Returns a map: fieldPath -> errorMessage
   */
  get fieldErrors(): Record<string, string> {
    const errors = this.details?.errors;
    if (!Array.isArray(errors)) return {};

    const map: Record<string, string> = {};
    for (const item of errors) {
      const field = (item as ValidationErrorItem).path || (item as ValidationErrorItem).type || 'general';
      const msg = (item as ValidationErrorItem).msg || String(item);
      // Keep only the first error per field
      if (!map[field]) {
        map[field] = msg;
      }
    }
    return map;
  }

  /**
   * Check if this is a specific token-related error.
   */
  get isTokenError(): boolean {
    if (this.code !== 'BAD_REQUEST') return false;
    const msg = this.message.toLowerCase();
    return (
      msg.includes('токен') ||
      msg.includes('token') ||
      msg.includes('истек') ||
      msg.includes('expired') ||
      msg.includes('использован') ||
      msg.includes('used')
    );
  }

  /**
   * Token error subtype for differentiated UX.
   */
  get tokenErrorType(): 'expired' | 'used' | 'invalid' | 'wrong_type' | null {
    if (!this.isTokenError) return null;
    const msg = this.message.toLowerCase();
    if (msg.includes('истек') || msg.includes('expired')) return 'expired';
    if (msg.includes('использован') || msg.includes('used')) return 'used';
    if (msg.includes('тип') || msg.includes('type')) return 'wrong_type';
    return 'invalid';
  }
}

/**
 * Normalize an Axios (or any) error into AuthAPIError.
 * Returns null if the error is not a recognizable API error.
 */
export function normalizeAuthError(err: unknown): AuthAPIError | null {
  if (err instanceof AuthAPIError) return err;

  const anyErr = err as Record<string, unknown> | undefined;
  if (!anyErr) return null;

  // Axios error shape
  const response = anyErr.response as Record<string, unknown> | undefined;
  if (response) {
    const data = response.data as Record<string, unknown> | undefined;
    const status = (response.status as number) || 500;
    const message = (data?.error as string) || (anyErr.message as string) || 'Unknown error';
    const code = (data?.code as AuthErrorCode) || 'INTERNAL_ERROR';
    const details = (data?.details as Record<string, unknown>) || undefined;
    return new AuthAPIError(status, message, code, details);
  }

  // Plain Error
  if (anyErr instanceof Error) {
    return new AuthAPIError(500, anyErr.message, 'INTERNAL_ERROR');
  }

  return null;
}
