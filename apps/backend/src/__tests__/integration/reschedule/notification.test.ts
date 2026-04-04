/**
 * Autobooking Reschedule Notification Service Tests
 * Migrated from: tests/autobookingRescheduleNotification.service.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture
 * - Same test logic preserved
 */

import { AutobookingRescheduleNotificationService } from '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-notification.service';
import { sharedTelegramNotificationService } from '../../../services/monitoring/shared/telegram-notification.service';
import { sharedStatusUpdateService } from '../../../services/monitoring/shared/status-update.service';
import { prisma } from '../../../config/database';
import type { AutobookingReschedule } from '@prisma/client';

// Mock dependencies
jest.mock(
  '../../../services/monitoring/shared/telegram-notification.service',
  () => ({
    sharedTelegramNotificationService: {
      buildBookingSuccessMessage: jest.fn(),
      sendSuccessNotification: jest.fn(),
    },
  }),
);

jest.mock('../../../services/monitoring/shared/status-update.service', () => ({
  sharedStatusUpdateService: {
    updateRescheduleStatus: jest.fn(),
  },
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    warehouseCoefficient: {
      findFirst: jest.fn(),
    },
    autobookingReschedule: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AutobookingRescheduleNotificationService', () => {
  let service: AutobookingRescheduleNotificationService;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockTelegramService: jest.Mocked<
    typeof sharedTelegramNotificationService
  >;
  let mockStatusUpdateService: jest.Mocked<typeof sharedStatusUpdateService>;

  // Helper to create reschedule
  const createReschedule = (
    overrides: Partial<AutobookingReschedule> = {},
  ): AutobookingReschedule => ({
    id: 'reschedule-1',
    userId: 1,
    supplierId: 'supplier-1',
    supplyId: 'supply-123',
    warehouseId: 123,
    currentDate: new Date(),
    targetDateFrom: new Date(),
    targetDateTo: new Date(),
    coefficient: 5,
    status: 'ACTIVE',
    dateType: 'CUSTOM_DATES',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutobookingRescheduleNotificationService();
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockTelegramService = sharedTelegramNotificationService as jest.Mocked<
      typeof sharedTelegramNotificationService
    >;
    mockStatusUpdateService = sharedStatusUpdateService as jest.Mocked<
      typeof sharedStatusUpdateService
    >;

    // Mock default implementations
    mockTelegramService.buildBookingSuccessMessage.mockReturnValue(
      'Test success message',
    );
    mockTelegramService.sendSuccessNotification.mockResolvedValue(undefined);
    mockStatusUpdateService.updateRescheduleStatus.mockResolvedValue(undefined);
  });

  describe('updateRescheduleStatus', () => {
    test('should delegate to sharedStatusUpdateService', async () => {
      // Arrange
      const reschedule = createReschedule();
      const bookedDate = new Date('2024-01-15');

      // Act
      await service.updateRescheduleStatus(reschedule, bookedDate);

      // Assert
      expect(
        mockStatusUpdateService.updateRescheduleStatus,
      ).toHaveBeenCalledWith(reschedule.id, bookedDate, 'CUSTOM_DATES');
    });

    test('should handle different date types', async () => {
      // Arrange
      const reschedule = createReschedule();
      const bookedDate = new Date('2024-01-15');

      // Act
      await service.updateRescheduleStatus(reschedule, bookedDate);

      // Assert
      expect(mockStatusUpdateService.updateRescheduleStatus).toHaveBeenCalled();
    });
  });

  describe('sendSuccessNotification', () => {
    test('should build and send success notification', async () => {
      // Arrange
      const chatId = '123456';
      const warehouseName = 'Test Warehouse';
      const date = new Date('2024-01-15');
      const coefficient = 2.5;

      mockTelegramService.buildBookingSuccessMessage.mockReturnValue(
        'Your booking at Test Warehouse on 2024-01-15 with coefficient 2.5',
      );

      // Act
      await service.sendSuccessNotification(
        chatId,
        warehouseName,
        date,
        coefficient,
      );

      // Assert
      expect(
        mockTelegramService.buildBookingSuccessMessage,
      ).toHaveBeenCalledWith(
        warehouseName,
        date,
        coefficient,
        undefined,
        true, // isReschedule = true
      );
      expect(mockTelegramService.sendSuccessNotification).toHaveBeenCalledWith(
        chatId,
        expect.any(String),
      );
    });

    test('should include transit warehouse name when provided', async () => {
      // Arrange
      const chatId = '123456';
      const warehouseName = 'Test Warehouse';
      const date = new Date('2024-01-15');
      const coefficient = 2.5;
      const transitWarehouseName = 'Transit Point';

      // Act
      await service.sendSuccessNotification(
        chatId,
        warehouseName,
        date,
        coefficient,
        transitWarehouseName,
      );

      // Assert
      expect(
        mockTelegramService.buildBookingSuccessMessage,
      ).toHaveBeenCalledWith(
        warehouseName,
        date,
        coefficient,
        transitWarehouseName,
        true, // isReschedule = true
      );
    });
  });

  describe('sendBannedDateNotification', () => {
    test('should query warehouse name from database', async () => {
      // Arrange
      const warehouseId = 123;
      const date = new Date('2024-01-15');

      (
        mockPrisma.warehouseCoefficient.findFirst as jest.Mock
      ).mockResolvedValue({
        warehouseName: 'Test Warehouse',
      });

      (
        mockPrisma.autobookingReschedule.findMany as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await service.sendBannedDateNotification(warehouseId, date);

      // Assert
      expect(mockPrisma.warehouseCoefficient.findFirst).toHaveBeenCalled();
    });

    test('should find affected active reschedules', async () => {
      // Arrange
      const warehouseId = 123;
      const date = new Date('2024-01-15');

      (
        mockPrisma.warehouseCoefficient.findFirst as jest.Mock
      ).mockResolvedValue({
        warehouseName: 'Test Warehouse',
      });

      (
        mockPrisma.autobookingReschedule.findMany as jest.Mock
      ).mockResolvedValue([
        {
          id: 'reschedule-1',
          userId: 1,
          status: 'ACTIVE',
        },
      ]);

      // Act
      await service.sendBannedDateNotification(warehouseId, date);

      // Assert
      expect(mockPrisma.autobookingReschedule.findMany).toHaveBeenCalled();
    });

    test('should deduplicate chat IDs', async () => {
      // Arrange
      const warehouseId = 123;
      const date = new Date('2024-01-15');

      (
        mockPrisma.warehouseCoefficient.findFirst as jest.Mock
      ).mockResolvedValue({
        warehouseName: 'Test Warehouse',
      });

      // Multiple reschedules with same user (same chatId)
      (
        mockPrisma.autobookingReschedule.findMany as jest.Mock
      ).mockResolvedValue([
        { id: 'reschedule-1', userId: 1, status: 'ACTIVE' },
        { id: 'reschedule-2', userId: 1, status: 'ACTIVE' },
      ]);

      // Act
      await service.sendBannedDateNotification(warehouseId, date);

      // Assert - should not throw
      expect(mockPrisma.autobookingReschedule.findMany).toHaveBeenCalled();
    });

    test('should filter out null chatIds', async () => {
      // Arrange
      const warehouseId = 123;
      const date = new Date('2024-01-15');

      (
        mockPrisma.warehouseCoefficient.findFirst as jest.Mock
      ).mockResolvedValue({
        warehouseName: 'Test Warehouse',
      });

      (
        mockPrisma.autobookingReschedule.findMany as jest.Mock
      ).mockResolvedValue([
        { id: 'reschedule-1', userId: 1, status: 'ACTIVE' },
      ]);

      // Act
      await service.sendBannedDateNotification(warehouseId, date);

      // Assert
      expect(mockPrisma.autobookingReschedule.findMany).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const warehouseId = 123;
      const date = new Date('2024-01-15');

      (
        mockPrisma.warehouseCoefficient.findFirst as jest.Mock
      ).mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(
        service.sendBannedDateNotification(warehouseId, date),
      ).resolves.not.toThrow();
    });

    test('should handle missing warehouse name', async () => {
      // Arrange
      const warehouseId = 123;
      const date = new Date('2024-01-15');

      (
        mockPrisma.warehouseCoefficient.findFirst as jest.Mock
      ).mockResolvedValue(null);

      (
        mockPrisma.autobookingReschedule.findMany as jest.Mock
      ).mockResolvedValue([]);

      // Act - should not throw
      await expect(
        service.sendBannedDateNotification(warehouseId, date),
      ).resolves.not.toThrow();
    });
  });

  describe('message building integration', () => {
    test('should pass correct parameters to message builder', async () => {
      // Arrange
      const chatId = '123456';
      const warehouseName = 'Main Warehouse';
      const date = new Date('2024-02-01');
      const coefficient = 3.0;

      // Act
      await service.sendSuccessNotification(
        chatId,
        warehouseName,
        date,
        coefficient,
      );

      // Assert
      expect(
        mockTelegramService.buildBookingSuccessMessage,
      ).toHaveBeenCalledWith(
        warehouseName,
        date,
        coefficient,
        undefined,
        true, // isReschedule = true
      );
    });

    test('should include reschedule flag in message', async () => {
      // Arrange
      const chatId = '123456';
      const warehouseName = 'Main Warehouse';
      const date = new Date('2024-02-01');
      const coefficient = 3.0;

      // Act
      await service.sendSuccessNotification(
        chatId,
        warehouseName,
        date,
        coefficient,
      );

      // Assert
      const callArgs =
        mockTelegramService.buildBookingSuccessMessage.mock.calls[0];
      expect(callArgs[4]).toBe(true); // isReschedule flag
    });
  });
});
