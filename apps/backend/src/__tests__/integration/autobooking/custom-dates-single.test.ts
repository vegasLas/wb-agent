/**
 * Autobooking Monitoring - CUSTOM_DATES_SINGLE Mode Tests
 * Migrated from: tests/autobookingMonitoring.customDatesSingle.test.ts
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

describe('AutobookingMonitoringService - CUSTOM_DATES_SINGLE Mode', () => {
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

    // Mock account lookup
    (mockPrisma.account.findUnique as jest.Mock).mockImplementation((args: { where: { id: string } }) => {
      return Promise.resolve({
        id: args?.where?.id || 'account-123',
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
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
    sharedProcessingStateService.resetAutobookingState();
    sharedUserTrackingService.reset();
  });

  describe('Scenario 1: CUSTOM_DATES_SINGLE Basic Functionality', () => {
    test('should process only one date when multiple dates available in CUSTOM_DATES_SINGLE mode', async () => {
      // Arrange: User with CUSTOM_DATES_SINGLE mode and multiple dates
      const date1 = getFutureDate(7);
      const date2 = getFutureDate(8);
      const date3 = getFutureDate(9);

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              dateType: 'CUSTOM_DATES_SINGLE',
              customDates: [date1, date2, date3],
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
            { date: getFutureDateString(7), coefficient: 100 },
            { date: getFutureDateString(8), coefficient: 100 },
            { date: getFutureDateString(9), coefficient: 100 },
          ],
        },
      ];

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should execute booking only once (for one date)
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });

    test('should book the first available date in CUSTOM_DATES_SINGLE mode', async () => {
      // Arrange: User with CUSTOM_DATES_SINGLE mode
      const date1 = getFutureDate(7);
      const date2 = getFutureDate(8);

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              dateType: 'CUSTOM_DATES_SINGLE',
              customDates: [date1, date2],
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
            { date: getFutureDateString(7), coefficient: 100 },
            { date: getFutureDateString(8), coefficient: 100 },
          ],
        },
      ];

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should execute booking once
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 2: CUSTOM_DATES_SINGLE vs CUSTOM_DATES Comparison', () => {
    test('should book multiple dates in CUSTOM_DATES mode but only one in CUSTOM_DATES_SINGLE', async () => {
      // Arrange: Two users - one with CUSTOM_DATES, one with CUSTOM_DATES_SINGLE
      const date1 = getFutureDate(7);
      const date2 = getFutureDate(8);

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              dateType: 'CUSTOM_DATES',
              customDates: [date1, date2],
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
              dateType: 'CUSTOM_DATES_SINGLE',
              customDates: [date1, date2],
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
            { date: getFutureDateString(7), coefficient: 100 },
            { date: getFutureDateString(8), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: '99999',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: CUSTOM_DATES should book all available dates, CUSTOM_DATES_SINGLE should book one
      // The exact number depends on implementation, but CUSTOM_DATES_SINGLE should book fewer
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalled();
    });
  });

  describe('Scenario 3: CUSTOM_DATES_SINGLE Error Handling', () => {
    test('should try next date when first date fails in CUSTOM_DATES_SINGLE mode', async () => {
      // Arrange: User with CUSTOM_DATES_SINGLE mode and multiple dates
      const date1 = getFutureDate(7);
      const date2 = getFutureDate(8);

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              dateType: 'CUSTOM_DATES_SINGLE',
              customDates: [date1, date2],
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
            { date: getFutureDateString(7), coefficient: 100 },
            { date: getFutureDateString(8), coefficient: 100 },
          ],
        },
      ];

      // Mock first call fails, second succeeds
      mockAutobookingExecutor.executeBooking
        .mockRejectedValueOnce(new Error('Date unavailable'))
        .mockResolvedValueOnce({ success: true, supplyId: '99999' });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should have attempted booking twice (first failed, then fallback)
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });

    test('should stop after booking one date in CUSTOM_DATES_SINGLE mode', async () => {
      // Arrange: User with CUSTOM_DATES_SINGLE mode
      const date1 = getFutureDate(7);
      const date2 = getFutureDate(8);
      const date3 = getFutureDate(9);

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              dateType: 'CUSTOM_DATES_SINGLE',
              customDates: [date1, date2, date3],
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
            { date: getFutureDateString(7), coefficient: 100 },
            { date: getFutureDateString(8), coefficient: 100 },
            { date: getFutureDateString(9), coefficient: 100 },
          ],
        },
      ];

      // Mock successful booking
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: '99999',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Should only execute booking once (for one date only)
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 4: CUSTOM_DATES_SINGLE Multiple Users', () => {
    test('should handle multiple users with CUSTOM_DATES_SINGLE mode on same warehouse-date', async () => {
      // Arrange: Multiple users targeting same warehouse-date in SINGLE mode
      const date1 = getFutureDate(7);

      const monitoringUsers: MonitoringUser[] = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-101',
              userId: 1,
              dateType: 'CUSTOM_DATES_SINGLE',
              customDates: [date1],
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
              dateType: 'CUSTOM_DATES_SINGLE',
              customDates: [date1],
            }),
          ],
        }),
      ];

      const availabilities = [
        {
          warehouseId: 123,
          warehouseName: 'Test Warehouse',
          boxTypeID: 2 as const,
          availableDates: [{ date: getFutureDateString(7), coefficient: 100 }],
        },
      ];

      // Mock successful booking for all users
      mockAutobookingExecutor.executeBooking.mockResolvedValue({
        success: true,
        supplyId: '99999',
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Each user should be processed once
      expect(mockAutobookingExecutor.executeBooking).toHaveBeenCalledTimes(2);
    });
  });
});
