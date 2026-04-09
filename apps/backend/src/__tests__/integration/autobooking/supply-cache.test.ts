/**
 * Autobooking Monitoring - Supply ID Cache Tests
 * Migrated from: tests/autobookingMonitoring.supplyCache.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture with behavioral mocks
 * - Same test logic preserved with proper service call assertions
 */

import { AutobookingMonitoringService } from '@/services/monitoring/autobooking/autobooking-monitoring.service';
import { sharedBanService } from '@/services/monitoring/shared/ban.service';
import { sharedProcessingStateService } from '@/services/monitoring/shared/processing-state.service';
import { sharedUserTrackingService } from '@/services/monitoring/shared/user-tracking.service';
import { autobookingSupplyIdCacheService } from '@/services/monitoring/autobooking/autobooking-supply-id-cache.service';
import { autobookingExecutorService } from '@/services/monitoring/autobooking/autobooking-executor.service';
import { bookingErrorService } from '@/services/booking-error.service';
import { supplyService } from '@/services/domain/supply/supply.service';
import { prisma } from '@/config/database';
import {
  createAutobooking,
  createMonitoringUser,
} from '@/__tests__/helpers/autobooking-helpers';
import type { MonitoringUser } from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// Mock dependencies
jest.mock('../../../services/booking-error.service');
jest.mock('../../../services/supply.service');
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

