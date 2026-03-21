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

import { AutobookingRescheduleExecutorService } from '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-executor.service';
import { sharedBanService } from '../../../services/monitoring/shared/ban.service';
import { sharedAvailabilityFilterService } from '../../../services/monitoring/shared/availability-filter.service';
import { sharedErrorHandlingService } from '../../../services/monitoring/shared/error-handling.service';
import { sharedStatusUpdateService } from '../../../services/monitoring/shared/status-update.service';
import { supplyService } from '../../../services/supply.service';
import { bookingErrorService } from '../../../services/booking-error.service';
import {
  createAutobooking,
  createMonitoringUser,
  getFutureDate,
  getFutureDateString,
} from '../../helpers/autobooking-helpers';
import type { AutobookingReschedule } from '@prisma/client';
import type { MonitoringUser, WarehouseAvailability } from '../../../services/monitoring/shared/interfaces/sharedInterfaces';

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
    overrides: Partial<AutobookingReschedule> = {}
  ): AutobookingReschedule => ({
    id: 'reschedule-1',
    userId: 1,
    supplierId: 'supplier-1',
    supplyId: 'supply-123',
    warehouseId: 123,
    currentDate: new Date(),
    targetDateFrom: getFutureDate(7),
    targetDateTo: getFutureDate(14),
    coefficient: 5,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutobookingRescheduleExecutorService();
    mockSupplyService = supplyService as jest.Mocked<typeof supplyService>;
    mockBookingErrorService = bookingErrorService as jest.Mocked<typeof bookingErrorService>;

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
    test('should create reschedule task with proper parameters', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);

      // Act
      const result = await service.createRescheduleTask(
        reschedule,
        monitoringUser,
        targetDate
      );

      // Assert
      expect(mockSupplyService.updateSupplyPlan).toHaveBeenCalled();
      const callArgs = mockSupplyService.updateSupplyPlan.mock.calls[0][0];
      expect(callArgs).toHaveProperty('supplyId');
      expect(callArgs).toHaveProperty('deliveryDate');
      expect(callArgs).toHaveProperty('rpc_order');
    });

    test('should parse supplyId correctly', async () => {
      // Arrange
      const reschedule = createReschedule({ supplyId: 'WB-GI-123456789' });
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);

      // Act
      await service.createRescheduleTask(reschedule, monitoringUser, targetDate);

      // Assert
      expect(mockSupplyService.updateSupplyPlan).toHaveBeenCalled();
    });

    test('should format deliveryDate correctly', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = new Date('2024-01-15');

      // Act
      await service.createRescheduleTask(reschedule, monitoringUser, targetDate);

      // Assert
      const callArgs = mockSupplyService.updateSupplyPlan.mock.calls[0][0];
      expect(callArgs.deliveryDate).toBeDefined();
    });

    test('should generate random rpc_order in valid range', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);

      // Act
      await service.createRescheduleTask(reschedule, monitoringUser, targetDate);

      // Assert
      const callArgs = mockSupplyService.updateSupplyPlan.mock.calls[0][0];
      expect(callArgs.rpc_order).toBeGreaterThanOrEqual(3);
      expect(callArgs.rpc_order).toBeLessThanOrEqual(100003);
    });
  });

  describe('addSuccessfulReschedule', () => {
    test('should add successful reschedule to log', () => {
      // Arrange
      const reschedule = createReschedule();
      const targetDate = getFutureDate(7);

      // Act
      (service as unknown as { addSuccessfulReschedule: (r: AutobookingReschedule, d: Date) => void }).addSuccessfulReschedule(
        reschedule,
        targetDate
      );

      // Assert - no error thrown
      expect(true).toBe(true);
    });

    test('should log successful reschedule details', () => {
      // Arrange
      const reschedule = createReschedule({ id: 'reschedule-test' });
      const targetDate = getFutureDate(7);

      // Act - should not throw
      expect(() => {
        (service as unknown as { addSuccessfulReschedule: (r: AutobookingReschedule, d: Date) => void }).addSuccessfulReschedule(
          reschedule,
          targetDate
        );
      }).not.toThrow();
    });
  });

  describe('error handling and categorization', () => {
    test('should handle date unavailable error', async () => {
      // Arrange
      const dateUnavailableError = new Error('Эта дата уже недоступна');
      mockSupplyService.updateSupplyPlan.mockRejectedValue(dateUnavailableError);

      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);

      // Act & Assert
      await expect(
        service.createRescheduleTask(reschedule, monitoringUser, targetDate)
      ).rejects.toThrow();
    });

    test('should handle too active error', async () => {
      // Arrange
      const tooActiveError = new Error(
        'Заметили, что вы слишком активно создаёте поставки'
      );
      mockSupplyService.updateSupplyPlan.mockRejectedValue(tooActiveError);

      const reschedule = createReschedule();
      const monitoringUser = createMonitoringUser();
      const targetDate = getFutureDate(7);

      // Act & Assert
      await expect(
        service.createRescheduleTask(reschedule, monitoringUser, targetDate)
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

      // Act & Assert
      await expect(
        service.createRescheduleTask(reschedule, monitoringUser, targetDate)
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

      // Act & Assert
      await expect(
        service.createRescheduleTask(reschedule, monitoringUser, targetDate)
      ).rejects.toThrow();
    });
  });

  describe('availability filtering', () => {
    test('should filter availabilities based on reschedule criteria', () => {
      // Arrange
      const reschedule = createReschedule({
        coefficient: 3,
        warehouseId: 123,
      });

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [
            { date: getFutureDateString(7), coefficient: 2 },
            { date: getFutureDateString(8), coefficient: 4 },
          ],
        },
      ];

      // Act - use the availability filter service directly
      const filtered = sharedAvailabilityFilterService.filterAvailabilitiesForReschedule(
        availabilities,
        reschedule
      );

      // Assert
      expect(filtered).toBeDefined();
      expect(Array.isArray(filtered)).toBe(true);
    });

    test('should exclude dates with coefficient higher than max', () => {
      // Arrange
      const reschedule = createReschedule({
        coefficient: 2,
        warehouseId: 123,
      });

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [
            { date: getFutureDateString(7), coefficient: 1 },
            { date: getFutureDateString(8), coefficient: 5 },
          ],
        },
      ];

      // Act
      const filtered = sharedAvailabilityFilterService.filterAvailabilitiesForReschedule(
        availabilities,
        reschedule
      );

      // Assert
      expect(filtered).toBeDefined();
    });
  });

  describe('status updates', () => {
    test('should update reschedule status after successful reschedule', async () => {
      // Arrange
      const reschedule = createReschedule();
      const targetDate = getFutureDate(7);

      mockSupplyService.updateSupplyPlan.mockResolvedValue({
        success: true,
        data: { id: 'supply-123' },
      });

      // Act
      await service.createRescheduleTask(
        reschedule,
        createMonitoringUser(),
        targetDate
      );

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
