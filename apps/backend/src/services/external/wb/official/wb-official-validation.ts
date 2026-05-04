/**
 * Shared validation helpers for WB Official API services.
 * Centralises parameter checks to avoid duplication across services.
 */

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateSupplierId(supplierId: string): void {
  if (!supplierId || supplierId.trim().length === 0) {
    throw new Error('supplierId is required');
  }
}

export function validateRequiredString(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

export function validateDate(date: string, fieldName: string): void {
  if (!date || !ISO_DATE_REGEX.test(date)) {
    throw new Error(`${fieldName} must be in YYYY-MM-DD format`);
  }
}

export function validateDateRange(dateFrom?: string, dateTo?: string): void {
  if (dateFrom && !ISO_DATE_REGEX.test(dateFrom)) {
    throw new Error('dateFrom must be in YYYY-MM-DD format');
  }
  if (dateTo && !ISO_DATE_REGEX.test(dateTo)) {
    throw new Error('dateTo must be in YYYY-MM-DD format');
  }
}

export function validatePagination(
  limit: number,
  offset: number,
  maxLimit = 1000,
): void {
  if (!Number.isFinite(limit) || limit < 1 || limit > maxLimit) {
    throw new Error(`limit must be between 1 and ${maxLimit}`);
  }
  if (!Number.isFinite(offset) || offset < 0) {
    throw new Error('offset must be a non-negative number');
  }
}

export function validateOptionalPagination(
  limit: number | undefined,
  offset: number | undefined,
  maxLimit = 1000,
): void {
  if (limit !== undefined && (!Number.isFinite(limit) || limit < 1 || limit > maxLimit)) {
    throw new Error(`limit must be between 1 and ${maxLimit}`);
  }
  if (offset !== undefined && (!Number.isFinite(offset) || offset < 0)) {
    throw new Error('offset must be a non-negative number');
  }
}

export function validatePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
}

export function validateNonNegativeNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
}

export function validateNonEmptyArray<T>(
  value: T[],
  fieldName: string,
  maxLength?: number,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }
  if (maxLength !== undefined && value.length > maxLength) {
    throw new Error(`${fieldName} must not exceed ${maxLength} items`);
  }
}

export function validateAllPositiveIntegers(values: number[], fieldName: string): void {
  if (values.some((id) => !Number.isFinite(id) || id < 1 || !Number.isInteger(id))) {
    throw new Error(`all ${fieldName} must be positive integers`);
  }
}
