/**
 * Error Handling Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/errorHandlingService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import {
  SharedErrorHandlingService,
  sharedErrorHandlingService,
} from '@/services/monitoring/shared/error-handling.service';
import { bookingErrorService } from '@/services/infrastructure';
import type { BookingError } from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// Mock bookingErrorService
jest.mock('../../../booking-error.service', () => ({
  bookingErrorService: {
    isCriticalBookingError: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SharedErrorHandlingService', () => {
  let service: SharedErrorHandlingService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SharedErrorHandlingService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('error type detection', () => {
    describe('isDateUnavailableError', () => {
      it('should detect date unavailable message', () => {
        const error: BookingError = { message: 'Эта дата уже недоступна' };
        expect(service.isDateUnavailableError(error)).toBe(true);
      });

      it('should detect API status -32003 with plan/add URL', () => {
        const error: BookingError = {
          status: -32003,
          url: '/api/v1/plan/add',
          message: 'Some error',
        };
        expect(service.isDateUnavailableError(error)).toBe(true);
      });

      it('should detect API status -32003 with plan/update URL', () => {
        const error: BookingError = {
          status: -32003,
          url: '/api/v1/plan/update',
          message: 'Some error',
        };
        expect(service.isDateUnavailableError(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        const error: BookingError = { message: 'Some other error' };
        expect(service.isDateUnavailableError(error)).toBe(false);
      });

      it('should return false for wrong status code', () => {
        const error: BookingError = {
          status: 500,
          url: '/api/v1/plan/add',
          message: 'Server error',
        };
        expect(service.isDateUnavailableError(error)).toBe(false);
      });

      it('should return false for wrong URL with correct status', () => {
        const error: BookingError = {
          status: -32003,
          url: '/api/v1/other',
          message: 'Some error',
        };
        expect(service.isDateUnavailableError(error)).toBe(false);
      });

      it('should handle undefined error gracefully', () => {
        expect(
          service.isDateUnavailableError(undefined as unknown as BookingError),
        ).toBe(false);
      });

      it('should handle error without message', () => {
        const error: BookingError = { status: 200 };
        expect(service.isDateUnavailableError(error)).toBe(false);
      });
    });

    describe('isTooActiveError', () => {
      it('should detect too active message', () => {
        const error: BookingError = {
          message: 'Заметили, что вы слишком активно создаёте поставки',
        };
        expect(service.isTooActiveError(error)).toBe(true);
      });

      it('should detect partial too active message', () => {
        const error: BookingError = {
          message:
            'Error: Заметили, что вы слишком активно создаёте поставки. Please wait.',
        };
        expect(service.isTooActiveError(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        const error: BookingError = { message: 'Some other error' };
        expect(service.isTooActiveError(error)).toBe(false);
      });

      it('should handle undefined error gracefully', () => {
        expect(
          service.isTooActiveError(undefined as unknown as BookingError),
        ).toBe(false);
      });
    });

    describe('isCriticalError', () => {
      it('should call bookingErrorService.isCriticalBookingError', () => {
        const mockIsCritical = jest.mocked(
          bookingErrorService.isCriticalBookingError,
        );
        mockIsCritical.mockReturnValue(true);

        const result = service.isCriticalError('Some error message');

        expect(mockIsCritical).toHaveBeenCalledWith('Some error message');
        expect(result).toBe(true);
      });

      it('should return false when bookingErrorService returns false', () => {
        const mockIsCritical = jest.mocked(
          bookingErrorService.isCriticalBookingError,
        );
        mockIsCritical.mockReturnValue(false);

        const result = service.isCriticalError('Non-critical error');

        expect(result).toBe(false);
      });
    });

    describe('isOrderNotExistError', () => {
      it('should detect order not exist message', () => {
        const error: BookingError = { message: 'Заказ не существует' };
        expect(service.isOrderNotExistError(error)).toBe(true);
      });

      it('should detect preorder message', () => {
        const error: BookingError = { message: 'Ошибка предзаказ' };
        expect(service.isOrderNotExistError(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        const error: BookingError = { message: 'Some other error' };
        expect(service.isOrderNotExistError(error)).toBe(false);
      });

      it('should handle undefined error gracefully', () => {
        expect(
          service.isOrderNotExistError(undefined as unknown as BookingError),
        ).toBe(false);
      });
    });

    describe('isDateAlreadyUnavailableMessage', () => {
      it('should detect date already unavailable message', () => {
        expect(
          service.isDateAlreadyUnavailableMessage('Эта дата уже недоступна'),
        ).toBe(true);
      });

      it('should detect partial message', () => {
        expect(
          service.isDateAlreadyUnavailableMessage(
            'Error: Эта дата уже недоступна for booking',
          ),
        ).toBe(true);
      });

      it('should return false for other messages', () => {
        expect(
          service.isDateAlreadyUnavailableMessage('Some other error'),
        ).toBe(false);
      });

      it('should handle empty string', () => {
        expect(service.isDateAlreadyUnavailableMessage('')).toBe(false);
      });
    });
  });

  describe('error categorization', () => {
    describe('categorizeError', () => {
      it('should categorize date unavailable error', () => {
        const error: BookingError = { message: 'Эта дата уже недоступна' };
        const result = service.categorizeError(error);

        expect(result).toEqual({
          type: 'date_unavailable',
          shouldStop: true,
          duration: 2000, // 2 seconds
        });
      });

      it('should categorize too active error', () => {
        const error: BookingError = {
          message: 'Заметили, что вы слишком активно создаёте поставки',
        };
        const result = service.categorizeError(error);

        expect(result).toEqual({
          type: 'too_active',
          shouldStop: false,
          duration: 600000, // 10 minutes
          shouldBlacklistUser: true,
        });
      });

      it('should categorize order not exist error', () => {
        const error: BookingError = { message: 'Заказ не существует' };
        const result = service.categorizeError(error);

        expect(result).toEqual({
          type: 'order_not_exist',
          shouldStop: false,
          shouldClearCache: true,
        });
      });

      it('should categorize critical error', () => {
        const mockIsCritical = jest.mocked(
          bookingErrorService.isCriticalBookingError,
        );
        mockIsCritical.mockReturnValue(true);

        const error: BookingError = { message: 'Critical error message' };
        const result = service.categorizeError(error);

        expect(result).toEqual({
          type: 'critical',
          shouldStop: false,
          duration: 60000, // 60 seconds
        });
      });

      it('should categorize non-critical error as default', () => {
        const mockIsCritical = jest.mocked(
          bookingErrorService.isCriticalBookingError,
        );
        mockIsCritical.mockReturnValue(false);

        const error: BookingError = { message: 'Regular error message' };
        const result = service.categorizeError(error);

        expect(result).toEqual({
          type: 'non_critical',
          shouldStop: false,
          duration: 60000, // 60 seconds
        });
      });

      it('should handle error precedence correctly', () => {
        // Date unavailable should take precedence over critical
        const mockIsCritical = jest.mocked(
          bookingErrorService.isCriticalBookingError,
        );
        mockIsCritical.mockReturnValue(true);

        const error: BookingError = {
          message: 'Эта дата уже недоступна - critical error',
        };
        const result = service.categorizeError(error);

        expect(result.type).toBe('date_unavailable');
      });

      it('should handle error without message', () => {
        const mockIsCritical = jest.mocked(
          bookingErrorService.isCriticalBookingError,
        );
        mockIsCritical.mockReturnValue(false);

        const error: BookingError = {};
        const result = service.categorizeError(error);

        expect(result.type).toBe('non_critical');
      });
    });
  });

  describe('ban duration and logic', () => {
    describe('getBanDuration', () => {
      it('should return correct duration for date unavailable', () => {
        expect(service.getBanDuration('date_unavailable')).toBe(2000);
      });

      it('should return correct duration for too active', () => {
        expect(service.getBanDuration('too_active')).toBe(600000);
      });

      it('should return default duration for other types', () => {
        expect(service.getBanDuration('critical')).toBe(60000);
        expect(service.getBanDuration('non_critical')).toBe(60000);
        expect(service.getBanDuration('unknown' as any)).toBe(60000);
      });
    });

    describe('shouldBanWarehouseDate', () => {
      it('should ban warehouse-date for date unavailable', () => {
        expect(service.shouldBanWarehouseDate('date_unavailable', 'WEEK')).toBe(
          true,
        );
      });

      it('should ban warehouse-date for critical errors', () => {
        expect(service.shouldBanWarehouseDate('critical', 'MONTH')).toBe(true);
      });

      it('should ban warehouse-date for non-critical errors', () => {
        expect(
          service.shouldBanWarehouseDate('non_critical', 'CUSTOM_DATES'),
        ).toBe(true);
      });

      it('should not ban warehouse-date for too active errors', () => {
        expect(service.shouldBanWarehouseDate('too_active', 'WEEK')).toBe(
          false,
        );
      });

      it('should not ban warehouse-date for order not exist errors', () => {
        expect(service.shouldBanWarehouseDate('order_not_exist', 'MONTH')).toBe(
          false,
        );
      });

      it('should ban warehouse-date for unknown error types', () => {
        expect(service.shouldBanWarehouseDate('unknown' as any, 'WEEK')).toBe(
          true,
        );
      });
    });

    describe('shouldBanWithoutDate', () => {
      it('should ban without date for critical errors', () => {
        expect(service.shouldBanWithoutDate('critical', 'WEEK')).toBe(true);
        expect(service.shouldBanWithoutDate('critical', 'CUSTOM_DATES')).toBe(
          true,
        );
      });

      it('should ban without date for non-critical non-custom date types', () => {
        expect(service.shouldBanWithoutDate('non_critical', 'WEEK')).toBe(true);
        expect(service.shouldBanWithoutDate('non_critical', 'MONTH')).toBe(
          true,
        );
      });

      it('should not ban without date for non-critical custom date types', () => {
        expect(
          service.shouldBanWithoutDate('non_critical', 'CUSTOM_DATES'),
        ).toBe(false);
        expect(
          service.shouldBanWithoutDate('non_critical', 'CUSTOM_DATES_SINGLE'),
        ).toBe(false);
      });

      it('should not ban without date for other error types', () => {
        expect(service.shouldBanWithoutDate('date_unavailable', 'WEEK')).toBe(
          false,
        );
        expect(service.shouldBanWithoutDate('too_active', 'MONTH')).toBe(false);
        expect(
          service.shouldBanWithoutDate('order_not_exist', 'CUSTOM_DATES'),
        ).toBe(false);
      });
    });
  });

  describe('utility methods', () => {
    describe('shouldStopProcessing', () => {
      it('should return true for date unavailable errors', () => {
        const error: BookingError = { message: 'Эта дата уже недоступна' };
        expect(service.shouldStopProcessing(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        const error: BookingError = { message: 'Some other error' };
        expect(service.shouldStopProcessing(error)).toBe(false);
      });
    });

    describe('getErrorDisplayMessage', () => {
      it('should return error message for critical errors', () => {
        const mockIsCritical = jest.mocked(
          bookingErrorService.isCriticalBookingError,
        );
        mockIsCritical.mockReturnValue(true);

        const error: BookingError = { message: 'Test error message' };
        expect(service.getErrorDisplayMessage(error)).toBe(
          'Test error message',
        );
      });

      it('should return default message for error without message', () => {
        const error: BookingError = {};
        expect(service.getErrorDisplayMessage(error)).toBe(
          "An error occurred. We're sorry for the inconvenience",
        );
      });

      it('should handle undefined error', () => {
        expect(
          service.getErrorDisplayMessage(undefined as unknown as BookingError),
        ).toBe("An error occurred. We're sorry for the inconvenience");
      });
    });

    describe('shouldNotifyAdmin', () => {
      it('should return false for date already unavailable messages', () => {
        const error: BookingError = { message: 'Эта дата уже недоступна' };
        expect(service.shouldNotifyAdmin(error)).toBe(false);
      });

      it('should return true for other error messages', () => {
        const error: BookingError = { message: 'Critical system error' };
        expect(service.shouldNotifyAdmin(error)).toBe(true);
      });

      it('should return true for error without message', () => {
        const error: BookingError = {};
        expect(service.shouldNotifyAdmin(error)).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete error processing workflow', () => {
      const error: BookingError = {
        message: 'Заметили, что вы слишком активно создаёте поставки',
      };

      // Categorize error
      const category = service.categorizeError(error);
      expect(category.type).toBe('too_active');
      expect(category.shouldBlacklistUser).toBe(true);

      // Check ban logic
      expect(service.shouldBanWarehouseDate(category.type, 'WEEK')).toBe(false);
      expect(service.getBanDuration(category.type)).toBe(600000);

      // Check processing should continue
      expect(service.shouldStopProcessing(error)).toBe(false);

      // Should notify admin
      expect(service.shouldNotifyAdmin(error)).toBe(true);
    });

    it('should handle date unavailable error workflow', () => {
      const error: BookingError = { message: 'Эта дата уже недоступна' };

      const category = service.categorizeError(error);
      expect(category.type).toBe('date_unavailable');
      expect(category.shouldStop).toBe(true);

      expect(
        service.shouldBanWarehouseDate(category.type, 'CUSTOM_DATES'),
      ).toBe(true);
      expect(service.getBanDuration(category.type)).toBe(2000);
      expect(service.shouldStopProcessing(error)).toBe(true);
      expect(service.shouldNotifyAdmin(error)).toBe(false); // Don't notify for expected errors
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(() =>
        service.categorizeError(null as unknown as BookingError),
      ).not.toThrow();
      expect(() =>
        service.categorizeError(undefined as unknown as BookingError),
      ).not.toThrow();
      expect(() =>
        service.getErrorDisplayMessage(null as unknown as BookingError),
      ).not.toThrow();
      expect(() =>
        service.shouldNotifyAdmin(null as unknown as BookingError),
      ).not.toThrow();
    });

    it('should handle empty error object', () => {
      const mockIsCritical = jest.mocked(
        bookingErrorService.isCriticalBookingError,
      );
      mockIsCritical.mockReturnValue(false);

      const emptyError: BookingError = {};
      const category = service.categorizeError(emptyError);

      expect(category.type).toBe('non_critical');
      expect(category.shouldStop).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(sharedErrorHandlingService).toBeInstanceOf(
        SharedErrorHandlingService,
      );
    });

    it('should maintain consistent behavior across instances', () => {
      const error: BookingError = { message: 'Test error' };

      const result1 = sharedErrorHandlingService.categorizeError(error);
      const result2 = service.categorizeError(error);

      expect(result1).toEqual(result2);
    });
  });
});
