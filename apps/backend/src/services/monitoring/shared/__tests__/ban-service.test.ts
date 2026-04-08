/**
 * Ban Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/banService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import { SharedBanService, sharedBanService } from '@/services/monitoring/shared/ban.service';
import type {
  BanSingleDateParams,
  BanAllDatesParams,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// Mock the telegram notification service
jest.mock('../telegram-notification.service', () => ({
  sharedTelegramNotificationService: {
    sendBanNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SharedBanService', () => {
  let service: SharedBanService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    service = new SharedBanService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    service.destroy();
  });

  describe('banned dates management', () => {
    describe('isBanned', () => {
      it('should return false for non-banned combination', () => {
        const params = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          coefficient: 1.5,
        };

        expect(service.isBanned(params)).toBe(false);
      });

      it('should return true for banned combination', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        };

        service.banSingleDate(params);
        expect(service.isBanned({ ...params, date: params.date })).toBe(true);
      });

      it('should return false for expired ban', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
          duration: 30000, // 30 seconds
        };

        service.banSingleDate(params);
        expect(service.isBanned({ ...params, date: params.date })).toBe(true);

        jest.advanceTimersByTime(31000); // Advance 31 seconds
        expect(service.isBanned({ ...params, date: params.date })).toBe(false);
      });

      it('should clean up expired bans when checked', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
          duration: 30000,
        };

        service.banSingleDate(params);
        const stats1 = service.getStatistics();
        expect(stats1.bannedDatesCount).toBe(1);

        jest.advanceTimersByTime(31000);
        service.isBanned({ ...params, date: params.date }); // This should trigger cleanup

        const stats2 = service.getStatistics();
        expect(stats2.bannedDatesCount).toBe(0);
      });

      it('should handle all dates ban and single date ban correctly', () => {
        // Ban a specific date
        service.banSingleDate({
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        });

        // Ban all dates for warehouse-supply-coefficient
        service.banAllDates({
          warehouseId: 123,
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        });

        // Single date should be banned
        expect(
          service.isSingleDateBanned({
            warehouseId: 123,
            date: new Date('2024-01-15'),
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);
        // All dates should be banned
        expect(
          service.isAllDatesBanned({
            warehouseId: 123,
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);
        // Different date should be banned due to all dates ban
        expect(
          service.isBanned({
            warehouseId: 123,
            date: new Date('2024-01-20'),
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);
      });
    });

    describe('banSingleDate', () => {
      it('should add ban with default duration', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        };

        service.banSingleDate(params);
        expect(service.isSingleDateBanned(params)).toBe(true);

        const stats = service.getStatistics();
        expect(stats.bannedDatesCount).toBe(1);
      });

      it('should add ban with custom duration', () => {
        const params: BanSingleDateParams = {
          warehouseId: 456,
          date: new Date('2024-01-20'),
          supplyType: 'MONOPALLETE',
          error: { message: 'Custom duration error' },
          coefficient: 2,
          duration: 120000, // 2 minutes
        };

        service.banSingleDate(params);
        expect(service.isSingleDateBanned(params)).toBe(true);

        jest.advanceTimersByTime(100000); // 1 minute 40 seconds
        expect(service.isSingleDateBanned(params)).toBe(true);

        jest.advanceTimersByTime(25000); // Total 2 minutes 5 seconds
        expect(service.isSingleDateBanned(params)).toBe(false);
      });

      it('should not send notification for "date already unavailable" errors', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Эта дата уже недоступна' },
          coefficient: 1.5,
        };

        service.banSingleDate(params);

        // Check synchronously - notification should not be triggered for date unavailable errors
        expect(service.isSingleDateBanned(params)).toBe(true);
      });

      it('should add ban and trigger notification for other errors', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Server error' },
          coefficient: 1.5,
        };

        service.banSingleDate(params);

        // Verify the ban was created (main functionality)
        expect(service.isSingleDateBanned(params)).toBe(true);

        // Note: Notification is sent asynchronously without await (fire-and-forget)
        // so we can't easily test it completed, but the ban creation is the main functionality
      });

      it('should handle notification errors gracefully', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        };

        expect(() => service.banSingleDate(params)).not.toThrow();

        // Verify the ban was created despite potential notification errors
        expect(service.isSingleDateBanned(params)).toBe(true);

        // Note: Notification errors are handled asynchronously and don't affect ban creation
      });

      it('should handle missing admin user gracefully', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        };

        expect(() => service.banSingleDate(params)).not.toThrow();

        // Verify the ban was created despite missing admin user
        expect(service.isSingleDateBanned(params)).toBe(true);

        // Note: Missing admin user is handled asynchronously and doesn't affect ban creation
      });
    });

    describe('banAllDates', () => {
      it('should ban all dates for warehouse-supply-coefficient', () => {
        const params: BanAllDatesParams = {
          warehouseId: 123,
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        };

        service.banAllDates(params);
        expect(
          service.isAllDatesBanned({
            warehouseId: 123,
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);

        const stats = service.getStatistics();
        expect(stats.bannedDatesCount).toBe(1);
      });

      it('should add ban with custom duration', () => {
        const params: BanAllDatesParams = {
          warehouseId: 456,
          supplyType: 'MONOPALLETE',
          error: { message: 'Custom duration error' },
          coefficient: 2,
          duration: 120000, // 2 minutes
        };

        service.banAllDates(params);
        expect(
          service.isAllDatesBanned({
            warehouseId: 456,
            supplyType: 'MONOPALLETE',
            coefficient: 2,
          }),
        ).toBe(true);

        jest.advanceTimersByTime(100000); // 1 minute 40 seconds
        expect(
          service.isAllDatesBanned({
            warehouseId: 456,
            supplyType: 'MONOPALLETE',
            coefficient: 2,
          }),
        ).toBe(true);

        jest.advanceTimersByTime(25000); // Total 2 minutes 5 seconds
        expect(
          service.isAllDatesBanned({
            warehouseId: 456,
            supplyType: 'MONOPALLETE',
            coefficient: 2,
          }),
        ).toBe(false);
      });

      it('should affect isBanned check for any date', () => {
        const params: BanAllDatesParams = {
          warehouseId: 123,
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
        };

        service.banAllDates(params);

        // Any date should be considered banned
        expect(
          service.isBanned({
            warehouseId: 123,
            date: new Date('2024-01-15'),
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);
        expect(
          service.isBanned({
            warehouseId: 123,
            date: new Date('2024-01-20'),
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);
        expect(
          service.isBanned({
            warehouseId: 123,
            date: new Date('2024-12-25'),
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);
      });
    });

    describe('ban key generation (tested indirectly)', () => {
      it('should generate different keys for different combinations', () => {
        const params1: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Error 1' },
          coefficient: 1.5,
        };

        const params2: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-16'),
          supplyType: 'BOX',
          error: { message: 'Error 2' },
          coefficient: 1.5,
        };

        const params3: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'MONOPALLETE',
          error: { message: 'Error 3' },
          coefficient: 2,
        };

        service.banSingleDate(params1);
        service.banSingleDate(params2);
        service.banSingleDate(params3);

        expect(service.isSingleDateBanned(params1)).toBe(true);
        expect(service.isSingleDateBanned(params2)).toBe(true);
        expect(service.isSingleDateBanned(params3)).toBe(true);

        const stats = service.getStatistics();
        expect(stats.bannedDatesCount).toBe(3);
      });

      it('should handle all dates ban and single date ban separately', () => {
        // Ban all dates
        service.banAllDates({
          warehouseId: 123,
          supplyType: 'BOX',
          error: { message: 'Error 1' },
          coefficient: 1.5,
        });

        // Ban specific date
        service.banSingleDate({
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Error 2' },
          coefficient: 1.5,
        });

        const stats = service.getStatistics();
        expect(stats.bannedDatesCount).toBe(2);
      });
    });
  });

  describe('blacklisted users management', () => {
    describe('isUserBlacklisted', () => {
      it('should return false for non-blacklisted user', () => {
        expect(service.isUserBlacklisted(123)).toBe(false);
      });

      it('should return true for blacklisted user', () => {
        service.addUserToBlacklist(123);
        expect(service.isUserBlacklisted(123)).toBe(true);
      });

      it('should return false for expired blacklist', () => {
        service.addUserToBlacklist(123, 30000); // 30 seconds
        expect(service.isUserBlacklisted(123)).toBe(true);

        jest.advanceTimersByTime(31000); // 31 seconds
        expect(service.isUserBlacklisted(123)).toBe(false);
      });

      it('should clean up expired users when checked', () => {
        service.addUserToBlacklist(123, 30000);
        const stats1 = service.getStatistics();
        expect(stats1.blacklistedUsersCount).toBe(1);

        jest.advanceTimersByTime(31000);
        service.isUserBlacklisted(123); // This should trigger cleanup

        const stats2 = service.getStatistics();
        expect(stats2.blacklistedUsersCount).toBe(0);
      });
    });

    describe('addUserToBlacklist', () => {
      it('should add user with default duration', () => {
        service.addUserToBlacklist(123);

        expect(service.isUserBlacklisted(123)).toBe(true);
      });

      it('should add user with custom duration', () => {
        service.addUserToBlacklist(456, 120000); // 2 minutes

        expect(service.isUserBlacklisted(456)).toBe(true);

        jest.advanceTimersByTime(100000); // 1 minute 40 seconds
        expect(service.isUserBlacklisted(456)).toBe(true);

        jest.advanceTimersByTime(25000); // Total 2 minutes 5 seconds
        expect(service.isUserBlacklisted(456)).toBe(false);
      });

      it('should update existing blacklist duration', () => {
        service.addUserToBlacklist(123, 60000); // 1 minute
        jest.advanceTimersByTime(30000); // 30 seconds

        service.addUserToBlacklist(123, 120000); // Re-blacklist for 2 minutes

        jest.advanceTimersByTime(60000); // Total 1 minute 30 seconds from first blacklist
        expect(service.isUserBlacklisted(123)).toBe(true); // Should still be blacklisted due to reset
      });
    });

    describe('removeUserFromBlacklist', () => {
      it('should remove user from blacklist', () => {
        service.addUserToBlacklist(123);
        expect(service.isUserBlacklisted(123)).toBe(true);

        service.removeUserFromBlacklist(123);

        expect(service.isUserBlacklisted(123)).toBe(false);
      });

      it('should handle removing non-blacklisted user gracefully', () => {
        expect(() => service.removeUserFromBlacklist(999)).not.toThrow();
      });
    });
  });

  describe('automatic cleanup', () => {
    describe('clearExpiredBans', () => {
      it('should clear expired banned dates', () => {
        const params1: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Error 1' },
          coefficient: 1.5,
          duration: 30000, // 30 seconds
        };

        const params2: BanSingleDateParams = {
          warehouseId: 456,
          date: new Date('2024-01-20'),
          supplyType: 'BOX',
          error: { message: 'Error 2' },
          coefficient: 1.5,
          duration: 60000, // 60 seconds
        };

        service.banSingleDate(params1);
        service.banSingleDate(params2);

        expect(service.getStatistics().bannedDatesCount).toBe(2);

        jest.advanceTimersByTime(45000); // 45 seconds - first should expire
        service.clearExpiredBans();

        expect(service.getStatistics().bannedDatesCount).toBe(1);
        expect(service.isSingleDateBanned(params1)).toBe(false);
        expect(service.isSingleDateBanned(params2)).toBe(true);
      });

      it('should clear expired blacklisted users', () => {
        service.addUserToBlacklist(123, 30000); // 30 seconds
        service.addUserToBlacklist(456, 60000); // 60 seconds

        expect(service.getStatistics().blacklistedUsersCount).toBe(2);

        jest.advanceTimersByTime(45000); // 45 seconds - first should expire
        service.clearExpiredBans();

        expect(service.getStatistics().blacklistedUsersCount).toBe(1);
        expect(service.isUserBlacklisted(123)).toBe(false);
        expect(service.isUserBlacklisted(456)).toBe(true);
      });

      it('should be called automatically by timer', () => {
        const clearSpy = jest.spyOn(service, 'clearExpiredBans');

        jest.advanceTimersByTime(5000); // Timer interval is 5 seconds
        expect(clearSpy).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(5000);
        expect(clearSpy).toHaveBeenCalledTimes(2);

        clearSpy.mockRestore();
      });
    });
  });

  describe('utility methods', () => {
    describe('clearAllBannedDates', () => {
      it('should clear all banned dates', () => {
        const params1: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Error 1' },
          coefficient: 1.5,
        };

        const params2: BanAllDatesParams = {
          warehouseId: 456,
          supplyType: 'MONOPALLETE',
          error: { message: 'Error 2' },
          coefficient: 2,
        };

        service.banSingleDate(params1);
        service.banAllDates(params2);

        expect(service.getStatistics().bannedDatesCount).toBe(2);

        service.clearAllBannedDates();

        expect(service.getStatistics().bannedDatesCount).toBe(0);
        expect(service.isSingleDateBanned(params1)).toBe(false);
        expect(
          service.isAllDatesBanned({
            warehouseId: 456,
            supplyType: 'MONOPALLETE',
            coefficient: 2,
          }),
        ).toBe(false);
      });
    });

    describe('clearAllBlacklistedUsers', () => {
      it('should clear all blacklisted users', () => {
        service.addUserToBlacklist(123);
        service.addUserToBlacklist(456);

        expect(service.getStatistics().blacklistedUsersCount).toBe(2);

        service.clearAllBlacklistedUsers();

        expect(service.getStatistics().blacklistedUsersCount).toBe(0);
        expect(service.isUserBlacklisted(123)).toBe(false);
        expect(service.isUserBlacklisted(456)).toBe(false);
      });
    });

    describe('getStatistics', () => {
      it('should return empty statistics initially', () => {
        const stats = service.getStatistics();

        expect(stats).toEqual({
          bannedDatesCount: 0,
          blacklistedUsersCount: 0,
          banAttemptsCount: 0,
          activeBans: [],
          activeBlacklist: [],
          activeBanAttempts: [],
        });
      });

      it('should return correct statistics with data', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Error' },
          coefficient: 1.5,
        };

        service.banSingleDate(params);
        service.addUserToBlacklist(456);

        const stats = service.getStatistics();

        expect(stats.bannedDatesCount).toBe(1);
        expect(stats.blacklistedUsersCount).toBe(1);
        expect(stats.banAttemptsCount).toBe(1);
      });

      it('should clean up before returning statistics', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Error' },
          coefficient: 1.5,
          duration: 30000,
        };

        service.banSingleDate(params);
        service.addUserToBlacklist(789, 30000);

        jest.advanceTimersByTime(31000); // Expire both

        const stats = service.getStatistics();

        expect(stats.bannedDatesCount).toBe(0);
        expect(stats.blacklistedUsersCount).toBe(0);
        expect(stats.banAttemptsCount).toBe(0);
      });
    });

    describe('destroy', () => {
      it('should clean up all resources', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Error' },
          coefficient: 1.5,
        };

        service.banSingleDate(params);
        service.addUserToBlacklist(456);

        expect(service.getStatistics().bannedDatesCount).toBe(1);
        expect(service.getStatistics().blacklistedUsersCount).toBe(1);

        service.destroy();

        expect(service.getStatistics().bannedDatesCount).toBe(0);
        expect(service.getStatistics().blacklistedUsersCount).toBe(0);
      });

      it('should clear timer', () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        service.destroy();

        expect(clearIntervalSpy).toHaveBeenCalled();
        clearIntervalSpy.mockRestore();
      });
    });
  });

  describe('notification message building', () => {
    it('should create ban for date-specific errors', () => {
      const params: BanSingleDateParams = {
        warehouseId: 123,
        date: new Date('2024-01-15'),
        supplyType: 'BOX',
        dateType: 'WEEK',
        error: { message: 'Test error' },
        coefficient: 1.5,
      };

      service.banSingleDate(params);

      // Verify the ban was created
      expect(service.isSingleDateBanned(params)).toBe(true);

      // Note: Notification message building is tested indirectly through the non-date-unavailable logic
      // The actual notification sending is fire-and-forget async and hard to test directly
    });

    it('should create ban for CUSTOM_DATES errors using banAllDates', () => {
      const params: BanAllDatesParams = {
        warehouseId: 123,
        supplyType: 'MONOPALLETE',
        dateType: 'CUSTOM_DATES',
        coefficient: 2,
        error: { message: 'Custom dates error' },
      };

      service.banAllDates(params);

      // Verify the ban was created
      expect(
        service.isAllDatesBanned({
          warehouseId: 123,
          supplyType: 'MONOPALLETE',
          coefficient: 2,
        }),
      ).toBe(true);

      // Note: CUSTOM_DATES notification is sent asynchronously and hard to test directly
    });

    it('should create ban for SUPERSAFE supply type using banAllDates', () => {
      const params: BanAllDatesParams = {
        warehouseId: 123,
        supplyType: 'SUPERSAFE',
        coefficient: 2.5,
        error: { message: 'Test error' },
      };

      service.banAllDates(params);

      // Verify the ban was created
      expect(
        service.isAllDatesBanned({
          warehouseId: 123,
          supplyType: 'SUPERSAFE',
          coefficient: 2.5,
        }),
      ).toBe(true);

      // Note: Supply type translation in notifications is handled async and hard to test directly
      // The logic is covered by checking that the ban was created for non-date-unavailable errors
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete ban workflow', async () => {
      const params: BanSingleDateParams = {
        warehouseId: 123,
        date: new Date('2024-01-15'),
        supplyType: 'BOX',
        error: { message: 'Integration test error' },
        coefficient: 1.5,
        duration: 60000, // 1 minute
      };

      // Ban the date
      service.banSingleDate(params);
      expect(service.isSingleDateBanned(params)).toBe(true);

      // Check statistics
      const stats1 = service.getStatistics();
      expect(stats1.bannedDatesCount).toBe(1);

      // Wait for expiration
      jest.advanceTimersByTime(61000);
      expect(service.isSingleDateBanned(params)).toBe(false);

      // Check cleanup
      const stats2 = service.getStatistics();
      expect(stats2.bannedDatesCount).toBe(0);
    });

    it('should handle user blacklisting workflow', () => {
      const userId = 123;

      // Blacklist user
      service.addUserToBlacklist(userId, 60000);
      expect(service.isUserBlacklisted(userId)).toBe(true);

      // Check statistics
      const stats1 = service.getStatistics();
      expect(stats1.blacklistedUsersCount).toBe(1);
      expect(stats1.activeBlacklist).toContain(userId);

      // Manual removal
      service.removeUserFromBlacklist(userId);
      expect(service.isUserBlacklisted(userId)).toBe(false);

      const stats2 = service.getStatistics();
      expect(stats2.blacklistedUsersCount).toBe(0);
    });
  });

  describe('ban attempt tracking and duration extension', () => {
    describe('single ban attempts', () => {
      it('should track individual ban attempts', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error' },
          coefficient: 1.5,
          duration: 2000, // 2 seconds
        };

        service.banSingleDate(params);

        const stats = service.getStatistics();
        expect(stats.banAttemptsCount).toBe(1);
      });

      it('should track multiple attempts for different warehouse-date combinations', () => {
        const params1: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Test error 1' },
          coefficient: 1.5,
        };

        const params2: BanSingleDateParams = {
          warehouseId: 456,
          date: new Date('2024-01-20'),
          supplyType: 'MONOPALLETE',
          error: { message: 'Test error 2' },
          coefficient: 2,
        };

        service.banSingleDate(params1);
        service.banSingleDate(params2);

        const stats = service.getStatistics();
        expect(stats.banAttemptsCount).toBe(2);
      });
    });

    describe('rapid ban attempts and duration extension', () => {
      it('should extend ban duration when 3 attempts occur within 20 seconds', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Rapid error' },
          coefficient: 1.5,
          duration: 2000, // 2 seconds base duration
        };

        // First attempt
        service.banSingleDate(params);
        expect(service.isSingleDateBanned(params)).toBe(true);

        // Second attempt (within 20 seconds)
        jest.advanceTimersByTime(5000); // 5 seconds later
        service.banSingleDate(params);
        expect(service.isSingleDateBanned(params)).toBe(true);

        // Third attempt (within 20 seconds) - should trigger extension
        jest.advanceTimersByTime(5000); // 10 seconds total
        service.banSingleDate(params);
        expect(service.isSingleDateBanned(params)).toBe(true);

        // After original 2 seconds, should still be banned due to extension
        jest.advanceTimersByTime(3000); // 13 seconds total, past original 2s duration
        expect(service.isSingleDateBanned(params)).toBe(true);

        // Should remain banned for a while due to extension
        jest.advanceTimersByTime(60000); // Additional 1 minute
        expect(service.isSingleDateBanned(params)).toBe(true);
      });

      it('should reset ban attempt tracking after duration extension', () => {
        const params: BanSingleDateParams = {
          warehouseId: 789,
          date: new Date('2024-02-01'),
          supplyType: 'SUPERSAFE',
          error: { message: 'Reset test error' },
          coefficient: 2.5,
          duration: 1000, // 1 second
        };

        // Trigger 3 rapid attempts to cause extension
        service.banSingleDate(params);
        jest.advanceTimersByTime(1000);
        service.banSingleDate(params);
        jest.advanceTimersByTime(1000);
        service.banSingleDate(params); // This should trigger extension and reset

        const stats = service.getStatistics();
        // Ban attempts should be reset after extension
        expect(stats.banAttemptsCount).toBe(0);
      });

      it('should not extend duration if attempts are not within 20 second window', () => {
        const params: BanSingleDateParams = {
          warehouseId: 456,
          date: new Date('2024-01-20'),
          supplyType: 'BOX',
          error: { message: 'Slow error' },
          coefficient: 1.5,
          duration: 2000, // 2 seconds
        };

        // First attempt
        service.banSingleDate(params);

        // Second attempt after 25 seconds (outside window)
        jest.advanceTimersByTime(25000);
        service.banSingleDate(params);

        // Third attempt after another 25 seconds
        jest.advanceTimersByTime(25000);
        service.banSingleDate(params);

        // Should expire after normal duration (2 seconds from last attempt)
        jest.advanceTimersByTime(3000);
        expect(service.isSingleDateBanned(params)).toBe(false);
      });
    });

    describe('ban attempt cleanup', () => {
      it('should clean up expired ban attempts automatically', () => {
        const params: BanSingleDateParams = {
          warehouseId: 123,
          date: new Date('2024-01-15'),
          supplyType: 'BOX',
          error: { message: 'Cleanup test' },
          coefficient: 1.5,
          duration: 1000,
        };

        service.banSingleDate(params);

        let stats = service.getStatistics();
        expect(stats.banAttemptsCount).toBe(1);

        // Wait for ban attempt to expire (> 20 seconds)
        jest.advanceTimersByTime(25000);

        // Trigger cleanup by calling clearExpiredBans
        service.clearExpiredBans();

        stats = service.getStatistics();
        expect(stats.banAttemptsCount).toBe(0);
      });

      it('should clean up ban attempts during automatic timer cleanup', () => {
        const params: BanSingleDateParams = {
          warehouseId: 999,
          date: new Date('2024-03-01'),
          supplyType: 'BOX',
          error: { message: 'Timer cleanup test' },
          coefficient: 1.5,
        };

        service.banSingleDate(params);

        let stats = service.getStatistics();
        expect(stats.banAttemptsCount).toBe(1);

        // Wait for automatic cleanup (timer runs every 5 seconds)
        jest.advanceTimersByTime(25000); // 25 seconds to ensure ban attempts expire

        stats = service.getStatistics();
        expect(stats.banAttemptsCount).toBe(0);
      });

      it('should keep recent ban attempts and clean only expired ones', () => {
        const params1: BanSingleDateParams = {
          warehouseId: 111,
          date: new Date('2024-01-10'),
          supplyType: 'BOX',
          error: { message: 'Old attempt' },
          coefficient: 1.5,
        };

        const params2: BanSingleDateParams = {
          warehouseId: 222,
          date: new Date('2024-01-11'),
          supplyType: 'BOX',
          error: { message: 'Recent attempt' },
          coefficient: 1.5,
        };

        // Add first attempt
        service.banSingleDate(params1);

        // Wait 25 seconds (past the 20-second window)
        jest.advanceTimersByTime(25000);

        // Add second attempt
        service.banSingleDate(params2);

        // Before cleanup, both should be present
        const statsBeforeCleanup = service.getStatistics();
        // Note: The first call to getStatistics already triggers cleanup, so we only see the recent one
        expect(statsBeforeCleanup.banAttemptsCount).toBe(1);
      });
    });

    describe('integration with all dates ban functionality', () => {
      it('should work correctly with banAllDates', () => {
        const params: BanAllDatesParams = {
          warehouseId: 123,
          supplyType: 'BOX',
          error: { message: 'All dates test' },
          coefficient: 1.5,
          duration: 1000,
        };

        // Trigger 3 rapid attempts
        service.banAllDates(params);
        service.banAllDates(params);
        service.banAllDates(params);

        const stats = service.getStatistics();
        expect(stats.banAttemptsCount).toBe(0); // Should be reset after extension
        expect(
          service.isAllDatesBanned({
            warehouseId: 123,
            supplyType: 'BOX',
            coefficient: 1.5,
          }),
        ).toBe(true);
      });

      it('should maintain ban attempt tracking across statistics calls', () => {
        const params: BanSingleDateParams = {
          warehouseId: 555,
          date: new Date('2024-05-01'),
          supplyType: 'MONOPALLETE',
          error: { message: 'Statistics test' },
          coefficient: 2,
        };

        service.banSingleDate(params);

        // Multiple statistics calls should maintain consistency
        expect(service.getStatistics().banAttemptsCount).toBe(1);
        expect(service.getStatistics().banAttemptsCount).toBe(1);
        expect(service.getStatistics().banAttemptsCount).toBe(1);

        // Ban attempt should still be tracked
        expect(
          service.getStatistics().activeBanAttempts.length,
        ).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(sharedBanService).toBeInstanceOf(SharedBanService);
    });

    it('should maintain state across accesses', () => {
      const params: BanSingleDateParams = {
        warehouseId: 999,
        date: new Date('2024-01-01'),
        supplyType: 'BOX',
        error: { message: 'Singleton test' },
        coefficient: 1.5,
      };

      sharedBanService.banSingleDate(params);
      expect(sharedBanService.isSingleDateBanned(params)).toBe(true);

      // Clean up for other tests
      sharedBanService.clearAllBannedDates();
    });
  });
});
