/**
 * Autobooking Monitoring - Tracking Tests
 * Migrated from: tests/autobookingMonitoring.tracking.test.ts
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
import { bookingErrorService } from '../../../services/internal/booking-error.service';
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

describe('AutobookingMonitoringService - Tracking', () => {
  let service: AutobookingMonitoringService;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockAutobookingExecutor: jest.Mocked<typeof autobookingExecutorService>;

  // Fixed test dates for consistent testing
  const TEST_DATE_1 = new Date();
  TEST_DATE_1.setDate(TEST_DATE_1.getDate() + 7);

  const TEST_DATE_2 = new Date();
  TEST_DATE_2.setDate(TEST_DATE_2.getDate() + 8);

  const TEST_DATE_3 = new Date();
  TEST_DATE_3.setDate(TEST_DATE_3.getDate() + 9);

  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
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

    // Set default mock for createBookingTask
    mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

    // Clear shared service states
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
  });

  afterEach(() => {
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.clearAllRunningUsers();
    sharedUserTrackingService.clearAllBlacklistedUsers();
  });

  describe('Scenario 1: Same Booking Multiple Dates', () => {
    test('should process same booking only once across multiple dates', async () => {
      // Arrange: Single booking with multiple dates
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [TEST_DATE_1, TEST_DATE_2],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: getDateString(TEST_DATE_1), coefficient: 100 },
            { date: getDateString(TEST_DATE_2), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should only execute booking once (for first successful date)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );
    });

    test('should skip booking for later dates after first attempt', async () => {
      // Arrange: Single booking with multiple dates
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [TEST_DATE_1, TEST_DATE_2, TEST_DATE_3],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: getDateString(TEST_DATE_1), coefficient: 100 },
            { date: getDateString(TEST_DATE_2), coefficient: 100 },
            { date: getDateString(TEST_DATE_3), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should only process once (booking is tracked and skipped for other dates)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('Scenario 2: Same User Multiple Bookings', () => {
    test('should handle same user with multiple different bookings', async () => {
      // Arrange: Single user with multiple bookings for same warehouse/date
      // Bookings have different proxies so they end up in different proxy groups
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              warehouseId: 123,
              customDates: [TEST_DATE_1],
            }),
            createAutobooking({
              id: 'booking-102',
              userId: 1,
              warehouseId: 123,
              draftId: 'draft2',
              customDates: [TEST_DATE_1],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: getDateString(TEST_DATE_1), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Both bookings should be processed (they're different bookings)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        2,
      );
    });
  });

  describe('Scenario 3: Multiple Users Same Warehouse-Date', () => {
    test('should handle multiple users targeting same warehouse-date', async () => {
      // Arrange: Multiple users targeting same warehouse-date
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [TEST_DATE_1],
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
              customDates: [TEST_DATE_1],
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
              customDates: [TEST_DATE_1],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: getDateString(TEST_DATE_1), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: All users should be processed
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        3,
      );
    });
  });

  describe('Scenario 4: Complex Multi-User Multi-Date', () => {
    test('should handle complex scenario with multiple users and dates', async () => {
      // Arrange: Complex scenario
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [TEST_DATE_1, TEST_DATE_2],
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
              customDates: [TEST_DATE_1],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: getDateString(TEST_DATE_1), coefficient: 100 },
            { date: getDateString(TEST_DATE_2), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Both users should be processed
      // User 1's booking should only be processed once (tracked after first date)
      // User 2's booking should be processed once
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        2,
      );
    });
  });

  describe('Scenario 5: Tracking Reset Between Cycles', () => {
    test('should reset tracking between processing cycles', async () => {
      // Arrange: Single user to be processed twice
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [TEST_DATE_1],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: getDateString(TEST_DATE_1), coefficient: 100 },
          ],
        },
      ];

      // Mock first call fails, simulating no booking
      mockAutobookingExecutor.createBookingTask
        .mockRejectedValueOnce(new Error('Date unavailable'))
        .mockResolvedValueOnce(undefined);

      // Act - First cycle (fails)
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Reset for second cycle
      sharedProcessingStateService.resetAutobookingState();
      sharedUserTrackingService.clearAllRunningUsers();
      sharedUserTrackingService.clearAllBlacklistedUsers();

      // Act - Second cycle (succeeds)
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Both attempts should have been made (tracking was reset)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        2,
      );
    });
  });

  describe('Scenario 6: Mixed Success and Failure', () => {
    test('should track successful bookings and skip them on subsequent dates', async () => {
      // Arrange: User with multiple dates
      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              customDates: [TEST_DATE_1, TEST_DATE_2, TEST_DATE_3],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [
            { date: getDateString(TEST_DATE_1), coefficient: 100 },
            { date: getDateString(TEST_DATE_2), coefficient: 100 },
            { date: getDateString(TEST_DATE_3), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should only process once (first success tracks the booking)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
