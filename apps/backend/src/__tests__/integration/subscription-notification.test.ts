/**
 * Subscription Notification Service Tests
 * Migrated from: tests/subscriptionNotificationService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Same test logic preserved
 */

import { SubscriptionNotificationService } from '../../services/subscription-notification.service';
import { prisma } from '../../config/database';
import * as schedule from 'node-schedule';
import { TBOT } from '../../utils/TBOT';

// Mock dependencies
jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn(),
  },
}));

jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SubscriptionNotificationService', () => {
  let service: SubscriptionNotificationService;
  const mockPrismaVar = prisma as jest.Mocked<typeof prisma>;
  const mockSchedule = schedule as jest.Mocked<typeof schedule>;
  const mockTBOT = TBOT as jest.Mocked<typeof TBOT>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance to ensure clean state
    (SubscriptionNotificationService as any)['instance'] = undefined;
    service = SubscriptionNotificationService.getInstance();
    // Reset notifications sent set
    (service as any)['notificationsSent'].clear();
    // Mock environment
    process.env.URL = 'https://test.com';
    // Ensure mock is properly reset
    mockTBOT.sendMessage.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    test('should return singleton instance', () => {
      const instance1 = SubscriptionNotificationService.getInstance();
      const instance2 = SubscriptionNotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('init', () => {
    test('should schedule daily job at 09:00', () => {
      service.init();

      expect(mockSchedule.scheduleJob).toHaveBeenCalledWith(
        '0 9 * * *',
        expect.any(Function),
      );
    });

    test('should handle errors in scheduled job', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        /* intentionally empty */
      });

      service.init();

      // Get the scheduled function
      const scheduledFn = (mockSchedule.scheduleJob as jest.Mock).mock
        .calls[0][1] as () => Promise<void>;

      // Mock checkSubscriptionExpirations to throw error
      jest
        .spyOn(service, 'checkSubscriptionExpirations')
        .mockRejectedValue(new Error('Test error'));

      await scheduledFn();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in subscription expiration check:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('checkSubscriptionExpirations', () => {
    test('should find users with expiring subscriptions', async () => {
      const mockUsers = [
        {
          id: 1,
          chatId: '12345',
          subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
        {
          id: 2,
          chatId: '67890',
          subscriptionExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        },
      ];

      (mockPrismaVar.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      const sendNotificationSpy = jest
        .spyOn(service as any, 'sendExpirationNotification')
        .mockResolvedValue(undefined);

      await service.checkSubscriptionExpirations();

      expect(mockPrismaVar.user.findMany).toHaveBeenCalledWith({
        where: {
          subscriptionExpiresAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          chatId: { not: null },
        },
        select: {
          id: true,
          chatId: true,
          subscriptionExpiresAt: true,
        },
      });
    });

    test('should send notifications for 7, 3, and 1 day expiration', async () => {
      const now = new Date();
      const mockUsers = [
        {
          id: 1,
          chatId: '12345',
          subscriptionExpiresAt: new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000,
          ), // 7 days
        },
        {
          id: 2,
          chatId: '67890',
          subscriptionExpiresAt: new Date(
            now.getTime() + 3 * 24 * 60 * 60 * 1000,
          ), // 3 days
        },
        {
          id: 3,
          chatId: '11111',
          subscriptionExpiresAt: new Date(
            now.getTime() + 1 * 24 * 60 * 60 * 1000,
          ), // 1 day
        },
        {
          id: 4,
          chatId: '22222',
          subscriptionExpiresAt: new Date(
            now.getTime() + 5 * 24 * 60 * 60 * 1000,
          ), // 5 days (should not send)
        },
      ];

      (mockPrismaVar.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      const sendNotificationSpy = jest
        .spyOn(service as any, 'sendExpirationNotification')
        .mockResolvedValue(undefined);

      await service.checkSubscriptionExpirations();

      // Should send notifications for 7, 3, and 1 day expiration only
      expect(sendNotificationSpy).toHaveBeenCalledTimes(3);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userId: 1,
        chatId: '12345',
        daysLeft: 7,
        subscriptionExpiresAt: mockUsers[0].subscriptionExpiresAt,
      });
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userId: 2,
        chatId: '67890',
        daysLeft: 3,
        subscriptionExpiresAt: mockUsers[1].subscriptionExpiresAt,
      });
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userId: 3,
        chatId: '11111',
        daysLeft: 1,
        subscriptionExpiresAt: mockUsers[2].subscriptionExpiresAt,
      });
    });

    test('should not send duplicate notifications', async () => {
      const mockUsers = [
        {
          id: 1,
          chatId: '12345',
          subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      (mockPrismaVar.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      const sendNotificationSpy = jest
        .spyOn(service as any, 'sendExpirationNotification')
        .mockResolvedValue(undefined);

      // First call
      await service.checkSubscriptionExpirations();
      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);

      // Second call should not send duplicate
      await service.checkSubscriptionExpirations();
      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
    });

    test('should prevent spam by only sending notifications on specific days (7, 3, 1) and not on intermediate days', async () => {
      const now = new Date();
      const sendNotificationSpy = jest
        .spyOn(service as any, 'sendExpirationNotification')
        .mockResolvedValue(undefined);

      // Test all days from 7 down to 1
      const daysToTest = [7, 6, 5, 4, 3, 2, 1];

      for (const daysLeft of daysToTest) {
        // Reset spy for each test
        sendNotificationSpy.mockClear();
        // Reset notifications sent
        (service as any)['notificationsSent'].clear();

        const mockUsers = [
          {
            id: 1,
            chatId: '12345',
            subscriptionExpiresAt: new Date(
              now.getTime() + daysLeft * 24 * 60 * 60 * 1000,
            ),
          },
        ];

        (mockPrismaVar.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

        await service.checkSubscriptionExpirations();

        if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
          // Should send notification for 7, 3, and 1 days
          expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
          expect(sendNotificationSpy).toHaveBeenCalledWith({
            userId: 1,
            chatId: '12345',
            daysLeft,
            subscriptionExpiresAt: mockUsers[0].subscriptionExpiresAt,
          });
        } else {
          // Should NOT send notification for 6, 5, 4, and 2 days (spam prevention)
          expect(sendNotificationSpy).not.toHaveBeenCalled();
        }
      }
    });

    test('should handle multiple users with different expiration days correctly', async () => {
      const now = new Date();
      const sendNotificationSpy = jest
        .spyOn(service as any, 'sendExpirationNotification')
        .mockResolvedValue(undefined);

      // Create users with expiration dates for each day from 7 to 1
      const mockUsers = [
        {
          id: 1,
          chatId: '11111',
          subscriptionExpiresAt: new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000,
          ),
        }, // 7 days - should notify
        {
          id: 2,
          chatId: '22222',
          subscriptionExpiresAt: new Date(
            now.getTime() + 6 * 24 * 60 * 60 * 1000,
          ),
        }, // 6 days - should NOT notify
        {
          id: 3,
          chatId: '33333',
          subscriptionExpiresAt: new Date(
            now.getTime() + 5 * 24 * 60 * 60 * 1000,
          ),
        }, // 5 days - should NOT notify
        {
          id: 4,
          chatId: '44444',
          subscriptionExpiresAt: new Date(
            now.getTime() + 4 * 24 * 60 * 60 * 1000,
          ),
        }, // 4 days - should NOT notify
        {
          id: 5,
          chatId: '55555',
          subscriptionExpiresAt: new Date(
            now.getTime() + 3 * 24 * 60 * 60 * 1000,
          ),
        }, // 3 days - should notify
        {
          id: 6,
          chatId: '66666',
          subscriptionExpiresAt: new Date(
            now.getTime() + 2 * 24 * 60 * 60 * 1000,
          ),
        }, // 2 days - should NOT notify
        {
          id: 7,
          chatId: '77777',
          subscriptionExpiresAt: new Date(
            now.getTime() + 1 * 24 * 60 * 60 * 1000,
          ),
        }, // 1 day - should notify
      ];

      (mockPrismaVar.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await service.checkSubscriptionExpirations();

      // Should only send notifications for users with 7, 3, and 1 days left
      expect(sendNotificationSpy).toHaveBeenCalledTimes(3);

      // Verify the specific calls
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userId: 1,
        chatId: '11111',
        daysLeft: 7,
        subscriptionExpiresAt: mockUsers[0].subscriptionExpiresAt,
      });

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userId: 5,
        chatId: '55555',
        daysLeft: 3,
        subscriptionExpiresAt: mockUsers[4].subscriptionExpiresAt,
      });

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        userId: 7,
        chatId: '77777',
        daysLeft: 1,
        subscriptionExpiresAt: mockUsers[6].subscriptionExpiresAt,
      });

      // Verify users with 6, 5, 4, 2 days were NOT called
      expect(sendNotificationSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2, daysLeft: 6 }),
      );
      expect(sendNotificationSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: 3, daysLeft: 5 }),
      );
      expect(sendNotificationSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: 4, daysLeft: 4 }),
      );
      expect(sendNotificationSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: 6, daysLeft: 2 }),
      );
    });

    test('should skip users without chatId or subscriptionExpiresAt', async () => {
      const mockUsers = [
        {
          id: 1,
          chatId: null,
          subscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 2,
          chatId: '12345',
          subscriptionExpiresAt: null,
        },
      ];

      (mockPrismaVar.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      const sendNotificationSpy = jest
        .spyOn(service as any, 'sendExpirationNotification')
        .mockResolvedValue(undefined);

      await service.checkSubscriptionExpirations();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    test('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        /* intentionally empty */
      });

      (mockPrismaVar.user.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await service.checkSubscriptionExpirations();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking subscription expirations:',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('sendExpirationNotification', () => {
    test('should send 7-day expiration notification', async () => {
      // Reset mock explicitly
      mockTBOT.sendMessage.mockClear();

      const notification = {
        userId: 1,
        chatId: '12345',
        daysLeft: 7,
        subscriptionExpiresAt: new Date('2024-01-15'),
      };

      await (service as any)['sendExpirationNotification'](notification);

      expect(mockTBOT.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('📅 <b>Подписка истекает через 7 дней</b>'),
        expect.objectContaining({
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📝 Подписка и оплата',
                  web_app: { url: `${process.env.URL}?view=store` },
                },
              ],
              [{ text: '❌ Закрыть', callback_data: 'close_menu' }],
            ],
          },
        }),
      );
    });

    test('should send 3-day expiration notification', async () => {
      // Reset mock explicitly
      mockTBOT.sendMessage.mockClear();

      const notification = {
        userId: 1,
        chatId: '12345',
        daysLeft: 3,
        subscriptionExpiresAt: new Date('2024-01-15'),
      };

      await (service as any)['sendExpirationNotification'](notification);

      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('⚠️ <b>Подписка истекает через 3 дня</b>'),
        expect.any(Object),
      );
    });

    test('should send 1-day expiration notification', async () => {
      // Reset mock explicitly
      mockTBOT.sendMessage.mockClear();

      const notification = {
        userId: 1,
        chatId: '12345',
        daysLeft: 1,
        subscriptionExpiresAt: new Date('2024-01-15'),
      };

      await (service as any)['sendExpirationNotification'](notification);

      expect(mockTBOT.sendMessage).toHaveBeenCalledWith(
        '12345',
        expect.stringContaining('🚨 <b>Подписка истекает завтра!</b>'),
        expect.any(Object),
      );
    });

    test('should not send notification for non-matching days', async () => {
      const notification = {
        userId: 1,
        chatId: '12345',
        daysLeft: 5,
        subscriptionExpiresAt: new Date('2024-01-15'),
      };

      await (service as any)['sendExpirationNotification'](notification);

      expect(mockTBOT.sendMessage).not.toHaveBeenCalled();
    });

    test('should handle bot blocked by user error', async () => {
      // Reset mock explicitly
      mockTBOT.sendMessage.mockClear();

      const notification = {
        userId: 1,
        chatId: '12345',
        daysLeft: 7,
        subscriptionExpiresAt: new Date('2024-01-15'),
      };

      const error = {
        response: {
          body: {
            error_code: 403,
            description: 'Forbidden: bot was blocked by the user',
          },
        },
      };

      mockTBOT.sendMessage.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        /* intentionally empty */
      });

      await (service as any)['sendExpirationNotification'](notification);

      expect(consoleSpy).toHaveBeenCalledWith(
        'User 1 has blocked the bot - cannot send expiration notification',
      );
      consoleSpy.mockRestore();
    });

    test('should handle chat not found error', async () => {
      // Reset mock explicitly
      mockTBOT.sendMessage.mockClear();

      const notification = {
        userId: 1,
        chatId: '12345',
        daysLeft: 7,
        subscriptionExpiresAt: new Date('2024-01-15'),
      };

      const error = {
        response: {
          body: {
            error_code: 400,
            description: 'Bad Request: chat not found',
          },
        },
      };

      mockTBOT.sendMessage.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        /* intentionally empty */
      });

      await (service as any)['sendExpirationNotification'](notification);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Chat not found for user 1 - user may have deleted the chat',
      );
      consoleSpy.mockRestore();
    });

    test('should handle other errors', async () => {
      // Reset mock explicitly
      mockTBOT.sendMessage.mockClear();

      const notification = {
        userId: 1,
        chatId: '12345',
        daysLeft: 7,
        subscriptionExpiresAt: new Date('2024-01-15'),
      };

      const error = new Error('Network error');
      mockTBOT.sendMessage.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        /* intentionally empty */
      });

      await (service as any)['sendExpirationNotification'](notification);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send expiration notification to user 1:',
        error,
      );
      consoleSpy.mockRestore();
    });
  });

  describe('triggerManualCheck', () => {
    test('should call checkSubscriptionExpirations', async () => {
      const checkSpy = jest
        .spyOn(service, 'checkSubscriptionExpirations')
        .mockResolvedValue(undefined);

      await service.triggerManualCheck();

      expect(checkSpy).toHaveBeenCalledTimes(1);
    });
  });
});
