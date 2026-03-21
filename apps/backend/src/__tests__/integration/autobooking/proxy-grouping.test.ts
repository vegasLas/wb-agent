/**
 * Autobooking Monitoring - Proxy Grouping Tests
 * Migrated from: tests/autobookingMonitoring.proxyGrouping.test.ts
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

describe('AutobookingMonitoringService - Proxy Grouping', () => {
  let service: AutobookingMonitoringService;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockAutobookingExecutor: jest.Mocked<typeof autobookingExecutorService>;

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

  describe('Scenario 1: Basic Proxy Distribution', () => {
    test('should distribute bookings across different proxies', async () => {
      // Arrange: Users with different proxies
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: {
            ip: '1.1.1.1',
            port: '8080',
            username: 'user1',
            password: 'pass1',
          },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
            }),
          ],
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

      // Assert: Both users should be processed
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });

    test('should process bookings with same proxy in same group', async () => {
      // Arrange: Users with same proxy
      const sameProxy = {
        ip: '1.1.1.1',
        port: '8080',
        username: 'user1',
        password: 'pass1',
      };
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: sameProxy,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          proxy: sameProxy,
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

      // Assert: Both users should be processed
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });
  });

  describe('Scenario 2: Complex Proxy Distribution', () => {
    test('should handle same proxy across different warehouse-dates', async () => {
      // Arrange: Multiple warehouse-dates with same proxy users
      const sameProxy = {
        ip: '1.1.1.1',
        port: '8080',
        username: 'user1',
        password: 'pass1',
      };
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: sameProxy,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate(7)],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          proxy: sameProxy,
          autobookings: [
            createAutobooking({
              id: 'booking-201',
              userId: 2,
              supplierId: 'supplier-2',
              draftId: 'draft2',
              customDates: [getFutureDate(8)],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse 1',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(7), coefficient: 100 }],
        },
        {
          warehouseId: 456,
          warehouseName: 'Test Warehouse 2',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(8), coefficient: 100 }],
        },
      ];

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Both users should be processed
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });

    test('should handle multiple users with different proxies targeting same warehouse-date', async () => {
      // Arrange: Multiple different proxies, same warehouse-date
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: {
            ip: '1.1.1.1',
            port: '8080',
            username: 'user1',
            password: 'pass1',
          },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
            }),
          ],
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
          proxy: {
            ip: '3.3.3.3',
            port: '8080',
            username: 'user3',
            password: 'pass3',
          },
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

      // Assert: All users should be processed
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(3);
    });
  });

  describe('Scenario 3: Sequential Processing Verification', () => {
    test('should process groups sequentially within same warehouse-date', async () => {
      // Arrange: Multiple groups for same warehouse-date
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: {
            ip: '1.1.1.1',
            port: '8080',
            username: 'user1',
            password: 'pass1',
          },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
            }),
          ],
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

      // Assert: Both users processed
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });

    test('should isolate errors between proxy groups', async () => {
      // Arrange: Multiple groups where one fails
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: {
            ip: '1.1.1.1',
            port: '8080',
            username: 'user1',
            password: 'pass1',
          },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
            }),
          ],
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
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(), coefficient: 100 }],
        },
      ];

      // Mock first call fails
      mockAutobookingExecutor.executeBooking
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ success: true, supplyId: '99999' });

      // Act - should not throw, second group should still process
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Both groups were attempted
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });
  });

  describe('Scenario 4: Edge Cases', () => {
    test('should handle single user', async () => {
      // Arrange: Single user
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
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
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });

    test('should handle empty availability', async () => {
      // Arrange: User but no matching availability
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
            }),
          ],
        }),
      ];

      const availabilities: unknown[] = [];

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: No bookings attempted
      expect(mockAutobookingExecutor.executeBooking).not.toHaveBeenCalled();
    });

    test('should handle same IP with different ports as different proxies', async () => {
      // Arrange: Same IP but different ports
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          proxy: {
            ip: '1.1.1.1',
            port: '8080',
            username: 'user1',
            password: 'pass1',
          },
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [getFutureDate()],
            }),
          ],
        }),
        createMonitoringUser({
          userId: 2,
          supplierId: 'supplier-2',
          proxy: {
            ip: '1.1.1.1',
            port: '8081',
            username: 'user2',
            password: 'pass2',
          },
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

      // Assert: Both users processed
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });
  });
});
