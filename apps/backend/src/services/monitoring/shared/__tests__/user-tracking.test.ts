/**
 * User Tracking Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/userTrackingService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 * - Added missing test cases from deprecated
 */

import {
  SharedUserTrackingService,
  sharedUserTrackingService,
} from '@/services/monitoring/shared/user-tracking.service';

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SharedUserTrackingService', () => {
  let service: SharedUserTrackingService;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {
      /* intentionally empty */
    });
    service = new SharedUserTrackingService();
  });

  afterEach(() => {
    service.cleanup();
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
  });

  describe('trackUserAsRunning', () => {
    test('should mark user as running', () => {
      // Act
      service.trackUserAsRunning(123);

      // Assert
      expect(service.isUserRunning(123)).toBe(true);
    });

    test('should track multiple running users', () => {
      // Act
      service.trackUserAsRunning(1);
      service.trackUserAsRunning(2);
      service.trackUserAsRunning(3);

      // Assert
      expect(service.isUserRunning(1)).toBe(true);
      expect(service.isUserRunning(2)).toBe(true);
      expect(service.isUserRunning(3)).toBe(true);
    });

    test('should handle tracking same user multiple times', () => {
      service.trackUserAsRunning(123);
      service.trackUserAsRunning(123);

      expect(service.isUserRunning(123)).toBe(true);
      expect(service.getRunningUserCount()).toBe(1); // Should not duplicate
    });
  });

  describe('trackUsersAsRunning', () => {
    test('should track multiple users at once', () => {
      // Act
      service.trackUsersAsRunning([1, 2, 3]);

      // Assert
      expect(service.isUserRunning(1)).toBe(true);
      expect(service.isUserRunning(2)).toBe(true);
      expect(service.isUserRunning(3)).toBe(true);
    });

    test('should handle empty array gracefully', () => {
      service.trackUsersAsRunning([]);
      expect(service.getRunningUserCount()).toBe(0);
    });

    test('should handle duplicate users in array', () => {
      service.trackUsersAsRunning([123, 456, 123]);

      expect(service.getRunningUserCount()).toBe(2);
      expect(service.isUserRunning(123)).toBe(true);
      expect(service.isUserRunning(456)).toBe(true);
    });
  });

  describe('removeUserFromRunning', () => {
    test('should remove user from running', () => {
      // Arrange
      service.trackUserAsRunning(123);

      // Act
      service.removeUserFromRunning(123);

      // Assert
      expect(service.isUserRunning(123)).toBe(false);
    });

    test('should handle removing non-running user gracefully', () => {
      // Act - should not throw
      expect(() => service.removeUserFromRunning(999)).not.toThrow();
    });

    test('should remove user from running tracking', () => {
      service.trackUserAsRunning(123);
      expect(service.isUserRunning(123)).toBe(true);

      service.removeUserFromRunning(123);
      expect(service.isUserRunning(123)).toBe(false);
      expect(service.getRunningUserCount()).toBe(0);
    });

    test('should handle removing non-tracked user gracefully', () => {
      expect(() => service.removeUserFromRunning(999)).not.toThrow();
      expect(service.getRunningUserCount()).toBe(0);
    });
  });

  describe('removeUsersFromRunning', () => {
    test('should remove multiple users at once', () => {
      // Arrange
      service.trackUsersAsRunning([1, 2, 3]);

      // Act
      service.removeUsersFromRunning([1, 2]);

      // Assert
      expect(service.isUserRunning(1)).toBe(false);
      expect(service.isUserRunning(2)).toBe(false);
      expect(service.isUserRunning(3)).toBe(true);
    });

    test('should remove multiple users from running tracking', () => {
      service.trackUsersAsRunning([123, 456, 789]);
      expect(service.getRunningUserCount()).toBe(3);

      service.removeUsersFromRunning([123, 456]);

      expect(service.isUserRunning(123)).toBe(false);
      expect(service.isUserRunning(456)).toBe(false);
      expect(service.isUserRunning(789)).toBe(true);
      expect(service.getRunningUserCount()).toBe(1);
    });

    test('should handle empty array gracefully', () => {
      service.trackUsersAsRunning([123, 456]);
      service.removeUsersFromRunning([]);

      expect(service.getRunningUserCount()).toBe(2);
    });
  });

  describe('isUserRunning', () => {
    test('should return false for non-running user', () => {
      // Act & Assert
      expect(service.isUserRunning(999)).toBe(false);
    });

    test('should return true for running user', () => {
      // Arrange
      service.trackUserAsRunning(123);

      // Act & Assert
      expect(service.isUserRunning(123)).toBe(true);
    });

    test('should return false for user not being tracked', () => {
      expect(service.isUserRunning(123)).toBe(false);
    });

    test('should return true for user being tracked', () => {
      service.trackUserAsRunning(123);
      expect(service.isUserRunning(123)).toBe(true);
    });
  });

  describe('getRunningUserIds', () => {
    test('should return empty set when no users running', () => {
      // Act
      const running = service.getRunningUserIds();

      // Assert
      expect(running.size).toBe(0);
    });

    test('should return set of running user IDs', () => {
      // Arrange
      service.trackUserAsRunning(1);
      service.trackUserAsRunning(2);

      // Act
      const running = service.getRunningUserIds();

      // Assert
      expect(running).toContain(1);
      expect(running).toContain(2);
      expect(running.size).toBe(2);
    });

    test('should not include removed users', () => {
      // Arrange
      service.trackUserAsRunning(1);
      service.trackUserAsRunning(2);
      service.removeUserFromRunning(1);

      // Act
      const running = service.getRunningUserIds();

      // Assert
      expect(running).not.toContain(1);
      expect(running).toContain(2);
    });

    test('should return copy of running user IDs', () => {
      service.trackUsersAsRunning([123, 456]);

      const runningUsers1 = service.getRunningUserIds();
      const runningUsers2 = service.getRunningUserIds();

      expect(runningUsers1).not.toBe(runningUsers2); // Different objects
      expect(runningUsers1).toEqual(runningUsers2); // Same content
      expect(runningUsers1.has(123)).toBe(true);
      expect(runningUsers1.has(456)).toBe(true);
    });
  });

  describe('getRunningUserCount', () => {
    test('should return 0 when no users running', () => {
      // Act & Assert
      expect(service.getRunningUserCount()).toBe(0);
    });

    test('should return correct count of running users', () => {
      // Arrange
      service.trackUserAsRunning(1);
      service.trackUserAsRunning(2);
      service.trackUserAsRunning(3);

      // Act & Assert
      expect(service.getRunningUserCount()).toBe(3);
    });

    test('should update count when users are removed', () => {
      // Arrange
      service.trackUserAsRunning(1);
      service.trackUserAsRunning(2);
      service.removeUserFromRunning(1);

      // Act & Assert
      expect(service.getRunningUserCount()).toBe(1);
    });

    test('should return correct count', () => {
      expect(service.getRunningUserCount()).toBe(0);

      service.trackUsersAsRunning([123, 456]);
      expect(service.getRunningUserCount()).toBe(2);

      service.removeUserFromRunning(123);
      expect(service.getRunningUserCount()).toBe(1);
    });
  });

  describe('clearAllRunningUsers', () => {
    test('should clear all running users', () => {
      // Arrange
      service.trackUserAsRunning(1);
      service.trackUserAsRunning(2);

      // Act
      service.clearAllRunningUsers();

      // Assert
      expect(service.isUserRunning(1)).toBe(false);
      expect(service.isUserRunning(2)).toBe(false);
      expect(service.getRunningUserCount()).toBe(0);
    });

    test('should log clear operation', () => {
      service.clearAllRunningUsers();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🧹 Cleared all running users',
      );
    });
  });

  describe('Blacklist functionality', () => {
    describe('addUserToBlacklist', () => {
      test('should add user to blacklist with default duration', () => {
        // Act
        service.addUserToBlacklist(123);

        // Assert
        expect(service.isUserBlacklisted(123)).toBe(true);
      });

      test('should add user to blacklist with custom duration', () => {
        // Act
        service.addUserToBlacklist(123, 60000); // 1 minute

        // Assert
        expect(service.isUserBlacklisted(123)).toBe(true);
      });

      test('should add user to blacklist with default duration', () => {
        service.addUserToBlacklist(123);

        expect(service.isUserBlacklisted(123)).toBe(true);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '🚫 BLACKLISTED USER: 123 - Duration: 10 minutes',
        );
      });

      test('should add user to blacklist with custom duration', () => {
        service.addUserToBlacklist(123, 30000); // 30 seconds

        expect(service.isUserBlacklisted(123)).toBe(true);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '🚫 BLACKLISTED USER: 123 - Duration: 0.5 minutes',
        );
      });

      test('should handle re-blacklisting user (update duration)', () => {
        service.addUserToBlacklist(123, 30000);
        jest.advanceTimersByTime(20000); // Advance 20 seconds

        service.addUserToBlacklist(123, 60000); // Re-blacklist for 1 minute

        jest.advanceTimersByTime(40000); // Advance another 40 seconds (total 60s from first blacklist)
        expect(service.isUserBlacklisted(123)).toBe(true); // Should still be blacklisted due to reset
      });
    });

    describe('isUserBlacklisted', () => {
      test('should return false for non-blacklisted user', () => {
        // Act & Assert
        expect(service.isUserBlacklisted(999)).toBe(false);
      });

      test('should return true for blacklisted user', () => {
        // Arrange
        service.addUserToBlacklist(123);

        // Act & Assert
        expect(service.isUserBlacklisted(123)).toBe(true);
      });

      test('should return false after blacklist expires', async () => {
        // Arrange
        service.addUserToBlacklist(123, 1); // 1ms

        // Wait for expiration
        jest.advanceTimersByTime(10);

        // Act & Assert
        expect(service.isUserBlacklisted(123)).toBe(false);
      });

      test('should return false for non-blacklisted user', () => {
        expect(service.isUserBlacklisted(123)).toBe(false);
      });

      test('should return true for blacklisted user', () => {
        service.addUserToBlacklist(123);

        expect(service.isUserBlacklisted(123)).toBe(true);
      });

      test('should return false after blacklist expires', () => {
        service.addUserToBlacklist(123, 60000); // 1 minute
        expect(service.isUserBlacklisted(123)).toBe(true);

        jest.advanceTimersByTime(61000); // Advance time by 1 minute + 1 second
        expect(service.isUserBlacklisted(123)).toBe(false);
      });

      test('should clean up expired user when checked', () => {
        service.addUserToBlacklist(123, 30000);
        expect(service.getBlacklistedUserCount()).toBe(1);

        jest.advanceTimersByTime(45000);
        service.isUserBlacklisted(123); // This should trigger cleanup

        expect(service.getBlacklistedUserCount()).toBe(0);
      });
    });

    describe('removeUserFromBlacklist', () => {
      test('should remove user from blacklist', () => {
        // Arrange
        service.addUserToBlacklist(123);
        expect(service.isUserBlacklisted(123)).toBe(true);

        // Act
        service.removeUserFromBlacklist(123);

        // Assert
        expect(service.isUserBlacklisted(123)).toBe(false);
      });

      test('should handle removing non-blacklisted user gracefully', () => {
        // Act - should not throw
        expect(() => service.removeUserFromBlacklist(999)).not.toThrow();
      });

      test('should remove user from blacklist immediately', () => {
        service.addUserToBlacklist(123);
        expect(service.isUserBlacklisted(123)).toBe(true);

        service.removeUserFromBlacklist(123);

        expect(service.isUserBlacklisted(123)).toBe(false);
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '✅ REMOVED USER FROM BLACKLIST: 123',
        );
      });

      test('should handle removing non-blacklisted user gracefully', () => {
        expect(() => service.removeUserFromBlacklist(999)).not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '✅ REMOVED USER FROM BLACKLIST: 999',
        );
      });
    });

    describe('removeUsersFromRunning', () => {
      test('should remove multiple users at once', () => {
        // Arrange
        service.trackUsersAsRunning([1, 2, 3]);

        // Act
        service.removeUsersFromRunning([1, 2]);

        // Assert
        expect(service.isUserRunning(1)).toBe(false);
        expect(service.isUserRunning(2)).toBe(false);
        expect(service.isUserRunning(3)).toBe(true);
      });
    });

    describe('getBlacklistedUserIds', () => {
      test('should return all blacklisted user IDs', () => {
        // Arrange
        service.addUserToBlacklist(1);
        service.addUserToBlacklist(2);

        // Act
        const blacklisted = service.getBlacklistedUserIds();

        // Assert
        expect(blacklisted).toContain(1);
        expect(blacklisted).toContain(2);
      });

      test('should return empty set initially', () => {
        const blacklistedUsers = service.getBlacklistedUserIds();
        expect(blacklistedUsers).toBeInstanceOf(Set);
        expect(blacklistedUsers.size).toBe(0);
      });

      test('should return blacklisted user IDs', () => {
        service.addUserToBlacklist(123);
        service.addUserToBlacklist(456);

        const blacklistedUsers = service.getBlacklistedUserIds();
        expect(blacklistedUsers.has(123)).toBe(true);
        expect(blacklistedUsers.has(456)).toBe(true);
        expect(blacklistedUsers.size).toBe(2);
      });

      test('should clean up expired users before returning', () => {
        service.addUserToBlacklist(123, 30000);
        service.addUserToBlacklist(456, 60000);

        jest.advanceTimersByTime(45000); // Only first user should expire

        const blacklistedUsers = service.getBlacklistedUserIds();
        expect(blacklistedUsers.has(123)).toBe(false);
        expect(blacklistedUsers.has(456)).toBe(true);
        expect(blacklistedUsers.size).toBe(1);
      });
    });

    describe('getBlacklistedUserCount', () => {
      test('should return count of blacklisted users', () => {
        // Arrange
        service.addUserToBlacklist(1);
        service.addUserToBlacklist(2);

        // Act & Assert
        expect(service.getBlacklistedUserCount()).toBe(2);
      });

      test('should return correct count', () => {
        expect(service.getBlacklistedUserCount()).toBe(0);

        service.addUserToBlacklist(123);
        service.addUserToBlacklist(456);
        expect(service.getBlacklistedUserCount()).toBe(2);

        service.removeUserFromBlacklist(123);
        expect(service.getBlacklistedUserCount()).toBe(1);
      });
    });

    describe('clearAllBlacklistedUsers', () => {
      test('should clear all blacklisted users', () => {
        service.addUserToBlacklist(123);
        service.addUserToBlacklist(456);
        expect(service.getBlacklistedUserCount()).toBe(2);

        service.clearAllBlacklistedUsers();

        expect(service.getBlacklistedUserCount()).toBe(0);
        expect(service.isUserBlacklisted(123)).toBe(false);
        expect(service.isUserBlacklisted(456)).toBe(false);
      });

      test('should log clear operation', () => {
        service.clearAllBlacklistedUsers();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '🧹 Cleared all blacklisted users',
        );
      });
    });

    describe('getRemainingBlacklistTime', () => {
      test('should return remaining time for blacklisted user', () => {
        // Arrange
        service.addUserToBlacklist(123, 60000); // 1 minute

        // Act
        const remaining = service.getRemainingBlacklistTime(123);

        // Assert
        expect(remaining).toBeGreaterThan(0);
        expect(remaining).toBeLessThanOrEqual(60000);
      });

      test('should return 0 for non-blacklisted user', () => {
        // Act & Assert
        expect(service.getRemainingBlacklistTime(999)).toBe(0);
      });

      test('should return correct remaining time', () => {
        service.addUserToBlacklist(123, 60000); // 1 minute

        expect(service.getRemainingBlacklistTime(123)).toBe(60000);

        jest.advanceTimersByTime(30000); // Advance 30 seconds
        expect(service.getRemainingBlacklistTime(123)).toBe(30000);

        jest.advanceTimersByTime(35000); // Total 65 seconds - should be 0
        expect(service.getRemainingBlacklistTime(123)).toBe(0);
      });
    });

    describe('getRemainingBlacklistTimeFormatted', () => {
      test('should return formatted time for blacklisted user', () => {
        // Arrange
        service.addUserToBlacklist(123, 60000); // 1 minute

        // Act
        const formatted = service.getRemainingBlacklistTimeFormatted(123);

        // Assert
        expect(formatted).toContain('minute');
      });

      test('should return "Not blacklisted" for non-blacklisted user', () => {
        // Act & Assert
        expect(service.getRemainingBlacklistTimeFormatted(999)).toBe(
          'Not blacklisted',
        );
      });

      test('should return formatted time for blacklisted user', () => {
        service.addUserToBlacklist(123, 60000); // 1 minute
        expect(service.getRemainingBlacklistTimeFormatted(123)).toBe(
          '1 minute',
        );

        service.addUserToBlacklist(456, 120000); // 2 minutes
        expect(service.getRemainingBlacklistTimeFormatted(456)).toBe(
          '2 minutes',
        );

        jest.advanceTimersByTime(30000); // Advance 30 seconds
        expect(service.getRemainingBlacklistTimeFormatted(123)).toBe(
          '1 minute',
        ); // Still rounds up

        jest.advanceTimersByTime(35000); // Total 65 seconds - expired
        expect(service.getRemainingBlacklistTimeFormatted(123)).toBe(
          'Not blacklisted',
        );
      });

      test('should handle singular vs plural minutes', () => {
        service.addUserToBlacklist(123, 30000); // 30 seconds
        expect(service.getRemainingBlacklistTimeFormatted(123)).toBe(
          '1 minute',
        ); // Rounds up

        service.addUserToBlacklist(456, 90000); // 90 seconds
        expect(service.getRemainingBlacklistTimeFormatted(456)).toBe(
          '2 minutes',
        ); // Rounds up
      });
    });
  });

  describe('clearExpiredUsers', () => {
    test('should clear expired blacklisted users', () => {
      service.addUserToBlacklist(123, 30000); // 30 seconds
      service.addUserToBlacklist(456, 60000); // 60 seconds

      expect(service.getBlacklistedUserCount()).toBe(2);

      jest.advanceTimersByTime(45000); // 45 seconds - first user should expire
      service.clearExpiredUsers();

      expect(service.getBlacklistedUserCount()).toBe(1);
      expect(service.isUserBlacklisted(123)).toBe(false);
      expect(service.isUserBlacklisted(456)).toBe(true);
    });

    test('should be called automatically by timer', () => {
      const clearSpy = jest.spyOn(service, 'clearExpiredUsers');

      // Timer should trigger every 5 seconds
      jest.advanceTimersByTime(5000);
      expect(clearSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000);
      expect(clearSpy).toHaveBeenCalledTimes(2);

      clearSpy.mockRestore();
    });
  });

  describe('logCurrentState', () => {
    test('should log current running and blacklisted users', () => {
      service.trackUsersAsRunning([123, 456]);
      service.addUserToBlacklist(789);

      service.logCurrentState();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '👥 Running users: 2 [123, 456]',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🚫 Blacklisted users: 1 [789]',
      );
    });

    test('should log empty state', () => {
      service.logCurrentState();

      expect(consoleLogSpy).toHaveBeenCalledWith('👥 Running users: 0 []');
      expect(consoleLogSpy).toHaveBeenCalledWith('🚫 Blacklisted users: 0 []');
    });
  });

  describe('cleanup', () => {
    test('should clear all state', () => {
      // Arrange
      service.trackUserAsRunning(1);
      service.addUserToBlacklist(2);

      // Act
      service.cleanup();

      // Assert
      expect(service.isUserRunning(1)).toBe(false);
      expect(service.isUserBlacklisted(2)).toBe(false);
    });

    test('should clear all state and stop timers', () => {
      service.trackUsersAsRunning([123, 456]);
      service.addUserToBlacklist(789);

      expect(service.getRunningUserCount()).toBe(2);
      expect(service.getBlacklistedUserCount()).toBe(1);

      service.cleanup();

      expect(service.getRunningUserCount()).toBe(0);
      expect(service.getBlacklistedUserCount()).toBe(0);
    });
  });

  describe('state isolation', () => {
    test('should keep running and blacklisted states separate', () => {
      service.trackUserAsRunning(123);
      service.addUserToBlacklist(123);

      expect(service.isUserRunning(123)).toBe(true);
      expect(service.isUserBlacklisted(123)).toBe(true);

      service.removeUserFromRunning(123);

      expect(service.isUserRunning(123)).toBe(false);
      expect(service.isUserBlacklisted(123)).toBe(true);
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedUserTrackingService).toBeInstanceOf(
        SharedUserTrackingService,
      );
    });

    test('should maintain state across accesses', () => {
      sharedUserTrackingService.trackUserAsRunning(999);
      expect(sharedUserTrackingService.isUserRunning(999)).toBe(true);

      // Clean up for other tests
      sharedUserTrackingService.cleanup();
    });
  });
});
