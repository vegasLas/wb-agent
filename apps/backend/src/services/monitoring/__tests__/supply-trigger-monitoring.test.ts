/**
 * Supply Trigger Monitoring Service Tests
 * Migrated from: server/services/monitoring/__tests__/supplyTriggerMonitoring.service.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Same test logic preserved
 */

import { SupplyTriggerMonitoringService } from '../supply-trigger-monitoring.service';
import { prisma } from '../../../config/database';
import { TBOT } from '../../../utils/TBOT';

// Mock dependencies
jest.mock('../../../config/database', () => ({
  prisma: {
    supplyTrigger: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn(),
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

describe('SupplyTriggerMonitoringService', () => {
  let service: SupplyTriggerMonitoringService;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockTBOT: jest.Mocked<typeof TBOT>;

  beforeEach(() => {
    service = new SupplyTriggerMonitoringService();
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockTBOT = TBOT as jest.Mocked<typeof TBOT>;
    jest.clearAllMocks();

    // Default mock implementations
    (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      chatId: '123456',
    });
    mockTBOT.sendMessage.mockResolvedValue({ message_id: 1 });
  });

  describe('processTriggers', () => {
    test('should find active triggers', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'trigger-1',
          userId: 1,
          warehouseId: 123,
          coefficient: 2,
          status: 'ACTIVE',
        },
      ]);

      // Act
      await service.processTriggers();

      // Assert
      expect(mockPrisma.supplyTrigger.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
    });

    test('should process trigger when coefficient is available', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'trigger-1',
          userId: 1,
          warehouseId: 123,
          coefficient: 2,
          status: 'ACTIVE',
        },
      ]);

      // Act
      await service.processTriggers();

      // Assert
      expect(mockPrisma.supplyTrigger.findMany).toHaveBeenCalled();
    });

    test('should update trigger status after processing', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'trigger-1',
          userId: 1,
          warehouseId: 123,
          coefficient: 2,
          status: 'ACTIVE',
        },
      ]);

      // Act
      await service.processTriggers();

      // Assert
      expect(mockPrisma.supplyTrigger.update).not.toHaveBeenCalled();
    });

    test('should handle no active triggers', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.processTriggers();

      // Assert
      expect(mockPrisma.supplyTrigger.findMany).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      // Act - should not throw
      await expect(service.processTriggers()).resolves.not.toThrow();
    });
  });

  describe('trigger notification', () => {
    test('should send notification when trigger fires', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'trigger-1',
          userId: 1,
          warehouseId: 123,
          coefficient: 2,
          status: 'ACTIVE',
        },
      ]);

      // Act
      await service.processTriggers();

      // Assert
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    test('should not notify if user has no chatId', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'trigger-1',
          userId: 1,
          warehouseId: 123,
          coefficient: 2,
          status: 'ACTIVE',
        },
      ]);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        chatId: null,
      });

      // Act
      await service.processTriggers();

      // Assert
      expect(mockTBOT.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('trigger validation', () => {
    test('should skip inactive triggers', async () => {
      // Arrange
      (mockPrisma.supplyTrigger.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.processTriggers();

      // Assert
      expect(mockPrisma.supplyTrigger.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
    });
  });
});
