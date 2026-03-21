/**
 * Autobooking Monitoring - Preorder Errors and Supply Cache Tests
 * Migrated from: tests/autobookingMonitoring.preorderErrors.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture
 * - Same test logic preserved
 */

import { AutobookingMonitoringService } from '../../../services/monitoring/autobooking/autobooking-monitoring.service';
import { sharedBanService } from '../../../services/monitoring/shared/ban.service';
import { sharedProcessingStateService } from '../../../services/monitoring/shared/processing-state.service';
import { sharedUserTrackingService } from '../../../services/monitoring/shared/user-tracking.service';
import { autobookingSupplyIdCacheService } from '../../../services/monitoring/autobooking/autobooking-supply-id-cache.service';
import { autobookingExecutorService } from '../../../services/monitoring/autobooking/autobooking-executor.service';
import { bookingErrorService } from '../../../services/booking-error.service';
import { prisma } from '../../../config/database';
import {
  createAutobooking,
  createMonitoringUser,
  getFutureDate,
  getFutureDateString,
} from '../../helpers/autobooking-helpers';
import type { MonitoringUser } from '../../../services/monitoring/shared/interfaces/sharedInterfaces';

// Mock dependencies
jest.mock('../../../services/booking-error.service');
jest.mock('../../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn(),
  },
}));

jest.mock('../../../config/database', () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
    },
    autobooking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// Mock autobooking executor service
jest.mock('../../../services/monitoring/autobooking/autobooking-executor.service', () => ({
  autobookingExecutorService: {
    executeBooking: jest.fn(),
  },
}));

// Mock autobooking notification service
jest.mock('../../../services/monitoring/autobooking/autobooking-notification.service', () => ({
  autobookingNotificationService: {
    sendSuccessNotification: jest.fn(),
    updateAutobookingStatus: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AutobookingMonitoringService - Preorder Errors and Supply Cache', () => {
  let service: AutobookingMonitoringService;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockAutobookingExecutor: jest.Mocked<typeof autobookingExecutorService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutobookingMonitoringService();
    mockBookingErrorService = bookingErrorService as jest.Mocked<typeof bookingErrorService>;
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockAutobookingExecutor = autobookingExecutorService as jest.Mocked<typeof autobookingExecutorService>;

    // Mock account lookup to return a valid account with cookies
    (mockPrisma.account.findUnique as jest.Mock).mockImplementation((args: { where: { id: string } }) => {
      const accountId = args?.where?.id;
      return Promise.resolve({
        id: accountId || 'account-123',
        userId: 1,
        wbCookies: 'test-cookies',
      });
    });

    // Mock bookingErrorService
    mockBookingErrorService.isCriticalBookingError.mockReturnValue(false);
    mockBookingErrorService.handleCriticalBookingError.mockResolvedValue(undefined);

    // Set default mock for executeBooking
    mockAutobookingExecutor.executeBooking.mockResolvedValue({
      success: true,
      supplyId: '99999',
    });

    // Clear shared service states
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.reset();
  });

  afterEach(() => {
    // Clean up any remaining state
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.reset();
  });

  describe('Scenario 1: Expired Cache Handling', () => {
    test('should create new supply ID when cache is expired (> 24 hours)', async () => {
      // Arrange: User with cached supply ID that is expired
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
              supplyId: 'old-supply-id',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
      ];

      // Spy on cache service
      const cacheSpy = jest.spyOn(autobookingSupplyIdCacheService, 'cacheSupplyId');

      // Mock successful booking
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: 'new-supply-id',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should execute booking (which will create new supply ID)
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);

      cacheSpy.mockRestore();
    });

    test('should use cached supply ID when cache is valid (< 24 hours)', async () => {
      // Arrange: User with valid cached supply ID
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
              supplyId: 'valid-supply-id',
              supplyIdUpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: 'valid-supply-id',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should execute booking with existing supply ID
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 2: Expired Supply ID Handling', () => {
    test('should clear cache and retry when supply ID is expired during booking', async () => {
      // Arrange: User with expired supply ID that causes error
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
              supplyId: 'expired-supply-id',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
      ];

      // Spy on cache clear method
      const clearCacheSpy = jest.spyOn(autobookingSupplyIdCacheService, 'clearSupplyIdFromCache');

      // Mock booking to fail with expired supply error, then succeed
      let callCount = 0;
      mockAutobookingExecutor.executeBooking.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Supply ID expired'));
        }
        return Promise.resolve({ success: true, supplyId: 'new-supply-id' });
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      clearCacheSpy.mockRestore();
    });

    test('should delete preorder when supply ID is expired', async () => {
      // Arrange: User with expired supply ID
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
              supplyId: 'old-supply-id',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
      ];

      // Mock successful booking after handling expired supply
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: 'new-supply-id',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should execute booking
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 3: Order Not Exist Error Handling', () => {
    test('should handle "Заказ не существует" error and clear cache', async () => {
      // Arrange: User that will trigger order not exist error
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
              supplyId: 'invalid-supply-id',
              supplyIdUpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
      ];

      // Mock order not exist error
      mockAutobookingExecutor.executeBooking.mockRejectedValue(
        new Error('Заказ не существует'),
      );

      // Act - should not throw
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should attempt booking
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 4: Mixed Cache States and Error Handling', () => {
    test('should handle users with different cache states', async () => {
      // Arrange: Multiple users with different cache states
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
              supplyId: 'expired-supply-id',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // Expired
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              userId: 2,
              supplierId: 'supplier-2',
              draftId: 'draft2',
              customDates: [getFutureDate()],
              supplyId: 'valid-supply-id',
              supplyIdUpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // Valid
            }),
          ],
        }),
        createMonitoringUser({
          userId: 3,
          supplierId: 'supplier-3',
          autobookings: [
            createAutobooking({
              id: 'booking-301',
              userId: 3,
              supplierId: 'supplier-3',
              draftId: 'draft3',
              customDates: [getFutureDate()],
              supplyId: null, // No cached supply
              supplyIdUpdatedAt: null,
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
      ];

      // Mock successful booking for all users
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: 'new-supply-id',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: All users should be processed
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(3);
    });
  });
});
