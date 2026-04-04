/**
 * Telegram Notification Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/telegramNotificationService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 * - Added missing test cases from deprecated
 */

import {
  SharedTelegramNotificationService,
  sharedTelegramNotificationService,
} from '../telegram-notification.service';
import { TBOT } from '../../../../utils/TBOT';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../utils/logger';
import type {
  TelegramError,
  TelegramNotificationOptions,
} from '../interfaces/sharedInterfaces';

// Mock TBOT
jest.mock('../../../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn(),
  },
}));

// Mock prisma
jest.mock('../../../../config/database', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
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
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    service = new SharedTelegramNotificationService();
    mockTBOT = TBOT as jest.Mocked<typeof TBOT>;
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockLogger = logger as jest.Mocked<typeof logger>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sendSuccessNotification', () => {
    test('should send success notification with default options', async () => {
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

      const chatId = 'test-chat-id';
      const message = 'Test success message';

      await service.sendSuccessNotification(chatId, message);

      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
          ],
        },
      });
    });

    test('should send success notification to user', async () => {
      // Arrange
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

      // Act
      await service.sendSuccessNotification('123456', 'Test message');

      // Assert
      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        '123456',
        'Test message',
        expect.any(Object),
      );
    });

    test('should handle send errors gracefully', async () => {
      // Arrange
      mockTBOT.sendMessage.mockRejectedValue(new Error('Send failed'));

      // Act - should not throw
      await expect(
        service.sendSuccessNotification('123456', 'Test message'),
      ).resolves.not.toThrow();
    });

    test('should include keyboard markup', async () => {
      // Arrange
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

      // Act
      await service.sendSuccessNotification('123456', 'Test message');

      // Assert
      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.any(Object),
        }),
      );
    });

    test('should send success notification with custom options', async () => {
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

      const chatId = 'test-chat-id';
      const message = 'Test success message';
      const customOptions: TelegramNotificationOptions = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[{ text: '✅ OK', callback_data: 'ok' }]],
        },
      };

      await service.sendSuccessNotification(chatId, message, customOptions);

      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[{ text: '✅ OK', callback_data: 'ok' }]],
        },
      });
    });

    test('should handle telegram errors gracefully', async () => {
      const telegramError: TelegramError = {
        code: 'ETELEGRAM',
        message: 'Bad Request',
        response: { body: { description: 'Chat not found' } },
      };

      mockTBOT.sendMessage.mockRejectedValue(telegramError);

      const chatId = 'invalid-chat-id';
      const message = 'Test message';

      await service.sendSuccessNotification(chatId, message);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('sendErrorNotification', () => {
    test('should send error notification with default options', async () => {
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

      const chatId = 'test-chat-id';
      const message = 'Test error message';

      await service.sendErrorNotification(chatId, message);

      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
          ],
        },
      });
    });

    test('should send error notification with custom options', async () => {
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

      const chatId = 'test-chat-id';
      const message = 'Test error message';
      const customOptions: TelegramNotificationOptions = {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🔄 Retry', callback_data: 'retry' }]],
        },
      };

      await service.sendErrorNotification(chatId, message, customOptions);

      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🔄 Retry', callback_data: 'retry' }]],
        },
      });
    });

    test('should handle telegram errors gracefully', async () => {
      const telegramError: TelegramError = {
        code: 'ETELEGRAM',
        message: 'Forbidden',
        response: { body: { description: 'bot was blocked by the user' } },
      };

      mockTBOT.sendMessage.mockRejectedValue(telegramError);

      const chatId = 'blocked-chat-id';
      const message = 'Test message';

      await service.sendErrorNotification(chatId, message);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('blocked the bot'),
      );
    });
  });

  describe('sendBulkNotification', () => {
    test('should send notifications to multiple users', async () => {
      const mockSendErrorNotification = jest
        .spyOn(service, 'sendErrorNotification')
        .mockResolvedValue(undefined);

      const chatIds = new Set(['chat-1', 'chat-2', 'chat-3']);
      const message = 'Bulk notification test';
      const options: TelegramNotificationOptions = {
        parse_mode: 'HTML',
      };

      await service.sendBulkNotification(chatIds, message, options);

      expect(mockSendErrorNotification).toHaveBeenCalledTimes(3);
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'chat-1',
        message,
        options,
      );
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'chat-2',
        message,
        options,
      );
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'chat-3',
        message,
        options,
      );
    });

    test('should handle individual notification failures gracefully', async () => {
      const mockSendErrorNotification = jest
        .spyOn(service, 'sendErrorNotification')
        .mockResolvedValueOnce(undefined) // First call succeeds
        .mockRejectedValueOnce(new Error('Network error')) // Second call fails
        .mockResolvedValueOnce(undefined); // Third call succeeds

      const chatIds = new Set(['chat-1', 'chat-2', 'chat-3']);
      const message = 'Bulk notification test';

      await service.sendBulkNotification(chatIds, message);

      expect(mockSendErrorNotification).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send bulk notification to chat-2'),
        expect.any(Error),
      );
    });

    test('should call sendErrorNotification for each chat ID', async () => {
      const mockSendErrorNotification = jest
        .spyOn(service, 'sendErrorNotification')
        .mockResolvedValue(undefined);

      const chatIds = new Set(['chat-1', 'chat-2', 'chat-3']);
      const message = 'Rate limit test';
      const options: TelegramNotificationOptions = { parse_mode: 'HTML' };

      await service.sendBulkNotification(chatIds, message, options);

      expect(mockSendErrorNotification).toHaveBeenCalledTimes(3);
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'chat-1',
        message,
        options,
      );
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'chat-2',
        message,
        options,
      );
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'chat-3',
        message,
        options,
      );
    });
  });

  describe('sendBanNotification', () => {
    test('should send ban notification to admin', async () => {
      // Arrange
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

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
      mockTBOT.sendMessage.mockResolvedValue({ message_id: 123 } as any);

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

  describe('handleNotificationError', () => {
    test('should log telegram notification errors', async () => {
      const error: TelegramError = {
        code: 'ETELEGRAM',
        message: 'Bad Request: chat not found',
      };
      const chatId = 'test-chat-id';

      await service.handleNotificationError(error, chatId);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error sending Telegram notification to chat test-chat-id:',
        'Bad Request: chat not found',
      );
    });

    test('should update chatId when bot is blocked by user', async () => {
      const error: TelegramError = {
        code: 'ETELEGRAM',
        message: 'Forbidden',
        response: {
          body: {
            description: 'Forbidden: bot was blocked by the user',
          },
        },
      };
      const chatId = 'blocked-chat-id';

      await service.handleNotificationError(error, chatId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User with chatId blocked-chat-id has blocked the bot. Setting chatId to null.',
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { chatId: chatId },
        data: { chatId: null },
      });
    });

    test('should not update chatId for other telegram errors', async () => {
      const error: TelegramError = {
        code: 'ETELEGRAM',
        message: 'Bad Request: message is too long',
      };
      const chatId = 'test-chat-id';

      await service.handleNotificationError(error, chatId);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    test('should detect bot blocked error correctly', async () => {
      const blockedError: TelegramError = {
        code: 'ETELEGRAM',
        response: {
          body: {
            description: 'Forbidden: bot was blocked by the user',
          },
        },
      };

      await service.handleNotificationError(blockedError, 'test-chat');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { chatId: 'test-chat' },
        data: { chatId: null },
      });
    });

    test('should not detect non-blocked errors', async () => {
      const normalError: TelegramError = {
        code: 'ETELEGRAM',
        response: {
          body: {
            description: 'Bad Request: message is too long',
          },
        },
      };

      await service.handleNotificationError(normalError, 'test-chat');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    test('should handle errors without response body', async () => {
      const errorWithoutBody: TelegramError = {
        code: 'ETELEGRAM',
        message: 'Network error',
      };

      await service.handleNotificationError(errorWithoutBody, 'test-chat');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('buildBookingSuccessMessage', () => {
    test('should build success message for regular booking', () => {
      const warehouseName = 'Склад Москва';
      const date = new Date('2024-01-15');
      const coefficient = 2.5;

      const message = service.buildBookingSuccessMessage(
        warehouseName,
        date,
        coefficient,
      );

      expect(message).toContain('✅ <b>Поставка успешно забронирована!</b>');
      expect(message).toContain('📦 Склад: <b>Склад Москва</b>');
      expect(message).toContain('📅 Дата: <b>15.01.2024</b>');
      expect(message).toContain('📊 Коэффициент: <b>2.5</b>');
      expect(message).not.toContain('Транзитный склад');
      expect(message).not.toContain('Новая дата');
    });

    test('should build success message with correct info', () => {
      // Act
      const message = service.buildBookingSuccessMessage(
        'Test Warehouse',
        new Date('2024-01-15'),
        2.5,
        undefined,
        false,
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
        false,
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
        true,
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
        false,
      );

      // Assert
      expect(message).toContain('Test Warehouse');
    });

    test('should build success message for reschedule booking', () => {
      const warehouseName = 'Склад СПб';
      const date = new Date('2024-02-20');
      const coefficient = 1.0;
      const isReschedule = true;

      const message = service.buildBookingSuccessMessage(
        warehouseName,
        date,
        coefficient,
        null,
        isReschedule,
      );

      expect(message).toContain('🎯 <b>Поставка успешно перенесена!</b>');
      expect(message).toContain('📦 Склад: <b>Склад СПб</b>');
      expect(message).toContain('📅 Новая дата: <b>20.02.2024</b>');
      expect(message).toContain('📊 Коэффициент: <b>1</b>');
    });

    test('should build success message with transit warehouse', () => {
      const warehouseName = 'Основной склад';
      const date = new Date('2024-03-10');
      const coefficient = 0;
      const transitWarehouseName = 'Транзитный склад А';

      const message = service.buildBookingSuccessMessage(
        warehouseName,
        date,
        coefficient,
        transitWarehouseName,
      );

      expect(message).toContain('✅ <b>Поставка успешно забронирована!</b>');
      expect(message).toContain('📦 Склад: <b>Основной склад</b>');
      expect(message).toContain(
        '🏢 Транзитный склад: <b>Транзитный склад А</b>',
      );
      expect(message).toContain('📅 Дата: <b>10.03.2024</b>');
      expect(message).toContain('💰 Коэффициент: <b>Бесплатно 🎉</b>');
    });

    test('should handle zero coefficient as free booking', () => {
      const warehouseName = 'Тест склад';
      const date = new Date('2024-04-01');
      const coefficient = 0;

      const message = service.buildBookingSuccessMessage(
        warehouseName,
        date,
        coefficient,
      );

      expect(message).toContain('💰 Коэффициент: <b>Бесплатно 🎉</b>');
      expect(message).not.toContain('📊 Коэффициент');
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

    test('should build banned date message for regular booking', () => {
      const warehouseName = 'Склад Тест';
      const date = new Date('2024-01-15');
      const supplyType = 'BOX';
      const error = new Error('Date not available');

      const message = (service as any).buildBannedDateMessage(
        warehouseName,
        date,
        supplyType,
        error,
      );

      expect(message).toContain('⚠️ <b>Дата недоступна для бронирования</b>');
      expect(message).toContain('📦 Склад: <b>Склад Тест</b>');
      expect(message).toContain('📅 Дата: <b>15.01.2024</b>');
      expect(message).toContain('📋 Тип: <b>Коробка</b>');
      expect(message).toContain('❌ Причина: Date not available');
    });

    test('should build banned date message for reschedule', () => {
      const warehouseName = 'Склад Екатеринбург';
      const date = new Date('2024-02-28');
      const supplyType = 'MONOPALLETE';
      const error = new Error('Slot is full');
      const isReschedule = true;

      const message = (service as any).buildBannedDateMessage(
        warehouseName,
        date,
        supplyType,
        error,
        isReschedule,
      );

      expect(message).toContain('⚠️ <b>Дата недоступна для переноса</b>');
      expect(message).toContain('📦 Склад: <b>Склад Екатеринбург</b>');
      expect(message).toContain('📅 Дата: <b>28.02.2024</b>');
      expect(message).toContain('📋 Тип: <b>Монопаллета</b>');
      expect(message).toContain('❌ Причина: Slot is full');
    });

    test('should handle SUPERSAFE supply type', () => {
      const warehouseName = 'Склад А';
      const date = new Date('2024-12-31');
      const supplyType = 'SUPERSAFE';

      const message = (service as any).buildBannedDateMessage(
        warehouseName,
        date,
        supplyType,
      );

      expect(message).toContain('📋 Тип: <b>Суперсейф</b>');
      expect(message).toContain('❌ Причина: Неизвестная ошибка');
    });

    test('should handle unknown supply type', () => {
      const warehouseName = 'Склад Б';
      const date = new Date('2024-06-15');
      const supplyType = 'UNKNOWN_TYPE';

      const message = (service as any).buildBannedDateMessage(
        warehouseName,
        date,
        supplyType,
      );

      expect(message).toContain('📋 Тип: <b>UNKNOWN_TYPE</b>');
    });

    test('should handle null date', () => {
      const warehouseName = 'Склад В';
      const date = null;
      const supplyType = 'BOX';

      const message = (service as any).buildBannedDateMessage(
        warehouseName,
        date as any,
        supplyType,
      );

      expect(message).toContain('📅 Дата: <b>неизвестная дата</b>');
    });

    test('should handle no error message', () => {
      const warehouseName = 'Склад Г';
      const date = new Date('2024-07-01');
      const supplyType = 'BOX';

      const message = (service as any).buildBannedDateMessage(
        warehouseName,
        date,
        supplyType,
      );

      expect(message).toContain('❌ Причина: Неизвестная ошибка');
    });
  });

  describe('updateUserChatId', () => {
    test('should update user chatId in database', async () => {
      mockPrisma.user.update.mockResolvedValue({} as any);

      const oldChatId = 'old-chat-id';
      const newChatId = 'new-chat-id';

      await (service as any).updateUserChatId(oldChatId, newChatId);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { chatId: oldChatId },
        data: { chatId: newChatId },
      });
    });

    test('should set chatId to null when blocked', async () => {
      mockPrisma.user.update.mockResolvedValue({} as any);

      const oldChatId = 'blocked-chat-id';

      await (service as any).updateUserChatId(oldChatId, null);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { chatId: oldChatId },
        data: { chatId: null },
      });
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.user.update.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const oldChatId = 'test-chat-id';
      const newChatId = 'new-chat-id';

      await (service as any).updateUserChatId(oldChatId, newChatId);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update user chatId:',
        expect.any(Error),
      );
    });
  });

  describe('integration scenarios', () => {
    test('should handle complete success notification workflow', async () => {
      mockTBOT.sendMessage.mockResolvedValue({} as any);

      const warehouseName = 'Интеграционный склад';
      const date = new Date('2024-01-15');
      const coefficient = 1.5;
      const chatId = 'integration-test-chat';

      const message = service.buildBookingSuccessMessage(
        warehouseName,
        date,
        coefficient,
      );
      await service.sendSuccessNotification(chatId, message);

      expect(message).toContain('✅ <b>Поставка успешно забронирована!</b>');
      expect(message).toContain('📦 Склад: <b>Интеграционный склад</b>');
      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        chatId,
        message,
        expect.any(Object),
      );
    });

    test('should handle complete error notification with bot blocking workflow', async () => {
      mockTBOT.sendMessage.mockRejectedValue({
        code: 'ETELEGRAM',
        message: 'Forbidden',
        response: {
          body: {
            description: 'Forbidden: bot was blocked by the user',
          },
        },
      });
      mockPrisma.user.update.mockResolvedValue({} as any);

      const chatId = 'blocked-user-chat';
      const warehouseName = 'Заблокированный склад';
      const date = new Date('2024-02-01');
      const supplyType = 'BOX';
      const error = new Error('Access denied');

      const message = (service as any).buildBannedDateMessage(
        warehouseName,
        date,
        supplyType,
        error,
      );
      await service.sendErrorNotification(chatId, message);

      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        chatId,
        message,
        expect.any(Object),
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { chatId: chatId },
        data: { chatId: null },
      });
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedTelegramNotificationService).toBeInstanceOf(
        SharedTelegramNotificationService,
      );
    });

    test('should maintain consistent behavior across accesses', async () => {
      mockTBOT.sendMessage.mockResolvedValue({} as any);

      const chatId = 'singleton-test';
      const message1 = 'First message';
      const message2 = 'Second message';

      await sharedTelegramNotificationService.sendSuccessNotification(
        chatId,
        message1,
      );
      await sharedTelegramNotificationService.sendErrorNotification(
        chatId,
        message2,
      );

      expect(mockTBOT.sendMessage).toHaveBeenCalledTimes(2);
    });
  });
});
