/**
 * Autobooking Reschedule Executor Service Tests
 * Migrated from: tests/autobookingRescheduleExecutor.service.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture
 * - Same test logic preserved
 */

import { AutobookingRescheduleExecutorService } from '@/services/monitoring/autobooking-reschedule/autobooking-reschedule-executor.service';
import { sharedBanService } from '@/services/monitoring/shared/ban.service';
import { sharedErrorHandlingService } from '@/services/monitoring/shared/error-handling.service';
import { supplyService } from '@/services/domain/supply/supply.service';
import { bookingErrorService } from '@/services/booking-error.service';
import {
  createMonitoringUser,
  getFutureDate,
} from '@/__tests__/helpers/autobooking-helpers';
import type { AutobookingReschedule } from '@prisma/client';

// Mock dependencies
jest.mock('../../../services/supply.service');
jest.mock('../../../services/booking-error.service');
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AutobookingRescheduleExecutorService', () => {
  let service: AutobookingRescheduleExecutorService;
  let mockSupplyService: jest.Mocked<typeof supplyService>;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;

  // Helper function to create a reschedule object
  const createReschedule = (
    overrides: Partial<AutobookingReschedule> = {},
  ): AutobookingReschedule =>
    ({
      id: 'reschedule-1',
      userId: 1,
      supplierId: 'supplier-1',
      supplyId: 'supply-123',
      warehouseId: 123,
      supplyType: 'BOX',
      dateType: 'CUSTOM_DATES',
      currentDate: new Date(),
      targetDateFrom: getFutureDate(7),
      targetDateTo: getFutureDate(14),
      coefficient: 5,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as AutobookingReschedule;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutobookingRescheduleExecutorService();
    mockSupplyService = supplyService as jest.Mocked<typeof supplyService>;
    mockBookingErrorService = bookingErrorService as jest.Mocked<
      typeof bookingErrorService
    >;

    // Mock supplyService
    mockSupplyService.updateSupplyPlan.mockResolvedValue({
      success: true,
      data: { id: 'supply-123' },
    });

    // Mock bookingErrorService
    mockBookingErrorService.isCriticalBookingError.mockReturnValue(false);

    // Clear ban service state
    sharedBanService.clearAllBannedDates();
    sharedBanService.clearAllBlacklistedUsers();
  });

  afterEach(() => {
    sharedBanService.clearAllBannedDates();
    sharedBanService.clearAllBlacklistedUsers();
  });

  describe('createRescheduleTask', () => {
    test('should successfully create reschedule task via updateSupplyPlan', async () => {
      // Arrange
      const reschedule = createReschedule({ supplyId: '12345' });
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);
      const account = { id: 'account-123' };
      const latency = 1000;

      // Act
      await service.createRescheduleTask({
        reschedule,
        effectiveDate: targetDate,
        account,
        user: monitoringUser,
        latency,
      });

      // Assert
      expect(mockSupplyService.updateSupplyPlan).toHaveBeenCalledWith({
        accountId: 'account-123',
        supplierId: 'supplier-1',
        userId: 1,
        proxy: monitoringUser.proxy,
        latency: 1000,
        params: {
          supplyId: 12345,
          deliveryDate: targetDate.toISOString(),
        },
        rpc_order: expect.any(Number),
        userAgent: monitoringUser.userAgent,
      });
    });

    test('should generate random rpc_order in valid range', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);
      const account = { id: 'account-123' };
      const latency = 1000;

      // Act
      await service.createRescheduleTask({
        reschedule,
        effectiveDate: targetDate,
        account,
        user: monitoringUser,
        latency,
      });

      // Assert
      const callArgs = mockSupplyService.updateSupplyPlan.mock.calls[0][0];
      expect(callArgs.rpc_order).toBeGreaterThanOrEqual(3);
      expect(callArgs.rpc_order).toBeLessThanOrEqual(100003);
    });
  });

  describe('addSuccessfulReschedule', () => {
    test('should add successful reschedule to list', () => {
      // Arrange
      const successfulReschedules: any[] = [];
      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser({ chatId: 'test-chat' });
      const targetDate = getFutureDate(7);

      // Act
      service.addSuccessfulReschedule(successfulReschedules, {
        user: monitoringUser,
        warehouseName: 'Test Warehouse',
        effectiveDate: targetDate,
        coefficient: 100,
        reschedule,
      });

      // Assert
      expect(successfulReschedules).toHaveLength(1);
      expect(successfulReschedules[0]).toEqual({
        chatId: 'test-chat',
        warehouseName: 'Test Warehouse',
        effectiveDate: targetDate,
        coefficient: 100,
        reschedule,
      });
    });

    test('should log successful reschedule details', () => {
      // Arrange
      const reschedule = createReschedule({
        id: 'reschedule-test',
        supplyId: '67890',
        warehouseId: 456,
      });
      const targetDate = getFutureDate(7);

      // Act - should not throw
      expect(() => {
        service.logSuccessfulReschedule(reschedule, targetDate, 1);
      }).not.toThrow();
    });
  });

  describe('error handling and categorization', () => {
    test('should handle date unavailable error', async () => {
      // Arrange
      const dateUnavailableError = new Error('Эта дата уже недоступна');
      mockSupplyService.updateSupplyPlan.mockRejectedValue(
        dateUnavailableError,
      );

      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);
      const account = { id: 'account-123' };
      const latency = 1000;

      // Act & Assert
      await expect(
        service.createRescheduleTask({
          reschedule,
          effectiveDate: targetDate,
          account,
          user: monitoringUser,
          latency,
        }),
      ).rejects.toThrow();
    });

    test('should handle too active error', async () => {
      // Arrange
      const tooActiveError = new Error(
        'Заметили, что вы слишком активно создаёте поставки',
      );
      mockSupplyService.updateSupplyPlan.mockRejectedValue(tooActiveError);

      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);
      const account = { id: 'account-123' };
      const latency = 1000;

      // Act & Assert
      await expect(
        service.createRescheduleTask({
          reschedule,
          effectiveDate: targetDate,
          account,
          user: monitoringUser,
          latency,
        }),
      ).rejects.toThrow();
    });

    test('should handle critical error', async () => {
      // Arrange
      mockBookingErrorService.isCriticalBookingError.mockReturnValue(true);
      const criticalError = new Error('Critical system error');
      mockSupplyService.updateSupplyPlan.mockRejectedValue(criticalError);

      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);
      const account = { id: 'account-123' };
      const latency = 1000;

      // Act & Assert
      await expect(
        service.createRescheduleTask({
          reschedule,
          effectiveDate: targetDate,
          account,
          user: monitoringUser,
          latency,
        }),
      ).rejects.toThrow();
    });

    test('should handle non-critical error', async () => {
      // Arrange
      mockBookingErrorService.isCriticalBookingError.mockReturnValue(false);
      const nonCriticalError = new Error('Temporary error');
      mockSupplyService.updateSupplyPlan.mockRejectedValue(nonCriticalError);

      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);
      const account = { id: 'account-123' };
      const latency = 1000;

      // Act & Assert
      await expect(
        service.createRescheduleTask({
          reschedule,
          effectiveDate: targetDate,
          account,
          user: monitoringUser,
          latency,
        }),
      ).rejects.toThrow();
    });
  });

  describe('status updates', () => {
    test('should update reschedule status after successful reschedule', async () => {
      // Arrange
      const reschedule = createReschedule();
      const targetDate = getFutureDate(7);
      const monitoringUser = createMonitoringUser();
      const account = { id: 'account-123' };
      const latency = 1000;

      mockSupplyService.updateSupplyPlan.mockResolvedValue({
        success: true,
        data: { id: 'supply-123' },
      });

      // Act
      await service.createRescheduleTask({
        reschedule,
        effectiveDate: targetDate,
        account,
        user: monitoringUser,
        latency,
      });

      // Assert
      expect(mockSupplyService.updateSupplyPlan).toHaveBeenCalled();
    });
  });

  describe('ban duration constants', () => {
    test('should use correct ban duration for date unavailable errors', () => {
      // Arrange
      const error = { message: 'Эта дата уже недоступна' };

      // Act
      const category = sharedErrorHandlingService.categorizeError(error);

      // Assert
      expect(category.type).toBe('date_unavailable');
      expect(category.duration).toBe(2000); // 2 seconds
    });

    test('should use correct ban duration for too active errors', () => {
      // Arrange
      const error = {
        message: 'Заметили, что вы слишком активно создаёте поставки',
      };

      // Act
      const category = sharedErrorHandlingService.categorizeError(error);

      // Assert
      expect(category.type).toBe('too_active');
      expect(category.duration).toBe(600000); // 10 minutes
    });

    test('should use correct ban duration for critical errors', () => {
      // Arrange
      mockBookingErrorService.isCriticalBookingError.mockReturnValue(true);
      const error = { message: 'Critical error' };

      // Act
      const category = sharedErrorHandlingService.categorizeError(error);

      // Assert
      expect(category.type).toBe('critical');
      expect(category.duration).toBe(60000); // 60 seconds
    });

    test('should use correct ban duration for non-critical errors', () => {
      // Arrange
      mockBookingErrorService.isCriticalBookingError.mockReturnValue(false);
      const error = { message: 'Non-critical error' };

      // Act
      const category = sharedErrorHandlingService.categorizeError(error);

      // Assert
      expect(category.type).toBe('non_critical');
      expect(category.duration).toBe(60000); // 60 seconds
    });
  });
});
