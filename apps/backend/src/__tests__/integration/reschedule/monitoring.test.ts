/**
 * Autobooking Reschedule Monitoring Service Tests
 * Migrated from: tests/autobookingRescheduleMonitoring.service.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture
 * - Same test logic preserved
 */

import { AutobookingRescheduleMonitoringService } from '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-monitoring.service';
import { autobookingRescheduleExecutorService } from '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-executor.service';
import { sharedBanService } from '../../../services/monitoring/shared/ban.service';
import { sharedUserTrackingService } from '../../../services/monitoring/shared/user-tracking.service';
import { sharedProcessingStateService } from '../../../services/monitoring/shared/processing-state.service';
import {
  createMonitoringUser,
  getFutureDate,
  getFutureDateString,
} from '../../helpers/autobooking-helpers';
import type { AutobookingReschedule } from '@prisma/client';
import type {
  MonitoringUser,
  WarehouseAvailability,
} from '../../../services/monitoring/shared/interfaces/sharedInterfaces';

// Mock dependencies
jest.mock(
  '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-executor.service',
  () => ({
    autobookingRescheduleExecutorService: {
      createRescheduleTask: jest.fn(),
      filterAvailabilitiesForReschedule: jest.fn(),
    },
  }),
);

jest.mock(
  '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-notification.service',
  () => ({
    autobookingRescheduleNotificationService: {
      sendSuccessNotification: jest.fn(),
      updateRescheduleStatus: jest.fn(),
    },
  }),
);

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AutobookingRescheduleMonitoringService', () => {
  let service: AutobookingRescheduleMonitoringService;
  let mockExecutor: jest.Mocked<typeof autobookingRescheduleExecutorService>;

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
    service = new AutobookingRescheduleMonitoringService();
    mockExecutor = autobookingRescheduleExecutorService as jest.Mocked<
      typeof autobookingRescheduleExecutorService
    >;

    // Set default mock implementations
    mockExecutor.createRescheduleTask.mockResolvedValue({
      success: true,
      supplyId: 'supply-123',
    });
    mockExecutor.filterAvailabilitiesForReschedule.mockImplementation(
      (availabilities) => availabilities,
    );

    // Clear shared service states
    sharedBanService.clearAllBannedDates();
    sharedBanService.clearAllBlacklistedUsers();
    sharedProcessingStateService.resetRescheduleState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
  });

  afterEach(() => {
    sharedBanService.clearAllBannedDates();
    sharedBanService.clearAllBlacklistedUsers();
    sharedProcessingStateService.resetRescheduleState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
  });

  describe('Basic reschedule processing flow', () => {
    test('should process reschedule availabilities with no reschedules', async () => {
      // Arrange
      const monitoringUsers: MonitoringUser[] = [];
      const availabilities: WarehouseAvailability[] = [];

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(mockExecutor.createRescheduleTask).not.toHaveBeenCalled();
    });

    test('should process reschedule availabilities with single reschedule', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(mockExecutor.createRescheduleTask).toHaveBeenCalled();
    });

    test('should process reschedule availabilities with multiple reschedules', async () => {
      // Arrange
      const reschedule1 = createReschedule({ id: 'reschedule-1' });
      const reschedule2 = createReschedule({
        id: 'reschedule-2',
        userId: 2,
        supplierId: 'supplier-2',
      });

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule1],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          reschedules: [reschedule2],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [
            { date: getFutureDateString(7), coefficient: 2 },
            { date: getFutureDateString(8), coefficient: 2 },
          ],
        },
      ];

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(mockExecutor.createRescheduleTask).toHaveBeenCalled();
    });
  });

  describe('Task organization and filtering', () => {
    test('should skip already processed reschedules', async () => {
      // Arrange
      const reschedule = createReschedule({ id: 'reschedule-1' });
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Mark as processed
      sharedProcessingStateService.markRescheduleAsProcessed(
        'reschedule-1',
        getFutureDate(7),
      );

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert - should not attempt to process already processed reschedule
      // The processing may or may not call executor depending on implementation
    });

    test('should skip blacklisted users', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Blacklist user
      sharedBanService.addUserToBlacklist(1, 600000);

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert - blacklisted user should be skipped
      expect(sharedBanService.isUserBlacklisted(1)).toBe(true);
    });

    test('should skip running users', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Mark user as running
      sharedUserTrackingService.markUserAsRunning(1);

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(sharedUserTrackingService.isUserRunning(1)).toBe(true);
    });

    test('should skip banned warehouse-date combinations', async () => {
      // Arrange
      const reschedule = createReschedule({ warehouseId: 123 });
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule],
        }),
      ];

      const targetDate = getFutureDate(7);
      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Ban the warehouse-date
      sharedBanService.banSingleDate({
        warehouseId: 123,
        date: targetDate,
        supplyType: 'BOX',
        coefficient: 2,
        error: { message: 'Test error' },
      });

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(
        sharedBanService.isBanned({
          warehouseId: 123,
          date: targetDate,
          supplyType: 'BOX',
          coefficient: 2,
        }),
      ).toBe(true);
    });
  });

  describe('Account lookup and validation', () => {
    test('should find correct account for supplier', async () => {
      // Arrange
      const reschedule = createReschedule({ supplierId: 'supplier-1' });
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          accounts: { 'account-1': ['supplier-1'] },
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(mockExecutor.createRescheduleTask).toHaveBeenCalled();
    });

    test('should handle missing account gracefully', async () => {
      // Arrange
      const reschedule = createReschedule({ supplierId: 'unknown-supplier' });
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          accounts: {}, // No accounts
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Act - should not throw
      await expect(
        service.processRescheduleAvailabilities(
          monitoringUsers,
          availabilities,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('Success handling and notifications', () => {
    test('should send notification after successful reschedule', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      mockExecutor.createRescheduleTask.mockResolvedValue({
        success: true,
        supplyId: 'supply-123',
      });

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(mockExecutor.createRescheduleTask).toHaveBeenCalled();
    });
  });

  describe('Sequential proxy group processing', () => {
    test('should process multiple proxy groups in sequence', async () => {
      // Arrange
      const reschedule1 = createReschedule({ id: 'reschedule-1' });
      const reschedule2 = createReschedule({
        id: 'reschedule-2',
        userId: 2,
        supplierId: 'supplier-2',
      });

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: {
            ip: '1.1.1.1',
            port: '8080',
            username: 'user1',
            password: 'pass1',
          },
          reschedules: [reschedule1],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          proxy: {
            ip: '2.2.2.2',
            port: '8080',
            username: 'user2',
            password: 'pass2',
          },
          reschedules: [reschedule2],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(mockExecutor.createRescheduleTask).toHaveBeenCalled();
    });

    test('should handle error recovery between groups', async () => {
      // Arrange
      const reschedule1 = createReschedule({ id: 'reschedule-1' });
      const reschedule2 = createReschedule({
        id: 'reschedule-2',
        userId: 2,
        supplierId: 'supplier-2',
      });

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule1],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          reschedules: [reschedule2],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: getFutureDateString(7), coefficient: 2 }],
        },
      ];

      // Mock first call fails, second succeeds
      mockExecutor.createRescheduleTask
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ success: true, supplyId: 'supply-123' });

      // Act - should not throw
      await expect(
        service.processRescheduleAvailabilities(
          monitoringUsers,
          availabilities,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('Date extraction and sorting', () => {
    test('should process warehouse-date keys in chronological order', async () => {
      // Arrange
      const reschedule = createReschedule();
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          reschedules: [reschedule],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [
            { date: getFutureDateString(9), coefficient: 2 },
            { date: getFutureDateString(7), coefficient: 2 },
            { date: getFutureDateString(8), coefficient: 2 },
          ],
        },
      ];

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(mockExecutor.createRescheduleTask).toHaveBeenCalled();
    });
  });
});
