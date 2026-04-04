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
import { autobookingRescheduleNotificationService } from '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-notification.service';
import { sharedBanService } from '../../../services/monitoring/shared/ban.service';
import { sharedTaskOrganizerService } from '../../../services/monitoring/shared/task-organizer.service';
import { sharedUserTrackingService } from '../../../services/monitoring/shared/user-tracking.service';
import { sharedProcessingStateService } from '../../../services/monitoring/shared/processing-state.service';
import { sharedLatencyService } from '../../../services/monitoring/shared/latency.service';
import type {
  MonitoringUser,
  WarehouseAvailability,
} from '../../../services/monitoring/interfaces/reschedule.interfaces';
import type { AutobookingReschedule } from '@prisma/client';

// Mock dependencies
jest.mock(
  '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-executor.service',
  () => ({
    autobookingRescheduleExecutorService: {
      createRescheduleTask: jest.fn(),
      addSuccessfulReschedule: jest.fn(),
      logSuccessfulReschedule: jest.fn(),
      handleRescheduleProcessingError: jest.fn(),
    },
  }),
);

jest.mock(
  '../../../services/monitoring/autobooking-reschedule/autobooking-reschedule-notification.service',
  () => ({
    autobookingRescheduleNotificationService: {
      updateRescheduleStatus: jest.fn(),
      sendSuccessNotification: jest.fn(),
    },
  }),
);

