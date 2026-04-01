/**
 * Autobooking Monitoring - Proxy Grouping Tests
 * Migrated from: tests/autobookingMonitoring.proxyGrouping.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture with behavioral mocks
 * - Same test logic preserved
 */

import { AutobookingMonitoringService } from '../../../services/monitoring/autobooking/autobooking-monitoring.service';
import { sharedBanService } from '../../../services/monitoring/shared/ban.service';
import { sharedProcessingStateService } from '../../../services/monitoring/shared/processing-state.service';
import { sharedUserTrackingService } from '../../../services/monitoring/shared/user-tracking.service';
import { autobookingExecutorService } from '../../../services/monitoring/autobooking/autobooking-executor.service';
import { autobookingNotificationService } from '../../../services/monitoring/autobooking/autobooking-notification.service';
import { bookingErrorService } from '../../../services/booking-error.service';
import { supplyService } from '../../../services/supply.service';
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

describe('AutobookingMonitoringService - Proxy Grouping', () => {
  let service: AutobookingMonitoringService;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockSupplyService: jest.Mocked<typeof supplyService>;
  let mockAutobookingExecutor: jest.Mocked<typeof autobookingExecutorService>;
  let mockNotificationService: jest.Mocked<typeof autobookingNotificationService>;

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
    mockNotificationService = autobookingNotificationService as jest.Mocked<
      typeof autobookingNotificationService
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

    // Mock autobooking update for status updates
    (mockPrisma.autobooking.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.autobooking.findUnique as jest.Mock).mockResolvedValue({
      customDates: [],
      completedDates: [],
    });

    // Mock user.findFirst for admin notifications
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    // Mock notification service methods
    jest
      .spyOn(autobookingNotificationService, 'updateAutobookingStatus')
      .mockImplementation(async () => { /* intentionally empty */ });
    jest
      .spyOn(autobookingNotificationService, 'sendSuccessNotification')
      .mockImplementation(async () => { /* intentionally empty */ });

    // Mock bookingErrorService
    mockBookingErrorService.isCriticalBookingError.mockReturnValue(false);
    mockBookingErrorService.handleCriticalBookingError.mockResolvedValue(
      undefined,
    );

    // Mock supply service
    mockSupplyService.createSupply.mockResolvedValue({
      result: { ids: [{ Id: 12345 }] },
    });
    mockSupplyService.deletePreorder.mockResolvedValue({});

    // Setup behavioral mock for createBookingTask
    // This simulates the orchestration flow including supply creation
    mockAutobookingExecutor.createBookingTask.mockImplementation(
      async (params) => {
        const { booking, account, user, effectiveDate } = params;

        // Simulate supply creation (this is what the real service does)
        await supplyService.createSupply({
          accountId: account.id,
          supplierId: booking.supplierId,
          userId: user.userId,
          proxy: user.proxy,
          latency: 100,
          deliveryDate: effectiveDate.toISOString(),
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

        // Simulate successful booking tracking
        autobookingExecutorService.addSuccessfulBooking(
          expect.any(Array),
          {
            user,
            warehouseName: 'Test Warehouse',
            effectiveDate,
            coefficient: 100,
            booking,
          },
        );
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
    // Clear shared service states
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
  });

  describe('Scenario 1: Basic Proxy Distribution', () => {
    test('should distribute bookings across different proxies for same warehouse-date', async () => {
      // Arrange: Multiple users with different proxies for same warehouse-date
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          supplierId: 'supplier-1',
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              supplierId: 'supplier-1',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          proxy: { ip: '192.168.1.2', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              userId: 2,
              supplierId: 'supplier-2',
              draftId: 'draft2',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 3,
          supplierId: 'supplier-3',
          proxy: { ip: '192.168.1.1', port: '8080' }, // Same proxy as user 1
          autobookings: [
            createAutobooking({
              id: 'booking-301',
              userId: 3,
              supplierId: 'supplier-3',
              draftId: 'draft3',
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

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: All bookings should be processed
      // User 1 and User 2 are in group 1 (different proxies)
      // User 3 is in group 2 (same proxy as User 1, so separate group)
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(3);
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(3);
    });

    test('should create separate groups for different proxies', async () => {
      // Arrange: Users with completely different proxies
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          proxy: { ip: '192.168.1.2', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              draftId: 'draft2',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 3,
          proxy: { ip: '192.168.1.3', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-301',
              draftId: 'draft3',
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

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: All bookings should be processed (all in same group since they have different proxies)
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(3);
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(3);
    });
  });

  describe('Scenario 2: Complex Proxy Distribution', () => {
    test('should distribute multiple bookings across available proxies correctly', async () => {
      // Arrange: Multiple users with various proxies
      // Note: Each user can only have one booking processed per warehouse-date due to user tracking
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              customDates: [getFutureDate()],
            }),
            createAutobooking({
              id: 'booking-102',
              warehouseId: 124,
              draftId: 'draft2',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          proxy: { ip: '192.168.1.1', port: '8080' }, // Same proxy as user 1
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              draftId: 'draft3',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 3,
          proxy: { ip: '192.168.1.2', port: '8080' }, // Different proxy
          autobookings: [
            createAutobooking({
              id: 'booking-301',
              draftId: 'draft4',
              customDates: [getFutureDate()],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Warehouse 1',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
        {
          warehouseId: 124,
          warehouseName: 'Warehouse 2',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 200 }],
        },
      ];

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: 3 bookings should be processed
      // Warehouse 123: booking-101 (proxy 1.1), booking-201 (proxy 1.1 - separate group), booking-301 (proxy 1.2)
      // Warehouse 124: booking-102 (proxy 1.1) - but user 1 already processed in warehouse 123
      // Note: User 1's second booking (booking-102) won't be processed because user 1 is already running
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(3);
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(3);
    });

    test('should handle same proxy across different warehouse-dates', async () => {
      // Arrange: Same proxy used for different warehouse-date combinations
      // Each warehouse-date is processed independently, but user tracking prevents multiple bookings per user
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              warehouseId: 123,
              customDates: [getFutureDate()],
            }),
            createAutobooking({
              id: 'booking-102',
              warehouseId: 124,
              draftId: 'draft2',
              customDates: [getFutureDate()],
            }),
            createAutobooking({
              id: 'booking-103',
              warehouseId: 123,
              draftId: 'draft3',
              customDates: [new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)], // Different date
            }),
          ],
        }),
      ];

      const futureDateStr1 = getFutureDateString();
      const futureDate2 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
      const futureDateStr2 = futureDate2.toISOString().split('T')[0];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Warehouse 1',
          boxTypeID: 2 as const,
          availableDates: [
            { date: futureDateStr1, coefficient: 100 },
            { date: futureDateStr2, coefficient: 150 },
          ],
        },
        {
          warehouseId: 124,
          warehouseName: 'Warehouse 2',
          boxTypeID: 2 as const,
          availableDates: [{ date: futureDateStr1, coefficient: 200 }],
        },
      ];

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Only 1 booking should be processed
      // User 1 is tracked as running after the first booking and subsequent bookings are skipped
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 3: Sequential Processing Verification', () => {
    test('should process bookings within same group simultaneously', async () => {
      // Arrange: Single group with multiple bookings (different proxies = same group)
      // All bookings within the group should be processed simultaneously
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          proxy: { ip: '192.168.1.2', port: '8080' }, // Different proxy = same group
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              draftId: 'draft2',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 3,
          proxy: { ip: '192.168.1.3', port: '8080' }, // Different proxy = same group
          autobookings: [
            createAutobooking({
              id: 'booking-301',
              draftId: 'draft3',
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

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: All bookings in the same group should be processed
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(3);
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(3);
    });

    test('should handle errors in one proxy group without affecting others', async () => {
      // Arrange: One proxy group that fails, others succeed
      // Mock createBookingTask to fail for first call, succeed for others
      mockAutobookingExecutor.createBookingTask
        .mockRejectedValueOnce(new Error('Browser error')) // First group fails
        .mockImplementation(async (params) => {
          // Others succeed - simulate the supply creation
          const { booking, account, user, effectiveDate } = params;
          await supplyService.createSupply({
            accountId: account.id,
            supplierId: booking.supplierId,
            userId: user.userId,
            proxy: user.proxy,
            latency: 100,
            deliveryDate: effectiveDate.toISOString(),
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
        });

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' }, // Group 1
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          proxy: { ip: '192.168.1.2', port: '8080' }, // Different proxy - Group 1 (same group since different proxy)
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              draftId: 'draft2',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 3,
          proxy: { ip: '192.168.1.3', port: '8080' }, // Different proxy - Group 1
          autobookings: [
            createAutobooking({
              id: 'booking-301',
              draftId: 'draft3',
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

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: All three bookings should be attempted (all in same group since they have different proxies)
      // - booking-101 fails but doesn't stop others in the same group
      // - booking-201 succeeds
      // - booking-301 succeeds
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(2); // 2 successful after first failure
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(3);
    });
  });

  describe('Scenario 4: Edge Cases', () => {
    test('should handle single user with single proxy', async () => {
      // Arrange: Simplest case
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
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

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(1);
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(1);
    });

    test('should handle empty availability list', async () => {
      // Arrange
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              customDates: [getFutureDate()],
            }),
          ],
        }),
      ];

      const availabilities: unknown[] = [];

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: No bookings should be attempted
      expect(mockSupplyService.createSupply).not.toHaveBeenCalled();
      expect(mockAutobookingExecutor.createBookingTask).not.toHaveBeenCalled();
    });

    test('should handle users with same proxy but different ports', async () => {
      // Arrange: Same IP, different ports should be treated as different proxies
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: { ip: '192.168.1.1', port: '8080' },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          proxy: { ip: '192.168.1.1', port: '8081' }, // Different port
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              draftId: 'draft2',
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

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Both bookings should be processed (different proxy groups due to different ports)
      expect(mockSupplyService.createSupply).toHaveBeenCalledTimes(2);
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(2);
    });
  });
});
