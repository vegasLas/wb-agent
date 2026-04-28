/**
 * Notification Dispatcher Service Tests
 */

import { NotificationDispatcherService } from '@/services/monitoring/shared/notification-dispatcher.service';
import { sharedTelegramNotificationService } from '@/services/monitoring/shared/telegram-notification.service';
import { inAppNotificationService } from '@/services/notification/in-app-notification.service';
import { TBOT } from '@/utils/TBOT';

jest.mock('../../../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../notification/in-app-notification.service', () => ({
  inAppNotificationService: {
    create: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../telegram-notification.service', () => ({
  sharedTelegramNotificationService: {
    buildBookingSuccessMessage: jest.fn().mockReturnValue('booking success'),
    buildBannedDateMessage: jest.fn().mockReturnValue('banned date'),
    sendSuccessNotification: jest.fn().mockResolvedValue(undefined),
    sendErrorNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;

  beforeEach(() => {
    service = new NotificationDispatcherService();
    jest.clearAllMocks();
  });

  describe('notify', () => {
    it('should create in-app notification and send Telegram when chatId is available', async () => {
      await service.notify({
        userId: 1,
        chatId: '123',
        message: 'test message',
        type: 'SYSTEM',
        title: 'Test',
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'SYSTEM',
          title: 'Test',
          message: 'test message',
        }),
      );
      expect(sharedTelegramNotificationService.sendSuccessNotification).toHaveBeenCalledWith(
        '123',
        'test message',
      );
    });

    it('should create in-app notification even when no chatId', async () => {
      await service.notify({
        userId: 1,
        message: 'test message',
        type: 'SYSTEM',
        title: 'Test',
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'SYSTEM',
          title: 'Test',
          message: 'test message',
        }),
      );
      expect(TBOT.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyBookingSuccess', () => {
    it('should create in-app booking notification and send Telegram', async () => {
      await service.notifyBookingSuccess({
        userId: 1,
        chatId: '123',
        warehouseName: 'Test Warehouse',
        date: new Date('2024-01-01'),
        coefficient: 0,
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'AUTOBOOKING',
          title: 'Поставка забронирована',
          link: '/autobooking',
        }),
      );
      expect(sharedTelegramNotificationService.sendSuccessNotification).toHaveBeenCalled();
    });

    it('should create in-app booking notification without Telegram when no chatId', async () => {
      await service.notifyBookingSuccess({
        userId: 1,
        warehouseName: 'Test Warehouse',
        date: new Date('2024-01-01'),
        coefficient: 0,
      });

      expect(inAppNotificationService.create).toHaveBeenCalled();
      expect(sharedTelegramNotificationService.sendSuccessNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyBannedDate', () => {
    it('should create in-app banned date notification and send Telegram', async () => {
      await service.notifyBannedDate({
        userId: 1,
        chatId: '123',
        warehouseName: 'Test Warehouse',
        date: new Date('2024-01-01'),
        supplyType: 'BOX',
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'AUTOBOOKING',
          title: 'Дата недоступна',
          link: '/autobooking',
        }),
      );
      expect(sharedTelegramNotificationService.sendErrorNotification).toHaveBeenCalled();
    });

    it('should create in-app banned date notification without Telegram when no chatId', async () => {
      await service.notifyBannedDate({
        userId: 1,
        warehouseName: 'Test Warehouse',
        date: new Date('2024-01-01'),
        supplyType: 'BOX',
      });

      expect(inAppNotificationService.create).toHaveBeenCalled();
      expect(sharedTelegramNotificationService.sendErrorNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyBannedDateBulk', () => {
    it('should create in-app notifications for all recipients and send Telegram to those with chatId', async () => {
      await service.notifyBannedDateBulk({
        recipients: [
          { userId: 1, chatId: '123' },
          { userId: 2 },
        ],
        warehouseName: 'Test Warehouse',
        date: new Date('2024-01-01'),
        supplyType: 'BOX',
      });

      expect(inAppNotificationService.create).toHaveBeenCalledTimes(2);
      expect(sharedTelegramNotificationService.sendErrorNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyTriggerSlots', () => {
    it('should create in-app trigger notification and send Telegram', async () => {
      await service.notifyTriggerSlots({
        userId: 1,
        chatId: '123',
        availabilities: [
          {
            warehouseId: 1,
            warehouseName: 'Test',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-01', coefficient: 0 }],
          },
        ],
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          type: 'TRIGGER',
          title: 'Доступные слоты',
          link: '/triggers',
        }),
      );
      expect(TBOT.sendMessage).toHaveBeenCalledWith(
        '123',
        expect.stringContaining('Доступные слоты'),
        expect.objectContaining({ parse_mode: 'Markdown' }),
      );
    });

    it('should create in-app trigger notification without Telegram when no chatId', async () => {
      await service.notifyTriggerSlots({
        userId: 1,
        availabilities: [
          {
            warehouseId: 1,
            warehouseName: 'Test',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-01', coefficient: 0 }],
          },
        ],
      });

      expect(inAppNotificationService.create).toHaveBeenCalled();
      expect(TBOT.sendMessage).not.toHaveBeenCalled();
    });
  });
});
