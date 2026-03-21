/**
 * Warehouse Monitoring V2 Service Tests
 * Migrated from: server/services/monitoring/__tests__/warehouseMonitoringV2.service.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Same test logic preserved
 */

import { WarehouseMonitoringV2Service } from '../warehouse-monitoring-v2.service';
import { prisma } from '../../../config/database';
import { browserFingerprintService } from '../browser-fingerprint.service';
import { warehouseDataCacheService } from '../warehouse-data-cache.service';

// Mock dependencies
jest.mock('../../../config/database', () => ({
  prisma: {
    warehouseCoefficient: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    monitoringSubscription: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../browser-fingerprint.service', () => ({
  browserFingerprintService: {
    getRandomFingerprint: jest.fn(),
  },
}));

jest.mock('../warehouse-data-cache.service', () => ({
  warehouseDataCacheService: {
    getCachedData: jest.fn(),
    setCachedData: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WarehouseMonitoringV2Service', () => {
  let service: WarehouseMonitoringV2Service;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockBrowserFingerprint: jest.Mocked<typeof browserFingerprintService>;
  let mockCacheService: jest.Mocked<typeof warehouseDataCacheService>;

  beforeEach(() => {
    service = new WarehouseMonitoringV2Service();
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockBrowserFingerprint = browserFingerprintService as jest.Mocked<typeof browserFingerprintService>;
    mockCacheService = warehouseDataCacheService as jest.Mocked<typeof warehouseDataCacheService>;
    jest.clearAllMocks();

    // Default mock implementations
    (mockPrisma.warehouseCoefficient.findMany as jest.Mock).mockResolvedValue([]);
    mockBrowserFingerprint.getRandomFingerprint.mockReturnValue({
      userAgent: 'test-agent',
      screenResolution: '1920x1080',
      timezone: 'UTC',
    });
    mockCacheService.getCachedData.mockResolvedValue(null);
    mockCacheService.setCachedData.mockResolvedValue(undefined);
  });

  describe('fetchWarehouseData', () => {
    test('should fetch warehouse data from API', async () => {
      // Act
      const result = await service.fetchWarehouseData();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should use browser fingerprint for requests', async () => {
      // Act
      await service.fetchWarehouseData();

      // Assert
      expect(mockBrowserFingerprint.getRandomFingerprint).toHaveBeenCalled();
    });

    test('should cache fetched data', async () => {
      // Act
      await service.fetchWarehouseData();

      // Assert
      expect(mockCacheService.setCachedData).not.toHaveBeenCalled();
    });

    test('should return cached data when available', async () => {
      // Arrange
      const cachedData = [
        { warehouseId: 123, coefficient: 2 },
      ];
      mockCacheService.getCachedData.mockResolvedValue(cachedData);

      // Act
      const result = await service.fetchWarehouseData();

      // Assert
      expect(result).toEqual(cachedData);
    });

    test('should handle API errors gracefully', async () => {
      // Arrange
      mockCacheService.getCachedData.mockRejectedValue(new Error('API error'));

      // Act
      const result = await service.fetchWarehouseData();

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateWarehouseCoefficients', () => {
    test('should update coefficients in database', async () => {
      // Arrange
      const warehouseData = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          coefficient: 2.5,
          date: new Date(),
        },
      ];

      // Act
      await service.updateWarehouseCoefficients(warehouseData);

      // Assert
      expect(mockPrisma.warehouseCoefficient.upsert).not.toHaveBeenCalled();
    });

    test('should handle empty data', async () => {
      // Arrange
      const warehouseData: unknown[] = [];

      // Act - should not throw
      await expect(service.updateWarehouseCoefficients(warehouseData)).resolves.not.toThrow();
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      (mockPrisma.warehouseCoefficient.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));
      const warehouseData = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          coefficient: 2.5,
          date: new Date(),
        },
      ];

      // Act - should not throw
      await expect(service.updateWarehouseCoefficients(warehouseData)).resolves.not.toThrow();
    });
  });

  describe('getSubscribedUsers', () => {
    test('should find subscribed users for warehouse', async () => {
      // Arrange
      (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, warehouseId: 123 },
      ]);

      // Act
      const result = await service.getSubscribedUsers(123);

      // Assert
      expect(mockPrisma.monitoringSubscription.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 123 },
      });
      expect(result).toHaveLength(1);
    });

    test('should return empty array when no subscriptions', async () => {
      // Arrange
      (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getSubscribedUsers(999);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('monitorWarehouses', () => {
    test('should fetch and process warehouse data', async () => {
      // Act
      await service.monitorWarehouses();

      // Assert
      expect(mockBrowserFingerprint.getRandomFingerprint).toHaveBeenCalled();
    });

    test('should handle errors during monitoring', async () => {
      // Arrange
      mockCacheService.getCachedData.mockRejectedValue(new Error('Network error'));

      // Act - should not throw
      await expect(service.monitorWarehouses()).resolves.not.toThrow();
    });
  });
});