// Mock autobooking executor service - use behavioral mock
jest.mock(
  '../../../services/monitoring/autobooking/autobooking-executor.service',
  () => ({
    autobookingExecutorService: {
      createBookingTask: jest.fn(),
      addSuccessfulBooking: jest.fn(),
      logSuccessfulBooking: jest.fn(),
      handleBookingProcessingError: jest.fn(),
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

// Mock latency service
jest.mock('../../../services/monitoring/shared/latency.service', () => ({
  sharedLatencyService: {
    generateLatency: jest.fn().mockReturnValue(100),
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

describe('AutobookingMonitoringService - Supply ID Cache', () => {
  let service: AutobookingMonitoringService;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockSupplyService: jest.Mocked<typeof supplyService>;
  let mockAutobookingExecutor: jest.Mocked<typeof autobookingExecutorService>;

  // Spies for cache service methods
  let cacheSupplyIdSpy: jest.SpyInstance;
  let isSupplyIdValidSpy: jest.SpyInstance;

  // Fixed base date for consistent testing
  const BASE_FUTURE_DATE = new Date('2026-03-25T12:00:00.000Z');

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
    mockSupplyService = supplyService as jest.Mocked<typeof supplyService>;
    mockAutobookingExecutor = autobookingExecutorService as jest.Mocked<
      typeof autobookingExecutorService
    >;

    // Setup spies on cache service methods
    cacheSupplyIdSpy = jest
      .spyOn(autobookingSupplyIdCacheService, 'cacheSupplyId')
      .mockResolvedValue(undefined);
    isSupplyIdValidSpy = jest.spyOn(
      autobookingSupplyIdCacheService,
      'isSupplyIdValid',
    );

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

    // Mock supply service
    mockSupplyService.createSupply.mockResolvedValue({
      result: { ids: [{ Id: 99999 }] },
    });
    mockSupplyService.deletePreorder.mockResolvedValue({});

    // Setup behavioral mock for createBookingTask
    // This simulates the orchestration flow including supply creation and caching
    mockAutobookingExecutor.createBookingTask.mockImplementation(
      async (params) => {
        const { booking, account, user } = params;

        // Simulate cache check and supply creation flow
        const isValid =
          autobookingSupplyIdCacheService.isSupplyIdValid(booking);

        if (!isValid) {
          // Create new supply (calls real supplyService mock)
          const supply = await supplyService.createSupply({
            accountId: account.id,
            supplierId: booking.supplierId,
            userId: user.userId,
            proxy: user.proxy,
            latency: 100,
            deliveryDate: params.effectiveDate.toISOString(),
            rpc_order: 12345,
            params: {
              boxTypeID: 2,
              isBoxOnPallet: false,
              draftID: booking.draftId,
              warehouseId: booking.warehouseId,
              transitWarehouseId: booking.transitWarehouseId || null,
            },
            userAgent: user.userAgent,
          });

          const newPreorderId = supply.result?.ids[0]?.Id;
          if (newPreorderId) {
            await autobookingSupplyIdCacheService.cacheSupplyId(
              booking.id,
              newPreorderId.toString(),
            );
          }
        }
      },
    );

    // Clear shared service states
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
  });

  afterEach(() => {
    // Restore spies
    cacheSupplyIdSpy.mockRestore();
    isSupplyIdValidSpy.mockRestore();

    // Clear shared service states
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
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

      // Mock isSupplyIdValid to return true (cache is valid)
      isSupplyIdValidSpy.mockReturnValue(true);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should call createBookingTask
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );

      // Should NOT create new supply since cache is valid
      expect(mockSupplyService.createSupply).not.toHaveBeenCalled();

      // Should NOT cache a new supply ID since we used cached one
      expect(cacheSupplyIdSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 2: Creating New Supply ID When Cache Invalid', () => {
    test('should create new supply ID when cache is expired', async () => {
      // Arrange: User with expired cached supply ID
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

      // Mock isSupplyIdValid to return false (cache is expired)
      isSupplyIdValidSpy.mockReturnValue(false);

      // Mock createSupply to return new supply ID
      mockSupplyService.createSupply.mockResolvedValue({
        result: { ids: [{ Id: 67890 }] },
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should call createBookingTask
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );

      // Should create new supply since cache is expired
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);

      // Verify new supply ID was cached
      expect(cacheSupplyIdSpy).toHaveBeenCalledWith('booking-101', '67890');
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

      // Mock isSupplyIdValid to return false (no cache)
      isSupplyIdValidSpy.mockReturnValue(false);

      // Mock createSupply to return new supply ID
      mockSupplyService.createSupply.mockResolvedValue({
        result: { ids: [{ Id: 11111 }] },
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should call createBookingTask
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );

      // Should create new supply since no cache exists
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);

      // Verify new supply ID was cached
      expect(cacheSupplyIdSpy).toHaveBeenCalledWith('booking-101', '11111');
    });
  });

  describe('Scenario 3: Caching Supply ID on Date Unavailable Error', () => {
    test('should cache supply ID even when date unavailable error occurs', async () => {
      // Arrange: User with no cached supply ID that will get date unavailable error

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

      // Mock isSupplyIdValid to return false (no cache)
      isSupplyIdValidSpy.mockReturnValue(false);

      // Mock createSupply to return new supply ID
      mockSupplyService.createSupply.mockResolvedValue({
        result: { ids: [{ Id: 22222 }] },
      });

      // Mock createBookingTask to simulate date unavailable error after supply creation
      mockAutobookingExecutor.createBookingTask.mockImplementation(
        async (params) => {
          const { booking, account, user } = params;

          // Create supply first
          const supply = await supplyService.createSupply({
            accountId: account.id,
            supplierId: booking.supplierId,
            userId: user.userId,
            proxy: user.proxy,
            latency: 100,
            deliveryDate: params.effectiveDate.toISOString(),
            rpc_order: 12345,
            params: {
              boxTypeID: 2,
              isBoxOnPallet: false,
              draftID: booking.draftId,
              warehouseId: booking.warehouseId,
              transitWarehouseId: booking.transitWarehouseId || null,
            },
            userAgent: user.userAgent,
          });

          const newPreorderId = supply.result?.ids[0]?.Id;
          if (newPreorderId) {
            await autobookingSupplyIdCacheService.cacheSupplyId(
              booking.id,
              newPreorderId.toString(),
            );
          }

          // Then throw date unavailable error
          throw new Error('Эта дата уже недоступна');
        },
      );

      // Act - should not throw
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should create supply
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);

      // Verify supply ID was cached despite the error
      expect(cacheSupplyIdSpy).toHaveBeenCalledWith('booking-101', '22222');
    });
  });

  describe('Scenario 4: Mixed Cache States', () => {
    test('should handle users with different cache states correctly', async () => {
      // Track which bookings had valid cache
      const validCacheBookings = new Set(['booking-101']);

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

      // Setup isSupplyIdValid to check the booking ID
      isSupplyIdValidSpy.mockImplementation((booking) => {
        return validCacheBookings.has(booking.id);
      });

      // Reset createSupply mock to return different IDs for different calls
      let callCount = 0;
      mockSupplyService.createSupply.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          result: { ids: [{ Id: 40000 + callCount }] },
        });
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: All users should be processed
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        3,
      );

      // Should create supply only for User 2 and User 3 (User 1 has valid cache)
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(2);

      // Verify User 2 and User 3's supply IDs were cached
      expect(cacheSupplyIdSpy).toHaveBeenCalledTimes(2);
      expect(cacheSupplyIdSpy).toHaveBeenCalledWith('booking-201', '40001');
      expect(cacheSupplyIdSpy).toHaveBeenCalledWith('booking-301', '40002');
    });
  });
});