// Helper functions
const createReschedule = (
  overrides: Partial<AutobookingReschedule> = {},
): AutobookingReschedule => {
  const isCustomDates =
    (overrides.dateType || 'CUSTOM_DATES_SINGLE') === 'CUSTOM_DATES_SINGLE';
  const defaultCustomDates = isCustomDates ? [new Date('2025-09-01')] : [];

  return {
    id: 'reschedule-101',
    userId: 1,
    supplierId: 'supplier-1',
    supplyId: '12345',
    warehouseId: 123,
    supplyType: 'BOX',
    dateType: 'CUSTOM_DATES_SINGLE',
    startDate: null,
    endDate: null,
    currentDate: new Date('2025-09-01'),
    customDates: defaultCustomDates,
    completedDates: [],
    maxCoefficient: 1000,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

const createMonitoringUser = (
  overrides: Partial<MonitoringUser> = {},
): MonitoringUser => {
  const userId = overrides.userId || 1;
  const accountId = `account-${userId}`;

  // Get supplierId from accounts if provided, otherwise default
  const accounts = overrides.accounts || {
    [accountId]: ['supplier-1'],
  };

  return {
    userId,
    chatId: 'test-chat-id',
    proxy: {
      host: `${userId}.${userId}.${userId}.${userId}`,
      port: 8080,
      username: `user${userId}`,
      password: `pass${userId}`,
    },
    userAgent: 'test-agent',
    autobookings: [],
    supplyTriggers: [],
    reschedules: [],
    accounts,
    ...overrides,
  };
};

const createAvailability = (
  overrides: Partial<WarehouseAvailability> = {},
): WarehouseAvailability => {
  return {
    warehouseId: 123,
    warehouseName: 'Test Warehouse',
    boxTypeID: 2 as const,
    availableDates: [{ date: '2025-09-01', coefficient: 100 }],
    ...overrides,
  };
};

describe('AutobookingRescheduleMonitoringService - Core Functionality', () => {
  let service: AutobookingRescheduleMonitoringService;
  let mockExecutorService: jest.Mocked<
    typeof autobookingRescheduleExecutorService
  >;
  let mockNotificationService: jest.Mocked<
    typeof autobookingRescheduleNotificationService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutobookingRescheduleMonitoringService();

    // Get mock references
    mockExecutorService = autobookingRescheduleExecutorService as jest.Mocked<
      typeof autobookingRescheduleExecutorService
    >;
    mockNotificationService =
      autobookingRescheduleNotificationService as jest.Mocked<
        typeof autobookingRescheduleNotificationService
      >;

    // Setup default mocks for executor
    mockExecutorService.createRescheduleTask.mockResolvedValue(undefined);
    mockExecutorService.addSuccessfulReschedule.mockImplementation(() => {
      /* intentionally empty */
    });
    mockExecutorService.logSuccessfulReschedule.mockImplementation(() => {
      /* intentionally empty */
    });
    mockExecutorService.handleRescheduleProcessingError.mockResolvedValue(
      undefined,
    );

    // Setup default mocks for notification service
    mockNotificationService.updateRescheduleStatus.mockResolvedValue(undefined);
    mockNotificationService.sendSuccessNotification.mockResolvedValue(
      undefined,
    );

    // Setup default mocks for shared services
    jest
      .spyOn(
        sharedTaskOrganizerService,
        'organizeReschedulesByWarehouseDateTyped',
      )
      .mockReturnValue(new Map());
    jest
      .spyOn(sharedProcessingStateService, 'isRescheduleProcessed')
      .mockReturnValue(false);
    jest
      .spyOn(sharedProcessingStateService, 'markRescheduleAsProcessed')
      .mockImplementation(() => {
        /* intentionally empty */
      });
    jest
      .spyOn(sharedProcessingStateService, 'resetRescheduleState')
      .mockImplementation(() => {
        /* intentionally empty */
      });
    jest
      .spyOn(sharedUserTrackingService, 'isUserRunning')
      .mockReturnValue(false);
    jest
      .spyOn(sharedUserTrackingService, 'trackUsersAsRunning')
      .mockImplementation(() => {
        /* intentionally empty */
      });
    jest
      .spyOn(sharedUserTrackingService, 'removeUsersFromRunning')
      .mockImplementation(() => {
        /* intentionally empty */
      });
    jest.spyOn(sharedBanService, 'isUserBlacklisted').mockReturnValue(false);
    jest.spyOn(sharedBanService, 'isBanned').mockReturnValue(false);
    jest.spyOn(sharedLatencyService, 'generateLatency').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic reschedule processing flow', () => {
    test('should complete successfully when no reschedules to process', async () => {
      // Arrange
      const monitoringUsers: MonitoringUser[] = [];
      const availabilities: WarehouseAvailability[] = [];

      // Act
      await service.processRescheduleAvailabilities(
        monitoringUsers,
        availabilities,
      );

      // Assert
      expect(
        sharedProcessingStateService.resetRescheduleState,
      ).toHaveBeenCalled();
      expect(
        sharedTaskOrganizerService.organizeReschedulesByWarehouseDateTyped,
      ).toHaveBeenCalledWith(monitoringUsers, availabilities);
    });

    test('should process single reschedule successfully', async () => {
      // Arrange
      const reschedule = createReschedule();
      const user = createMonitoringUser({ reschedules: [reschedule] });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert
      expect(
        sharedUserTrackingService.trackUsersAsRunning,
      ).toHaveBeenCalledWith([1]);
      expect(
        sharedProcessingStateService.markRescheduleAsProcessed,
      ).toHaveBeenCalledWith(reschedule.id);
      expect(mockExecutorService.createRescheduleTask).toHaveBeenCalledWith({
        reschedule,
        effectiveDate: expect.any(Date),
        account: { id: 'account-1' },
        user,
        latency: 1000,
      });
      expect(
        sharedUserTrackingService.removeUsersFromRunning,
      ).toHaveBeenCalledWith([1]);
    });

    test('should process multiple reschedules in sequence', async () => {
      // Arrange
      const reschedule1 = createReschedule({ id: 'reschedule-1', userId: 1 });
      const reschedule2 = createReschedule({
        id: 'reschedule-2',
        userId: 2,
        supplierId: 'supplier-2',
      });
      const user1 = createMonitoringUser({
        userId: 1,
        reschedules: [reschedule1],
      });
      const user2 = createMonitoringUser({
        userId: 2,
        reschedules: [reschedule2],
        accounts: { 'account-2': ['supplier-2'] },
      });
      const availability = createAvailability();

      const rescheduleTask1 = {
        reschedule: reschedule1,
        user: user1,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };
      const rescheduleTask2 = {
        reschedule: reschedule2,
        user: user2,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask1, rescheduleTask2]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Act
      await service.processRescheduleAvailabilities(
        [user1, user2],
        [availability],
      );

      // Assert
      expect(
        sharedUserTrackingService.trackUsersAsRunning,
      ).toHaveBeenCalledWith([1, 2]);
      expect(mockExecutorService.createRescheduleTask).toHaveBeenCalled();
      expect(
        sharedUserTrackingService.removeUsersFromRunning,
      ).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('Task organization and filtering', () => {
    test('should skip already processed reschedules', async () => {
      // Arrange
      const reschedule = createReschedule();
      const user = createMonitoringUser({ reschedules: [reschedule] });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);
      jest
        .spyOn(sharedProcessingStateService, 'isRescheduleProcessed')
        .mockReturnValue(true); // Already processed

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert
      expect(mockExecutorService.createRescheduleTask).not.toHaveBeenCalled();
      expect(
        sharedUserTrackingService.trackUsersAsRunning,
      ).not.toHaveBeenCalled();
    });

    test('should skip blacklisted users', async () => {
      // Arrange
      const reschedule = createReschedule();
      const user = createMonitoringUser({ reschedules: [reschedule] });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);
      jest.spyOn(sharedBanService, 'isUserBlacklisted').mockReturnValue(true); // User is blacklisted

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert
      expect(mockExecutorService.createRescheduleTask).not.toHaveBeenCalled();
      expect(
        sharedUserTrackingService.trackUsersAsRunning,
      ).not.toHaveBeenCalled();
    });

    test('should skip running users', async () => {
      // Arrange
      const reschedule = createReschedule();
      const user = createMonitoringUser({ reschedules: [reschedule] });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);
      jest
        .spyOn(sharedUserTrackingService, 'isUserRunning')
        .mockReturnValue(true); // User is already running

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert
      expect(mockExecutorService.createRescheduleTask).not.toHaveBeenCalled();
      expect(
        sharedUserTrackingService.trackUsersAsRunning,
      ).not.toHaveBeenCalled();
    });

    test('should skip banned warehouse-date combinations', async () => {
      // Arrange
      const reschedule = createReschedule();
      const user = createMonitoringUser({ reschedules: [reschedule] });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);
      jest.spyOn(sharedBanService, 'isBanned').mockReturnValue(true); // Warehouse-date is banned

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert
      expect(mockExecutorService.createRescheduleTask).not.toHaveBeenCalled();
    });
  });

  describe('Account lookup and validation', () => {
    test('should successfully find account for reschedule', async () => {
      // Arrange
      const reschedule = createReschedule({ supplierId: 'supplier-1' });
      const user = createMonitoringUser({
        userId: 1,
        accounts: {
          'account-1': ['supplier-1', 'supplier-2'],
          'account-2': ['supplier-3'],
        },
        reschedules: [reschedule],
      });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert
      expect(mockExecutorService.createRescheduleTask).toHaveBeenCalledWith({
        reschedule,
        effectiveDate: expect.any(Date),
        account: { id: 'account-1' }, // Should find the correct account
        user,
        latency: 1000,
      });
    });

    test('should throw error when no account found for supplier', async () => {
      // Arrange
      const reschedule = createReschedule({ supplierId: 'missing-supplier' });
      const user = createMonitoringUser({
        accounts: {
          'account-1': ['supplier-1', 'supplier-2'],
        },
        reschedules: [reschedule],
      });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Act - should not throw, error is handled internally
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert - should attempt to remove user from running even on error
      expect(
        sharedUserTrackingService.removeUsersFromRunning,
      ).toHaveBeenCalled();
    });
  });

  describe('Success handling and notifications', () => {
    test('should handle successful reschedule notifications', async () => {
      // Arrange
      const reschedule = createReschedule();
      const user = createMonitoringUser({
        chatId: 'test-chat',
        reschedules: [reschedule],
      });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Mock successful reschedule - simulate adding to successfulReschedules
      mockExecutorService.addSuccessfulReschedule.mockImplementation(
        (successfulReschedules: any[], params: any) => {
          successfulReschedules.push({
            chatId: 'test-chat',
            warehouseName: 'Test Warehouse',
            effectiveDate: new Date('2025-09-01'),
            coefficient: 100,
            reschedule,
          });
        },
      );

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert
      expect(
        mockNotificationService.updateRescheduleStatus,
      ).toHaveBeenCalledWith(reschedule, expect.any(Date));
      expect(
        mockNotificationService.sendSuccessNotification,
      ).toHaveBeenCalledWith(
        'test-chat',
        'Test Warehouse',
        expect.any(Date),
        100,
      );
    });

    test('should log processing results correctly', async () => {
      // Arrange
      const reschedule = createReschedule();
      const user = createMonitoringUser({ reschedules: [reschedule] });
      const availability = createAvailability();

      const rescheduleTask = {
        reschedule,
        user,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert - verify the service completed without errors
      expect(mockExecutorService.createRescheduleTask).toHaveBeenCalled();
    });
  });

  describe('Sequential proxy group processing', () => {
    test('should process multiple proxy groups in sequence', async () => {
      // Arrange
      const reschedule1 = createReschedule({ id: 'reschedule-1', userId: 1 });
      const reschedule2 = createReschedule({
        id: 'reschedule-2',
        userId: 2,
        supplierId: 'supplier-2',
      });
      const user1 = createMonitoringUser({
        userId: 1,
        reschedules: [reschedule1],
      });
      const user2 = createMonitoringUser({
        userId: 2,
        reschedules: [reschedule2],
        accounts: { 'account-2': ['supplier-2'] },
      });
      const availability = createAvailability();

      const rescheduleTask1 = {
        reschedule: reschedule1,
        user: user1,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };
      const rescheduleTask2 = {
        reschedule: reschedule2,
        user: user2,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      // Two proxy groups
      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask1], [rescheduleTask2]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Act
      await service.processRescheduleAvailabilities(
        [user1, user2],
        [availability],
      );

      // Assert
      expect(mockExecutorService.createRescheduleTask).toHaveBeenCalledTimes(2);
      // Should process groups and track users
      expect(
        sharedUserTrackingService.trackUsersAsRunning,
      ).toHaveBeenCalledWith([1]);
      expect(
        sharedUserTrackingService.trackUsersAsRunning,
      ).toHaveBeenCalledWith([2]);
    });

    test('should continue processing when non-DATE_UNAVAILABLE error occurs', async () => {
      // Arrange
      const reschedule1 = createReschedule({ id: 'reschedule-1', userId: 1 });
      const reschedule2 = createReschedule({
        id: 'reschedule-2',
        userId: 2,
        supplierId: 'supplier-2',
      });
      const user1 = createMonitoringUser({
        userId: 1,
        reschedules: [reschedule1],
      });
      const user2 = createMonitoringUser({
        userId: 2,
        reschedules: [reschedule2],
        accounts: { 'account-2': ['supplier-2'] },
      });
      const availability = createAvailability();

      const rescheduleTask1 = {
        reschedule: reschedule1,
        user: user1,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };
      const rescheduleTask2 = {
        reschedule: reschedule2,
        user: user2,
        warehouseName: 'Test Warehouse',
        coefficient: 100,
        availability,
      };

      const warehouseDateMap = new Map([
        ['123-Mon Sep 01 2025-BOX', [[rescheduleTask1], [rescheduleTask2]]],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // First group throws a non-date-unavailable error, second should still process
      mockExecutorService.createRescheduleTask
        .mockRejectedValueOnce(new Error('Some other error'))
        .mockResolvedValueOnce(undefined);

      // Mock the error handling to NOT throw (non-critical error)
      mockExecutorService.handleRescheduleProcessingError.mockResolvedValue(
        undefined,
      );

      // Act
      await service.processRescheduleAvailabilities(
        [user1, user2],
        [availability],
      );

      // Assert
      expect(mockExecutorService.createRescheduleTask).toHaveBeenCalledTimes(2); // Both groups processed
      expect(
        sharedUserTrackingService.removeUsersFromRunning,
      ).toHaveBeenCalledTimes(2); // Cleanup called for both groups
    });
  });

  describe('Date extraction and sorting', () => {
    test('should extract and sort warehouse-date keys by date', async () => {
      // Arrange
      const reschedule1 = createReschedule({
        id: 'reschedule-1',
        customDates: [new Date('2025-09-03')],
      });
      const reschedule2 = createReschedule({
        id: 'reschedule-2',
        customDates: [new Date('2025-09-01')],
      });
      const reschedule3 = createReschedule({
        id: 'reschedule-3',
        customDates: [new Date('2025-09-02')],
      });

      const user = createMonitoringUser({
        reschedules: [reschedule1, reschedule2, reschedule3],
      });
      const availability = createAvailability();

      const warehouseDateMap = new Map([
        [
          '123-Wed Sep 03 2025-BOX',
          [
            [
              {
                reschedule: reschedule1,
                user,
                warehouseName: 'Test',
                coefficient: 100,
                availability,
              },
            ],
          ],
        ],
        [
          '123-Mon Sep 01 2025-BOX',
          [
            [
              {
                reschedule: reschedule2,
                user,
                warehouseName: 'Test',
                coefficient: 100,
                availability,
              },
            ],
          ],
        ],
        [
          '123-Tue Sep 02 2025-BOX',
          [
            [
              {
                reschedule: reschedule3,
                user,
                warehouseName: 'Test',
                coefficient: 100,
                availability,
              },
            ],
          ],
        ],
      ]);

      jest
        .spyOn(
          sharedTaskOrganizerService,
          'organizeReschedulesByWarehouseDateTyped',
        )
        .mockReturnValue(warehouseDateMap as any);

      // Act
      await service.processRescheduleAvailabilities([user], [availability]);

      // Assert - should process all three dates
      expect(mockExecutorService.createRescheduleTask).toHaveBeenCalledTimes(3);
    });
  });
});
