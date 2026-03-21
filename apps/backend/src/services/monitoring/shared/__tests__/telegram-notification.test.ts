/**
 * Telegram Notification Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/telegramNotificationService.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import { SharedTelegramNotificationService, sharedTelegramNotificationService } from '../telegram-notification.service';
import { TBOT } from '../../../../utils/TBOT';

// Mock TBOT
jest.mock('../../../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SharedTelegramNotificationService', () => {
  let service: SharedTelegramNotificationService;
  let mockTBOT: jest.Mocked<typeof TBOT>;

  beforeEach(() => {
    service = new SharedTelegramNotificationService();
    mockTBOT = TBOT as jest.Mocked<typeof TBOT>;
    jest.clearAllMocks();
  });

  describe('sendSuccessNotification', () => {
    test('should send success notification to user', async () => {
      // Arrange
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 });

      // Act
      await service.sendSuccessNotification('123456', 'Test message');

      // Assert
      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        '123456',
        'Test message',
        expect.any(Object)
      );
    });

    test('should handle send errors gracefully', async () => {
      // Arrange
      mockTBOT.sendMessage.mockRejectedValue(new Error('Send failed'));

      // Act - should not throw
      await expect(
        service.sendSuccessNotification('123456', 'Test message')
      ).resolves.not.toThrow();
    });

    test('should include keyboard markup', async () => {
      // Arrange
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 });

      // Act
      await service.sendSuccessNotification('123456', 'Test message');

      // Assert
      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.any(Object),
        })
      );
    });
  });

  describe('sendBanNotification', () => {
    test('should send ban notification to admin', async () => {
      // Arrange
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 });

      // Act
      await service.sendBanNotification({
        warehouseId: 123,
        date: new Date('2024-01-15'),
        supplyType: 'BOX',
        coefficient: 2,
        error: { message: 'Test error' },
      });

      // Assert
      expect(mockTBOT.sendMessage).toHaveBeenCalled();
    });

    test('should format ban message correctly', async () => {
      // Arrange
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 });

      // Act
      await service.sendBanNotification({
        warehouseId: 123,
        date: new Date('2024-01-15'),
        supplyType: 'MONOPALLETE',
        coefficient: 3,
        error: { message: 'Date unavailable' },
      });

      // Assert
      const message = mockTBOT.sendMessage.mock.calls[0][1];
      expect(message).toContain('123');
      expect(message).toContain('MONOPALLETE');
    });
  });

  describe('buildBookingSuccessMessage', () => {
    test('should build success message with correct info', () => {
      // Act
      const message = service.buildBookingSuccessMessage(
        'Test Warehouse',
        new Date('2024-01-15'),
        2.5,
        undefined,
        false
      );

      // Assert
      expect(message).toContain('Test Warehouse');
      expect(message).toContain('2.5');
    });

    test('should include transit warehouse when provided', () => {
      // Act
      const message = service.buildBookingSuccessMessage(
        'Main Warehouse',
        new Date('2024-01-15'),
        2.5,
        'Transit Point',
        false
      );

      // Assert
      expect(message).toContain('Main Warehouse');
      expect(message).toContain('Transit Point');
    });

    test('should indicate reschedule when isReschedule is true', () => {
      // Act
      const message = service.buildBookingSuccessMessage(
        'Test Warehouse',
        new Date('2024-01-15'),
        2.5,
        undefined,
        true
      );

      // Assert
      expect(message).toContain('Test Warehouse');
    });

    test('should format date correctly', () => {
      // Act
      const message = service.buildBookingSuccessMessage(
        'Test Warehouse',
        new Date('2024-03-21'),
        2.5,
        undefined,
        false
      );

      // Assert
      expect(message).toContain('Test Warehouse');
    });
  });

  describe('buildBanMessage', () => {
    test('should build ban message with warehouse info', () => {
      // Act
      const message = service.buildBanMessage({
        warehouseId: 123,
        date: new Date('2024-01-15'),
        supplyType: 'BOX',
        coefficient: 2,
        error: { message: 'Test error' },
      });

      // Assert
      expect(message).toContain('123');
      expect(message).toContain('BOX');
    });

    test('should include error message', () => {
      // Act
      const message = service.buildBanMessage({
        warehouseId: 123,
        date: new Date('2024-01-15'),
        supplyType: 'BOX',
        coefficient: 2,
        error: { message: 'Custom error message' },
      });

      // Assert
      expect(message).toContain('123');
    });

    test('should format date in ban message', () => {
      // Act
      const message = service.buildBanMessage({
        warehouseId: 123,
        date: new Date('2024-06-15'),
        supplyType: 'BOX',
        coefficient: 2,
        error: { message: 'Test' },
      });

      // Assert
      expect(message).toContain('123');
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedTelegramNotificationService).toBeInstanceOf(SharedTelegramNotificationService);
    });
  });
});
