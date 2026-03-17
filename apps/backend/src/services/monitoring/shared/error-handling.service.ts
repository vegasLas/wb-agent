/**
 * Error Handling Service - Phase 2: Ban & Error Handling
 * Categorizes errors and determines appropriate handling strategies.
 */

import { bookingErrorService } from '../../booking-error.service';
import type {
  BookingError,
  ISharedErrorHandlingService,
  CategorizedError,
} from './interfaces/sharedInterfaces';

// Constants
const DATE_UNAVAILABLE_BAN_DURATION_MS = 2 * 1000; // 2 seconds
const TOO_ACTIVE_BLACKLIST_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_BAN_DURATION_MS = 60 * 1000; // 60 seconds

export class SharedErrorHandlingService implements ISharedErrorHandlingService {
  /**
   * Checks if error indicates date is unavailable
   */
  isDateUnavailableError(error: BookingError): boolean {
    const errorMessage = error?.message || '';
    return (
      errorMessage.includes('Эта дата уже недоступна') ||
      (error?.status === -32003 &&
        (error?.url?.includes('/api/v1/plan/add') ||
          error?.url?.includes('/api/v1/plan/update'))) ||
      false
    );
  }

  /**
   * Checks if error indicates user is too active
   */
  isTooActiveError(error: BookingError): boolean {
    const errorMessage = error?.message || '';
    return (
      errorMessage.includes(
        'Заметили, что вы слишком активно создаёте поставки'
      ) || errorMessage.includes('Request failed with status 429')
    );
  }

  /**
   * Checks if error is critical using existing service
   */
  isCriticalError(errorMessage: string): boolean {
    return bookingErrorService.isCriticalBookingError(errorMessage);
  }

  /**
   * Checks if error indicates order doesn't exist
   */
  isOrderNotExistError(error: BookingError): boolean {
    const errorMessage = error?.message || '';
    return (
      errorMessage.includes('Заказ не существует') ||
      errorMessage.includes('предзаказ')
    );
  }

  /**
   * Checks if error message indicates date is already unavailable
   */
  isDateAlreadyUnavailableMessage(errorMessage: string): boolean {
    return errorMessage.includes('Эта дата уже недоступна');
  }

  /**
   * Categorizes error and returns handling information
   */
  categorizeError(error: BookingError): CategorizedError {
    const errorMessage = error?.message || '';

    if (this.isDateUnavailableError(error)) {
      return {
        type: 'date_unavailable',
        shouldStop: true,
        duration: DATE_UNAVAILABLE_BAN_DURATION_MS,
      };
    }

    if (this.isTooActiveError(error)) {
      return {
        type: 'too_active',
        shouldStop: false,
        duration: TOO_ACTIVE_BLACKLIST_DURATION_MS,
        shouldBlacklistUser: true,
      };
    }

    if (this.isOrderNotExistError(error)) {
      return {
        type: 'order_not_exist',
        shouldStop: false,
        shouldClearCache: true,
      };
    }

    if (this.isCriticalError(errorMessage)) {
      return {
        type: 'critical',
        shouldStop: false,
        duration: DEFAULT_BAN_DURATION_MS,
      };
    }

    return {
      type: 'non_critical',
      shouldStop: false,
      duration: DEFAULT_BAN_DURATION_MS,
    };
  }

  /**
   * Gets appropriate ban duration for error type
   */
  getBanDuration(errorType: string): number {
    switch (errorType) {
      case 'date_unavailable':
        return DATE_UNAVAILABLE_BAN_DURATION_MS;
      case 'too_active':
        return TOO_ACTIVE_BLACKLIST_DURATION_MS;
      default:
        return DEFAULT_BAN_DURATION_MS;
    }
  }

  /**
   * Determines if error should trigger a warehouse-date ban
   */
  shouldBanWarehouseDate(errorType: string, dateType: string): boolean {
    switch (errorType) {
      case 'date_unavailable':
        return true;
      case 'critical':
      case 'non_critical':
        return true;
      case 'too_active':
        return false; // User-specific error, don't ban warehouse-date
      case 'order_not_exist':
        return false; // Cache issue, don't ban warehouse-date
      default:
        return true;
    }
  }

  /**
   * Determines ban scope (with or without date)
   */
  shouldBanWithoutDate(errorType: string, dateType: string): boolean {
    if (
      errorType === 'critical' ||
      (errorType === 'non_critical' &&
        dateType !== 'CUSTOM_DATES' &&
        dateType !== 'CUSTOM_DATES_SINGLE')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Logs error with appropriate categorization
   */
  logError(
    itemId: string,
    itemType: 'autobooking' | 'reschedule',
    effectiveDate: Date,
    error: BookingError,
    errorCategory: CategorizedError
  ): void {
    const errorTypeDisplay = errorCategory.type.replace('_', ' ');
    const itemDisplay =
      itemType === 'autobooking' ? 'Autobooking' : 'Reschedule';

    console.error(
      `❌ Error for ${itemDisplay} ${itemId}, Date ${effectiveDate.toDateString()}: ` +
        `${errorTypeDisplay} error - ${error.message}`
    );
  }

  /**
   * Determines if processing should stop for the warehouse-date combination
   */
  shouldStopProcessing(error: BookingError): boolean {
    return this.isDateUnavailableError(error);
  }

  /**
   * Gets error message for logging/notification purposes
   */
  getErrorDisplayMessage(error: BookingError): string {
    if (!error?.message) {
      return "An error occurred. We're sorry for the inconvenience";
    }

    // Check if it's a known critical error
    if (this.isCriticalError(error.message)) {
      return error.message;
    }

    // For unknown errors, return fallback message
    return "An error occurred. We're sorry for the inconvenience";
  }

  /**
   * Checks if error should trigger notification to admin
   */
  shouldNotifyAdmin(error: BookingError): boolean {
    const errorMessage = error?.message || '';
    // Don't notify for "date already unavailable" messages as they're expected
    return !this.isDateAlreadyUnavailableMessage(errorMessage);
  }
}

export const sharedErrorHandlingService = new SharedErrorHandlingService();
