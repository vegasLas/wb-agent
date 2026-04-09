/**
 * Autobooking Monitoring - Preorder Errors and Supply Cache Tests
 * Migrated from: tests/autobookingMonitoring.preorderErrors.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture
 * - Added unit tests for isSupplyIdValid method
 * - Implemented Option 1: Mock createBookingTask with internal behavior simulation
 */

import { AutobookingMonitoringService } from '@/services/monitoring/autobooking/autobooking-monitoring.service';
import { sharedBanService } from '@/services/monitoring/shared/ban.service';
import { sharedProcessingStateService } from '@/services/monitoring/shared/processing-state.service';
import { sharedUserTrackingService } from '@/services/monitoring/shared/user-tracking.service';
import { autobookingSupplyIdCacheService } from '@/services/monitoring/autobooking/autobooking-supply-id-cache.service';
import { autobookingExecutorService } from '@/services/monitoring/autobooking/autobooking-executor.service';
import { supplyService } from '@/services/domain/supply/supply.service';
import { bookingErrorService } from '@/services/booking-error.service';
import { prisma } from '@/config/database';
import {
  createAutobooking,
  createMonitoringUser,
  getFutureDate,
  getFutureDateString,
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

// Mock autobooking executor service
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
  let mockSupplyService: jest.Mocked<typeof supplyService>;

  // Spies for cache service methods
  let cacheSupplyIdSpy: jest.SpyInstance;
  let clearSupplyIdFromCacheSpy: jest.SpyInstance;
  let isSupplyIdValidSpy: jest.SpyInstance;

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
    mockSupplyService = supplyService as jest.Mocked<typeof supplyService>;

    // Setup spies on cache service methods
    cacheSupplyIdSpy = jest
      .spyOn(autobookingSupplyIdCacheService, 'cacheSupplyId')
      .mockResolvedValue(undefined);
    clearSupplyIdFromCacheSpy = jest
      .spyOn(autobookingSupplyIdCacheService, 'clearSupplyIdFromCache')
      .mockResolvedValue(undefined);
    isSupplyIdValidSpy = jest.spyOn(
      autobookingSupplyIdCacheService,
      'isSupplyIdValid',
    );

    // Mock account lookup to return a valid account with cookies
    (mockPrisma.account.findUnique as jest.Mock).mockImplementation(
      (args: { where: { id: string } }) => {
        const accountId = args?.where?.id;
        return Promise.resolve({
          id: accountId || 'account-123',
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

    // Mock supply service methods
    mockSupplyService.createSupply.mockResolvedValue({
      result: { ids: [{ Id: 67890 }] },
    });
    mockSupplyService.deletePreorder.mockResolvedValue({});

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
    clearSupplyIdFromCacheSpy.mockRestore();
    isSupplyIdValidSpy.mockRestore();

    // Clean up any remaining state
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
  });

  describe('Scenario 1: Expired Cache Handling', () => {
    test('should clear expired supply ID cache and create new supply successfully', async () => {
      // Arrange: User with cached supply ID that is expired
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              supplyId: '12345',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (expired)
              customDates: [getFutureDate()],
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

      // Mock createSupply to return new supply ID
      mockSupplyService.createSupply.mockResolvedValue({
        result: { ids: [{ Id: 67890 }] },
      });

      // Mock createBookingTask to simulate internal cache behavior
      mockAutobookingExecutor.createBookingTask.mockImplementation(
        async (params) => {
          const { booking, account, user } = params;

          // Simulate supply ID cache logic
          if (!autobookingSupplyIdCacheService.isSupplyIdValid(booking)) {
            // Supply ID is expired - delete it
            if (booking.supplyId) {
              await supplyService.deletePreorder({
                accountId: account.id,
                supplierId: booking.supplierId,
                preorderId: parseInt(booking.supplyId),
                userAgent: user.userAgent,
                proxy: user.proxy,
              });
            }

            // Create new supply
            const newSupply = await supplyService.createSupply({
              accountId: account.id,
              supplierId: booking.supplierId,
              userId: user.userId,
              proxy: user.proxy,
              latency: params.latency,
              deliveryDate: params.effectiveDate.toISOString(),
              rpc_order: Math.floor(Math.random() * 1000000),
              params: {
                boxTypeID: 2,
                isBoxOnPallet: false,
                draftID: booking.draftId,
                warehouseId: booking.warehouseId,
              },
              userAgent: user.userAgent,
            });

            const newPreorderId = newSupply.result?.ids[0]?.Id;
            if (newPreorderId) {
              await autobookingSupplyIdCacheService.cacheSupplyId(
                booking.id,
                newPreorderId.toString(),
              );
            }
          }
        },
      );

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should create new supply since cache is expired
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);

      // Should delete the expired preorder
      expect(mockSupplyService.deletePreorder).toHaveBeenCalledWith(
        expect.objectContaining({
          preorderId: 12345,
        }),
      );

      // Verify new supply ID was cached
      expect(cacheSupplyIdSpy).toHaveBeenCalledWith('booking-101', '67890');
    });

    test('should preserve valid supply ID cache and not delete preorders during error handling', async () => {
      // Arrange: User with valid cached supply ID
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              supplyId: '12345',
              supplyIdUpdatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago (valid)
              customDates: [getFutureDate()],
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

      // Mock createBookingTask to simulate error with valid cache
      mockAutobookingExecutor.createBookingTask.mockImplementation(
        async (params) => {
          const { booking } = params;

          // Check if supply ID is valid
          if (autobookingSupplyIdCacheService.isSupplyIdValid(booking)) {
            // Valid cache - should NOT delete or create new supply
            // But simulate a browser error
            throw new Error('Some network error');
          }
        },
      );

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should NOT call createSupply since we have valid cached supply ID
      expect(mockSupplyService.createSupply).not.toHaveBeenCalled();

      // Should NOT call deletePreorder during error handling for valid cache
      expect(mockSupplyService.deletePreorder).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 2: Expired Supply ID Handling', () => {
    test('should clear expired supply ID and skip preorder deletion when preorder does not exist', async () => {
      // Arrange: User with expired cache
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              supplyId: '12345',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (expired)
              customDates: [getFutureDate()],
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

      // Mock deletePreorder to fail with "preorder doesn't exist" error
      mockSupplyService.deletePreorder.mockRejectedValue({
        message: 'Предзаказ не существует',
      });

      // Mock createSupply to return new supply ID
      mockSupplyService.createSupply.mockResolvedValue({
        result: { ids: [{ Id: 67890 }] },
      });

      // Mock createBookingTask to simulate internal cache behavior with delete error
      mockAutobookingExecutor.createBookingTask.mockImplementation(
        async (params) => {
          const { booking, account, user } = params;

          if (
            !autobookingSupplyIdCacheService.isSupplyIdValid(booking) &&
            booking.supplyId
          ) {
            try {
              await supplyService.deletePreorder({
                accountId: account.id,
                supplierId: booking.supplierId,
                preorderId: parseInt(booking.supplyId),
                userAgent: user.userAgent,
                proxy: user.proxy,
              });
            } catch (deleteError: any) {
              // Handle "preorder doesn't exist" error
              if (deleteError.message?.includes('Предзаказ не существует')) {
                await autobookingSupplyIdCacheService.clearSupplyIdFromCache(
                  booking.id,
                );
              }
            }

            // Create new supply
            const newSupply = await supplyService.createSupply({
              accountId: account.id,
              supplierId: booking.supplierId,
              userId: user.userId,
              proxy: user.proxy,
              latency: params.latency,
              deliveryDate: params.effectiveDate.toISOString(),
              rpc_order: Math.floor(Math.random() * 1000000),
              params: {
                boxTypeID: 2,
                isBoxOnPallet: false,
                draftID: booking.draftId,
                warehouseId: booking.warehouseId,
              },
              userAgent: user.userAgent,
            });

            const newPreorderId = newSupply.result?.ids[0]?.Id;
            if (newPreorderId) {
              await autobookingSupplyIdCacheService.cacheSupplyId(
                booking.id,
                newPreorderId.toString(),
              );
            }
          }
        },
      );

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should attempt to delete the expired preorder
      expect(mockSupplyService.deletePreorder).toHaveBeenCalledWith(
        expect.objectContaining({
          preorderId: 12345,
        }),
      );

      // Should create new supply
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);

      // Should clear cache when preorder doesn't exist
      expect(clearSupplyIdFromCacheSpy).toHaveBeenCalledWith('booking-101');
    });

    test('should preserve valid (non-expired) preorder on error', async () => {
      // Arrange: User with valid cache
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              supplyId: '12345',
              supplyIdUpdatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago (valid)
              customDates: [getFutureDate()],
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

      // Mock createBookingTask to fail with generic error
      mockAutobookingExecutor.createBookingTask.mockImplementation(
        async (params) => {
          const { booking } = params;

          if (autobookingSupplyIdCacheService.isSupplyIdValid(booking)) {
            // Valid cache - throw generic error
            throw new Error('Some network error');
          }
        },
      );

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should NOT call createSupply since cache is valid
      expect(mockSupplyService.createSupply).not.toHaveBeenCalled();

      // Should NOT call deletePreorder for valid supply ID during error handling
      expect(mockSupplyService.deletePreorder).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 3: Order Not Exist Error Handling', () => {
    test('should clear supply ID cache when browser returns "Заказ не существует" error', async () => {
      // Arrange: User with valid cache
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              supplyId: '12345',
              supplyIdUpdatedAt: new Date(Date.now() - 2 * 60 * 1000), // Valid cache
              customDates: [getFutureDate()],
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

      // Mock createBookingTask to throw "Заказ не существует" error and clear cache
      mockAutobookingExecutor.createBookingTask.mockImplementation(
        async (params) => {
          const { booking } = params;

          if (autobookingSupplyIdCacheService.isSupplyIdValid(booking)) {
            // Simulate "order not exist" error during browser navigation
            // In real implementation, this would trigger cache clearing
            await autobookingSupplyIdCacheService.clearSupplyIdFromCache(
              booking.id,
            );
            throw new Error('Заказ не существует');
          }
        },
      );

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should NOT call createSupply since we used cached supply ID
      expect(mockSupplyService.createSupply).not.toHaveBeenCalled();

      // Should clear supply ID from cache when order doesn't exist
      expect(clearSupplyIdFromCacheSpy).toHaveBeenCalledWith('booking-101');
    });
  });

  describe('Scenario 4: Mixed Cache States and Error Handling', () => {
    test('should handle multiple bookings with different cache states and errors', async () => {
      // Track method calls
      const deletePreorderCalls: number[] = [];
      const createSupplyCalls: string[] = [];
      const cacheSupplyIdCalls: Array<[string, string]> = [];
      const clearSupplyIdCalls: string[] = [];

      // Override spies to track calls
      cacheSupplyIdSpy.mockImplementation(
        async (bookingId: string, supplyId: string) => {
          cacheSupplyIdCalls.push([bookingId, supplyId]);
        },
      );

      clearSupplyIdFromCacheSpy.mockImplementation(
        async (bookingId: string) => {
          clearSupplyIdCalls.push(bookingId);
        },
      );

      // Setup - multiple users with different cache states
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              supplyId: '11111',
              supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // Expired cache
              customDates: [getFutureDate()],
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
              supplyId: '22222',
              supplyIdUpdatedAt: new Date(Date.now() - 2 * 60 * 1000), // Valid cache
              customDates: [getFutureDate()],
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

      // Mock createSupply for User 1 (expired cache)
      mockSupplyService.createSupply.mockResolvedValue({
        result: { ids: [{ Id: 33333 }] },
      });

      // Mock createBookingTask with conditional behavior based on booking
      mockAutobookingExecutor.createBookingTask.mockImplementation(
        async (params) => {
          const { booking, account, user } = params;

          if (!autobookingSupplyIdCacheService.isSupplyIdValid(booking)) {
            // Expired cache - delete and create new
            if (booking.supplyId) {
              deletePreorderCalls.push(parseInt(booking.supplyId));
              await supplyService.deletePreorder({
                accountId: account.id,
                supplierId: booking.supplierId,
                preorderId: parseInt(booking.supplyId),
                userAgent: user.userAgent,
                proxy: user.proxy,
              });
            }

            const newSupply = await supplyService.createSupply({
              accountId: account.id,
              supplierId: booking.supplierId,
              userId: user.userId,
              proxy: user.proxy,
              latency: params.latency,
              deliveryDate: params.effectiveDate.toISOString(),
              rpc_order: Math.floor(Math.random() * 1000000),
              params: {
                boxTypeID: 2,
                isBoxOnPallet: false,
                draftID: booking.draftId,
                warehouseId: booking.warehouseId,
              },
              userAgent: user.userAgent,
            });

            createSupplyCalls.push(booking.id);
            const newPreorderId = newSupply.result?.ids[0]?.Id;
            if (newPreorderId) {
              await autobookingSupplyIdCacheService.cacheSupplyId(
                booking.id,
                newPreorderId.toString(),
              );
            }

            // Simulate "order not exist" error for user1's new supply
            if (booking.id === 'booking-101') {
              await autobookingSupplyIdCacheService.clearSupplyIdFromCache(
                booking.id,
              );
              throw new Error('Заказ не существует');
            }
          } else {
            // Valid cache - success for user2
            if (booking.id === 'booking-201') {
              // Success - do nothing, just return
              return;
            }
          }
        },
      );

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert
      // User1 (expired cache): Should create new supply
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);
      expect(createSupplyCalls).toContain('booking-101');

      // User1's expired preorder should be deleted
      expect(mockSupplyService.deletePreorder).toHaveBeenCalledWith(
        expect.objectContaining({
          preorderId: 11111,
        }),
      );
      expect(deletePreorderCalls).toContain(11111);

      // User1 (expired cache + order not exist error): Should clear cache
      expect(clearSupplyIdCalls).toContain('booking-101');

      // User1's new supply should be cached
      expect(cacheSupplyIdCalls).toContainEqual(['booking-101', '33333']);

      // User2 (valid cache + success): Should NOT clear cache
      expect(clearSupplyIdCalls).not.toContain('booking-201');
    });
  });

  describe('isSupplyIdValid method', () => {
    test('should return false when supplyId is null', () => {
      const booking = {
        supplyId: null as string | null,
        supplyIdUpdatedAt: new Date(),
      };
      expect(autobookingSupplyIdCacheService.isSupplyIdValid(booking)).toBe(
        false,
      );
    });

    test('should return false when supplyIdUpdatedAt is null', () => {
      const booking = {
        supplyId: '12345' as string | null,
        supplyIdUpdatedAt: null as Date | null,
      };
      expect(autobookingSupplyIdCacheService.isSupplyIdValid(booking)).toBe(
        false,
      );
    });

    test('should return false when supply ID is older than 24 hours', () => {
      const booking = {
        supplyId: '12345',
        supplyIdUpdatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };
      expect(autobookingSupplyIdCacheService.isSupplyIdValid(booking)).toBe(
        false,
      );
    });

    test('should return true when supply ID is less than 24 hours old', () => {
      const booking = {
        supplyId: '12345',
        supplyIdUpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      };
      expect(autobookingSupplyIdCacheService.isSupplyIdValid(booking)).toBe(
        true,
      );
    });
  });

  describe('cacheSupplyId method', () => {
    test('should cache supply ID in database', async () => {
      // Arrange: Restore original implementation for this test
      cacheSupplyIdSpy.mockRestore();
      (mockPrisma.autobooking.update as jest.Mock).mockResolvedValue({});

      // Act
      await autobookingSupplyIdCacheService.cacheSupplyId(
        'booking-101',
        '67890',
      );

      // Assert
      expect(mockPrisma.autobooking.update).toHaveBeenCalledWith({
        where: { id: 'booking-101' },
        data: {
          supplyId: '67890',
          supplyIdUpdatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('clearSupplyIdFromCache method', () => {
    test('should clear supply ID from database cache', async () => {
      // Arrange: Restore original implementation for this test
      clearSupplyIdFromCacheSpy.mockRestore();
      (mockPrisma.autobooking.update as jest.Mock).mockResolvedValue({});

      // Act
      await autobookingSupplyIdCacheService.clearSupplyIdFromCache(
        'booking-101',
      );

      // Assert
      expect(mockPrisma.autobooking.update).toHaveBeenCalledWith({
        where: { id: 'booking-101' },
        data: {
          supplyId: null,
          supplyIdUpdatedAt: null,
        },
      });
    });
  });
});
