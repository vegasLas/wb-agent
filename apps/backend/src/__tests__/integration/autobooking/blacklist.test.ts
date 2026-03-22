/**
 * Autobooking Monitoring - User Blacklist Functionality Tests
 * Migrated from: tests/autobookingMonitoring.blacklist.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Adapted to new service architecture (AutobookingMonitoringService)
 * - Same test logic preserved
 */

import { AutobookingMonitoringService } from '../../../services/monitoring/autobooking/autobooking-monitoring.service';
import { sharedBanService } from '../../../services/monitoring/shared/ban.service';
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

// Mock PlaywrightBrowserService
const mockSelectDateAndNavigate = jest.fn();
jest.mock('../../../services/monitoring/playwright-browser.service', () => ({
  PlaywrightBrowserService: jest.fn().mockImplementation(() => ({
    selectDateAndNavigate: mockSelectDateAndNavigate,
  })),
  BrowserErrorCode: {
    LOGIN_FORM_DETECTED: 'LOGIN_FORM_DETECTED',
    BROWSER_INIT_FAILED: 'BROWSER_INIT_FAILED',
    CONTEXT_CREATION_FAILED: 'CONTEXT_CREATION_FAILED',
    PAGE_CREATION_FAILED: 'PAGE_CREATION_FAILED',
    NAVIGATION_TIMEOUT: 'NAVIGATION_TIMEOUT',
    NAVIGATION_FAILED: 'NAVIGATION_FAILED',
    CALENDAR_LOAD_TIMEOUT: 'CALENDAR_LOAD_TIMEOUT',
    DATE_ELEMENT_NOT_FOUND: 'DATE_ELEMENT_NOT_FOUND',
    DATE_SELECTION_FAILED: 'DATE_SELECTION_FAILED',
    NEXT_BUTTON_NOT_FOUND: 'NEXT_BUTTON_NOT_FOUND',
    NEXT_BUTTON_CLICK_FAILED: 'NEXT_BUTTON_CLICK_FAILED',
    PACKAGING_VIEW_TIMEOUT: 'PACKAGING_VIEW_TIMEOUT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
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

describe('AutobookingMonitoringService - User Blacklist Functionality', () => {
  let service: AutobookingMonitoringService;
  let mockBookingErrorService: jest.Mocked<typeof bookingErrorService>;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockAutobookingExecutor: jest.Mocked<typeof autobookingExecutorService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementation and set default success behavior
    mockSelectDateAndNavigate.mockClear();
    mockSelectDateAndNavigate.mockResolvedValue(undefined);

    service = new AutobookingMonitoringService();
    mockBookingErrorService = bookingErrorService as jest.Mocked<
      typeof bookingErrorService
    >;
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockAutobookingExecutor = autobookingExecutorService as jest.Mocked<
      typeof autobookingExecutorService
    >;

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

    // Set default mock for createBookingTask (tests can override)
    mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

    // Mock handleBookingProcessingError to simulate blacklisting for "too active" errors
    mockAutobookingExecutor.handleBookingProcessingError.mockImplementation(
      async ({ error, user }) => {
        const errorMessage = (error as Error).message;
        // Simulate the blacklisting behavior for "too active" errors
        if (
          errorMessage.includes(
            'Заметили, что вы слишком активно создаёте поставки',
          )
        ) {
          sharedBanService.addUserToBlacklist(user.userId, 600000); // 10 minutes
        }
      },
    );

    // Clear the blacklist and banned dates before each test
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
  });

  afterEach(() => {
    // Clean up any remaining state
    sharedBanService.clearAllBlacklistedUsers();
    sharedBanService.clearAllBannedDates();
  });

  describe('Scenario 1: Too Active Error Detection and Blacklisting', () => {
    test('should blacklist user when too active error occurs', async () => {
      // Arrange: User that will trigger too active error
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

      // Mock: First user gets too active error, second user succeeds
      const tooActiveError = new Error(
        'Заметили, что вы слишком активно создаёте поставки. Подождите пару минут и можете продолжить',
      );
      let callCount = 0;
      mockAutobookingExecutor.createBookingTask.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(tooActiveError); // User 1 gets too active error
        }
        return Promise.resolve(); // User 2 succeeds
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: User 1 should be blacklisted, User 2 should still process successfully
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        2,
      );

      // Verify that User 1 is now blacklisted
      expect(sharedBanService.isUserBlacklisted(1)).toBe(true);
      expect(sharedBanService.isUserBlacklisted(2)).toBe(false);
    });
  });

  describe('Scenario 2: Blacklisted User Skipping', () => {
    test('should skip blacklisted users in subsequent processing cycles', async () => {
      // Arrange: Manually blacklist a user and test processing
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

      // Pre-blacklist User 1
      sharedBanService.addUserToBlacklist(1, 600000); // 10 minutes

      // Mock successful booking for User 2
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Only User 2 should be processed (User 1 is blacklisted)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );

      // Verify the call was for User 2 (check userId in the call)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ userId: 2 }),
        }),
      );
    });
  });

  describe('Scenario 3: Blacklist Expiration', () => {
    test('should allow processing after blacklist expires', async () => {
      // Arrange: User with short blacklist duration
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

      // Blacklist user with very short duration (1ms)
      sharedBanService.addUserToBlacklist(1, 1);

      // Wait for blacklist to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Mock successful booking
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: User should be processed (blacklist expired)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );
      // Verify user is no longer blacklisted
      expect(sharedBanService.isUserBlacklisted(1)).toBe(false);
    });
  });

  describe('Scenario 4: Mixed Error Types', () => {
    test('should blacklist user for too active error but not for date unavailable error', async () => {
      // Arrange: Two users, one gets too active error, one gets date unavailable error
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

      // Mock different error types
      const tooActiveError = new Error(
        'Заметили, что вы слишком активно создаёте поставки. Подождите пару минут и можете продолжить',
      );
      const dateUnavailableError = new Error('Эта дата уже недоступна');

      // Update handleBookingProcessingError mock to handle different error types
      mockAutobookingExecutor.handleBookingProcessingError.mockImplementation(
        async ({ error, user }) => {
          const errorMessage = (error as Error).message;
          // Only blacklist for "too active" errors
          if (
            errorMessage.includes(
              'Заметили, что вы слишком активно создаёте поставки',
            )
          ) {
            sharedBanService.addUserToBlacklist(user.userId, 600000);
          }
          // Date unavailable errors don't cause blacklisting
        },
      );

      let callCount = 0;
      mockAutobookingExecutor.createBookingTask.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(tooActiveError); // User 1: too active error
        }
        return Promise.reject(dateUnavailableError); // User 2: date unavailable error
      });

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert:
      // - User 1 should be blacklisted (too active error)
      // - User 2 should not be blacklisted (date unavailable error)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        2,
      );

      // Verify User 1 is blacklisted but User 2 is not
      expect(sharedBanService.isUserBlacklisted(1)).toBe(true);
      expect(sharedBanService.isUserBlacklisted(2)).toBe(false);
    });
  });

  describe('Scenario 5: Multiple Blacklisted Users', () => {
    test('should skip all blacklisted users and process only non-blacklisted ones', async () => {
      // Arrange: Three users, two blacklisted, one normal
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

      // Blacklist Users 1 and 2
      sharedBanService.addUserToBlacklist(1, 600000);
      sharedBanService.addUserToBlacklist(2, 600000);

      // Mock successful booking for User 3
      mockAutobookingExecutor.createBookingTask.mockResolvedValue(undefined);

      // Act
      await service.processAvailabilities(monitoringUsers, availabilities);

      // Assert: Only User 3 should be processed
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledTimes(
        1,
      );

      // Verify the call was for User 3 (check userId in the call)
      expect(mockAutobookingExecutor.createBookingTask).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ userId: 3 }),
        }),
      );
    });
  });
});
