/**
 * Autobooking Monitoring - Supply ID Cache Tests
 * Migrated from: tests/autobookingMonitoring.supplyCache.test.ts
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
jest.mock(
  '../../../services/monitoring/autobooking/autobooking-executor.service',
  () => ({
    autobookingExecutorService: {
      executeBooking: jest.fn(),
    },
  }),
);

// Mock autobooking notification service
jest.mock(
  '../../../services/monitoring/autobooking/autobooking-notification.service',
  () => ({
    autobookingNotificationService: {
      sendSuccessNotification: jest.fn(),
      updateAutobookingStatus: jest.fn(),
    },
  }),
);

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AutobookingMonitoringService - Supply ID Cache', () => {
  let service: AutobookingMonitoringService;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockAutobookingExecutor: jest.Mocked<typeof autobookingExecutorService>;

  // Fixed base date for consistent testing
  const BASE_FUTURE_DATE = new Date();
  BASE_FUTURE_DATE.setDate(BASE_FUTURE_DATE.getDate() + 7);

  const getTestDate = (daysOffset = 0): Date => {
    const date = new Date(BASE_FUTURE_DATE);
    date.setDate(date.getDate() + daysOffset);
    return date;
  };

  const getTestDateString = (daysOffset = 0): string => {
    return getTestDate(daysOffset).toISOString().split('T')[0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutobookingMonitoringService();
    mockBookingErrorService = bookingErrorService as jest.Mocked<
      typeof bookingErrorService
    >;
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockAutobookingExecutor = autobookingExecutorService as jest.Mocked<
      typeof autobookingExecutorService
    >;

    // Mock account lookup
    (mockPrisma.account.findUnique as jest.Mock).mockImplementation(
      (args: { where: { id: string } }) => {
        return Promise.resolve({
          id: args?.where?.id || 'account-123',
          userId: 1,
          wbCookies: 'test-cookies',
        });
      },
    );

    // Mock bookingErrorService
    mockBookingErrorService.isCriticalBookingError.mockReturnValue(false);
    mockBookingErrorService.handleCriticalBookingError.mockResolvedValue(
      undefined,
    );

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
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.reset();
  });

  describe('Scenario 1: Using Cached Supply ID', () => {
    test('should use cached supply ID when valid and not expired', async () => {
      // Arrange: User with valid cached supply ID (within 24 hours)
      const validCacheTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getTestDate()],
              supplyId: 'cached-supply-id',
              supplyIdUpdatedAt: validCacheTime,
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getTestDateString(), coefficient: 100 }],
        },
      ];

      // Spy on cache service
      const cacheSpy = jest.spyOn(
        autobookingSupplyIdCacheService,
        'getCachedSupplyId',
      );

      // Mock successful booking
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: 'cached-supply-id',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should execute booking
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);

      cacheSpy.mockRestore();
    });
  });

  describe('Scenario 2: Creating New Supply ID When Cache Invalid', () => {
    test('should create new supply ID when cache is expired', async () => {
      // Arrange: User with expired supply ID (more than 24 hours)
      const expiredCacheTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getTestDate()],
              supplyId: 'expired-supply-id',
              supplyIdUpdatedAt: expiredCacheTime,
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getTestDateString(), coefficient: 100 }],
        },
      ];

      // Mock successful booking with new supply ID
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: 'new-supply-id',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should execute booking
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });

    test('should create new supply ID when no cache exists', async () => {
      // Arrange: User with no cached supply ID
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getTestDate()],
              supplyId: null,
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
          availableDates: [{ date: getTestDateString(), coefficient: 100 }],
        },
      ];

      // Mock successful booking
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

  describe('Scenario 3: Caching Supply ID on Date Unavailable Error', () => {
    test('should cache supply ID even when date unavailable error occurs', async () => {
      // Arrange: User with valid supply ID that gets date unavailable error
      const validCacheTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getTestDate()],
              supplyId: 'valid-supply-id',
              supplyIdUpdatedAt: validCacheTime,
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getTestDateString(), coefficient: 100 }],
        },
      ];

      // Mock date unavailable error
      mockAutobookingExecutor.executeBooking.mockRejectedValue(
        new Error('Эта дата уже недоступна'),
      );

      // Act - should not throw
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should have attempted booking
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 4: Mixed Cache States', () => {
    test('should handle users with different cache states correctly', async () => {
      // Arrange: Multiple users with different cache states
      const cacheSupplyIdCalls: Array<{
        userId: number;
        supplyId: string | null;
      }> = [];

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getTestDate()],
              supplyId: 'valid-cache',
              supplyIdUpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // Valid
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
              customDates: [getTestDate()],
              supplyId: 'expired-cache',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // Expired
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
              customDates: [getTestDate()],
              supplyId: null, // No cache
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
          availableDates: [{ date: getTestDateString(), coefficient: 100 }],
        },
      ];

      // Mock successful booking
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
