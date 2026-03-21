/**
 * User Tracking Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/userTrackingService.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import { SharedUserTrackingService, sharedUserTrackingService } from '../user-tracking.service';

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

  beforeEach(() => {
    service = new SharedUserTrackingService();
  });

  afterEach(() => {
    service.cleanup();
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
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Act & Assert
        expect(service.isUserBlacklisted(123)).toBe(false);
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
    });

    describe('getBlacklistedUserCount', () => {
      test('should return count of blacklisted users', () => {
        // Arrange
        service.addUserToBlacklist(1);
        service.addUserToBlacklist(2);

        // Act & Assert
        expect(service.getBlacklistedUserCount()).toBe(2);
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
        expect(service.getRemainingBlacklistTimeFormatted(999)).toBe('Not blacklisted');
      });
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
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedUserTrackingService).toBeInstanceOf(SharedUserTrackingService);
    });
  });
});
