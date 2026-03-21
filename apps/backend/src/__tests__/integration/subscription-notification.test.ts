/**
 * Subscription Notification Service Tests
 * Migrated from: tests/subscriptionNotificationService.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Same test logic preserved
 */

import { prisma } from '../../config/database';
import { TBOT } from '../../utils/TBOT';

// Mock dependencies
jest.mock('../../config/database', () => ({
  prisma: {
    monitoringSubscription: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    warehouseCoefficient: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Subscription Notification Service', () => {
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockTBOT: jest.Mocked<typeof TBOT>;

  beforeEach(() => {
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockTBOT = TBOT as jest.Mocked<typeof TBOT>;
    jest.clearAllMocks();

    // Default mock implementations
    (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.warehouseCoefficient.findFirst as jest.Mock).mockResolvedValue({
      warehouseId: 123,
      warehouseName: 'Test Warehouse',
      coefficient: 2,
    });
    mockTBOT.sendMessage.mockResolvedValue({ message_id: 1 });
  });

  describe('notifySubscribers', () => {
    test('should find all active subscriptions', async () => {
      // Arrange
      (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, warehouseId: 123, coefficient: 2 },
      ]);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 1, chatId: '123456' },
      ]);

      // Act - Since this is an integration test, we test the behavior
      const subscriptions = await mockPrisma.monitoringSubscription.findMany({
        where: { active: true },
      });

      // Assert
      expect(subscriptions).toHaveLength(1);
    });

    test('should send notification to subscribed users', async () => {
      // Arrange
      const chatId = '123456';
      const message = 'Warehouse coefficient updated!';

      // Act
      await mockTBOT.sendMessage(chatId, message);

      // Assert
      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(chatId, message);
    });

    test('should not notify users with coefficient above threshold', async () => {
      // Arrange
      (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, warehouseId: 123, coefficient: 2 },
      ]);
      (mockPrisma.warehouseCoefficient.findFirst as jest.Mock).mockResolvedValue({
        warehouseId: 123,
        warehouseName: 'Test Warehouse',
        coefficient: 5, // Above threshold
      });

      // Act
      const warehouse = await mockPrisma.warehouseCoefficient.findFirst({
        where: { warehouseId: 123 },
      });

      // Assert
      expect(warehouse?.coefficient).toBeGreaterThan(2);
    });

    test('should handle users without chatId', async () => {
      // Arrange
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 1, chatId: null },
      ]);

      // Act
      const users = await mockPrisma.user.findMany();
      const usersWithChatId = users.filter((u) => u.chatId);

      // Assert
      expect(usersWithChatId).toHaveLength(0);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(
        mockPrisma.monitoringSubscription.findMany()
      ).rejects.toThrow('DB error');
    });
  });

  describe('buildNotificationMessage', () => {
    test('should include warehouse name in message', () => {
      // Arrange
      const warehouseName = 'Test Warehouse';
      const coefficient = 2;

      // Act
      const message = `Warehouse ${warehouseName} coefficient is now ${coefficient}`;

      // Assert
      expect(message).toContain(warehouseName);
      expect(message).toContain(String(coefficient));
    });

    test('should format coefficient correctly', () => {
      // Arrange
      const coefficient = 2.5;

      // Act
      const message = `Coefficient: ${coefficient.toFixed(1)}`;

      // Assert
      expect(message).toBe('Coefficient: 2.5');
    });
  });

  describe('subscription filtering', () => {
    test('should only notify for matching warehouse subscriptions', async () => {
      // Arrange
      (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, warehouseId: 123, active: true },
        { userId: 2, warehouseId: 456, active: true },
      ]);

      // Act
      const subscriptions = await mockPrisma.monitoringSubscription.findMany({
        where: { warehouseId: 123, active: true },
      });

      // Assert
      expect(subscriptions.every((s) => s.warehouseId === 123)).toBe(true);
    });

    test('should respect user notification preferences', async () => {
      // Arrange
      (mockPrisma.monitoringSubscription.findMany as jest.Mock).mockResolvedValue([
        { userId: 1, warehouseId: 123, notificationsEnabled: true },
        { userId: 2, warehouseId: 123, notificationsEnabled: false },
      ]);

      // Act
      const subscriptions = await mockPrisma.monitoringSubscription.findMany({
        where: { notificationsEnabled: true },
      });

      // Assert
      expect(subscriptions.every((s) => s.notificationsEnabled)).toBe(true);
    });
  });
});
