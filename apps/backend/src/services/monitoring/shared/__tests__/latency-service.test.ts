/**
 * Latency Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/latencyService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import { SharedLatencyService, sharedLatencyService } from '@/services/monitoring/shared/latency.service';

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SharedLatencyService', () => {
  let service: SharedLatencyService;

  beforeEach(() => {
    service = new SharedLatencyService();
  });

  describe('generateLatency', () => {
    test('should generate latency within default bounds', () => {
      // Act
      const latency = service.generateLatency();

      // Assert
      expect(latency).toBeGreaterThanOrEqual(8100); // 8.1 seconds
      expect(latency).toBeLessThanOrEqual(14500); // 14.5 seconds
    });

    test('should generate different values on multiple calls', () => {
      // Act
      const latency1 = service.generateLatency();
      const latency2 = service.generateLatency();

      // Assert - very unlikely to be exactly the same
      expect(latency1).not.toBe(latency2);
    });

    test('should return value with 16 decimal precision', () => {
      // Act
      const latency = service.generateLatency();

      // Assert
      const decimalPlaces = (latency.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(16);
    });
  });

  describe('getMinLatency', () => {
    test('should return minimum latency value', () => {
      // Act
      const minLatency = service.getMinLatency();

      // Assert
      expect(minLatency).toBe(8100); // 8.1 seconds in milliseconds
    });
  });

  describe('getMaxLatency', () => {
    test('should return maximum latency value', () => {
      // Act
      const maxLatency = service.getMaxLatency();

      // Assert
      expect(maxLatency).toBe(14500); // 14.5 seconds in milliseconds
    });
  });

  describe('generateCustomLatency', () => {
    test('should generate latency within custom bounds', () => {
      // Arrange
      const minMs = 1000;
      const maxMs = 2000;

      // Act
      const latency = service.generateCustomLatency(minMs, maxMs);

      // Assert
      expect(latency).toBeGreaterThanOrEqual(minMs);
      expect(latency).toBeLessThanOrEqual(maxMs);
    });

    test('should throw error when min >= max', () => {
      // Arrange
      const minMs = 2000;
      const maxMs = 1000;

      // Act & Assert
      expect(() => service.generateCustomLatency(minMs, maxMs)).toThrow(
        'minMs must be less than maxMs',
      );
    });

    test('should throw error when min equals max', () => {
      // Arrange
      const minMs = 1000;
      const maxMs = 1000;

      // Act & Assert
      expect(() => service.generateCustomLatency(minMs, maxMs)).toThrow(
        'minMs must be less than maxMs',
      );
    });
  });

  describe('sleepWithLatency', () => {
    test('should return a promise', () => {
      // Act
      const result = service.sleepWithLatency();

      // Assert
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve after latency period', async () => {
      // Arrange
      jest.useFakeTimers();

      // Act
      const sleepPromise = service.sleepWithLatency();
      jest.advanceTimersByTime(15000);

      // Assert
      await expect(sleepPromise).resolves.toBeUndefined();

      jest.useRealTimers();
    });
  });

  describe('sleepWithCustomLatency', () => {
    test('should sleep with custom latency bounds', async () => {
      // Arrange
      jest.useFakeTimers();

      // Act
      const sleepPromise = service.sleepWithCustomLatency(100, 200);
      jest.advanceTimersByTime(300);

      // Assert
      await expect(sleepPromise).resolves.toBeUndefined();

      jest.useRealTimers();
    });

    test('should throw error for invalid bounds', async () => {
      // Act & Assert
      await expect(service.sleepWithCustomLatency(200, 100)).rejects.toThrow(
        'minMs must be less than maxMs',
      );
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedLatencyService).toBeInstanceOf(SharedLatencyService);
    });

    test('singleton should generate valid latencies', () => {
      const latency = sharedLatencyService.generateLatency();
      expect(latency).toBeGreaterThanOrEqual(8100);
      expect(latency).toBeLessThanOrEqual(14500);
    });
  });
});
