/**
 * Browser Fingerprint Service Tests
 * Migrated from: tests/unit/browserFingerprintService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Same test logic preserved
 */

import {
  BrowserFingerprintService,
  browserFingerprintService,
} from '@/services/monitoring/browser-fingerprint.service';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('BrowserFingerprintService', () => {
  let service: BrowserFingerprintService;

  beforeEach(() => {
    service = new BrowserFingerprintService();
  });

  describe('getRandomFingerprint', () => {
    test('should return fingerprint with userAgent', () => {
      // Act
      const fingerprint = service.getRandomFingerprint();

      // Assert
      expect(fingerprint).toHaveProperty('userAgent');
      expect(typeof fingerprint.userAgent).toBe('string');
    });

    test('should return fingerprint with screenResolution', () => {
      // Act
      const fingerprint = service.getRandomFingerprint();

      // Assert
      expect(fingerprint).toHaveProperty('screenResolution');
      expect(typeof fingerprint.screenResolution).toBe('string');
    });

    test('should return fingerprint with timezone', () => {
      // Act
      const fingerprint = service.getRandomFingerprint();

      // Assert
      expect(fingerprint).toHaveProperty('timezone');
      expect(typeof fingerprint.timezone).toBe('string');
    });

    test('should return different fingerprints on multiple calls', () => {
      // Act
      const fingerprint1 = service.getRandomFingerprint();
      const fingerprint2 = service.getRandomFingerprint();

      // Assert - at least one property should differ
      const allSame =
        fingerprint1.userAgent === fingerprint2.userAgent &&
        fingerprint1.screenResolution === fingerprint2.screenResolution &&
        fingerprint1.timezone === fingerprint2.timezone;
      expect(allSame).toBe(false);
    });

    test('should return valid screen resolution format', () => {
      // Act
      const fingerprint = service.getRandomFingerprint();

      // Assert
      expect(fingerprint.screenResolution).toMatch(/^\d+x\d+$/);
    });
  });

  describe('getRandomUserAgent', () => {
    test('should return a string', () => {
      // Act
      const userAgent = (
        service as unknown as { getRandomUserAgent: () => string }
      ).getRandomUserAgent();

      // Assert
      expect(typeof userAgent).toBe('string');
    });

    test('should return Chrome user agent', () => {
      // Act
      const userAgent = (
        service as unknown as { getRandomUserAgent: () => string }
      ).getRandomUserAgent();

      // Assert
      expect(userAgent).toContain('Chrome');
    });

    test('should return valid user agent format', () => {
      // Act
      const userAgent = (
        service as unknown as { getRandomUserAgent: () => string }
      ).getRandomUserAgent();

      // Assert
      expect(userAgent).toContain('Mozilla/5.0');
    });
  });

  describe('getRandomScreenResolution', () => {
    test('should return a string', () => {
      // Act
      const resolution = (
        service as unknown as { getRandomScreenResolution: () => string }
      ).getRandomScreenResolution();

      // Assert
      expect(typeof resolution).toBe('string');
    });

    test('should return valid resolution format', () => {
      // Act
      const resolution = (
        service as unknown as { getRandomScreenResolution: () => string }
      ).getRandomScreenResolution();

      // Assert
      expect(resolution).toMatch(/^\d+x\d+$/);
    });

    test('should return common resolution', () => {
      // Act
      const resolution = (
        service as unknown as { getRandomScreenResolution: () => string }
      ).getRandomScreenResolution();

      // Assert - check format
      const parts = resolution.split('x');
      expect(parts.length).toBe(2);
      expect(parseInt(parts[0])).toBeGreaterThan(0);
      expect(parseInt(parts[1])).toBeGreaterThan(0);
    });
  });

  describe('getRandomTimezone', () => {
    test('should return a string', () => {
      // Act
      const timezone = (
        service as unknown as { getRandomTimezone: () => string }
      ).getRandomTimezone();

      // Assert
      expect(typeof timezone).toBe('string');
    });

    test('should return valid timezone', () => {
      // Act
      const timezone = (
        service as unknown as { getRandomTimezone: () => string }
      ).getRandomTimezone();

      // Assert
      expect(timezone).toBeTruthy();
      expect(typeof timezone).toBe('string');
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(browserFingerprintService).toBeInstanceOf(
        BrowserFingerprintService,
      );
    });
  });
});
