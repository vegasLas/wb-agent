/**
 * Autobooking Date Manager Service Tests
 * Migrated from: server/services/monitoring/autobookingDateManager.service.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Updated method name from notifyUserAboutCompletedAutobooking to notifyUserAboutArchivedAutobooking
 * - Same test logic preserved
 */

import { autobookingDateManagerService } from '../autobooking-date-manager.service';
import { prisma } from '../../../config/database';
import { TBOT } from '../../../utils/TBOT';
import type { Autobooking, User } from '@prisma/client';

// Mock dependencies
jest.mock('../../../config/database', () => ({
  prisma: {
    autobooking: {
      update: jest.fn(),
      findMany: jest.fn(),
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

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AutobookingDateManagerService', () => {
  // Mock date for testing
  let originalDate: typeof Date;
  let mockDate: Date;

  beforeEach(() => {
    // Store original Date constructor
    originalDate = global.Date;
    // Mock current date to be 2023-01-15 00:00:00 UTC
    mockDate = new Date(2023, 0, 15, 0, 0, 0);
    global.Date = class extends Date {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          return mockDate;
        }
        return new originalDate(...args);
      }
    } as typeof Date;

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original Date constructor
    global.Date = originalDate;
  });

  describe('updateAutobookingStatus', () => {
    it('should update autobooking status to ARCHIVED', async () => {
      // Arrange
      const mockAutobooking = { id: '1' } as Autobooking;

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (autobookingDateManagerService as any).updateAutobookingStatus(
        mockAutobooking,
      );

      // Assert
      expect(prisma.autobooking.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'ARCHIVED' },
      });
    });

    it('should handle errors when updating status', async () => {
      // Arrange
      const mockAutobooking = { id: '1' } as Autobooking;
      (prisma.autobooking.update as jest.Mock).mockRejectedValueOnce(
        new Error('DB error'),
      );

      // Act - should not throw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (autobookingDateManagerService as any).updateAutobookingStatus(
        mockAutobooking,
      );

      // Assert - error was logged (we can't check logger.error directly due to mock)
      expect(prisma.autobooking.update).toHaveBeenCalled();
    });
  });

  describe('notifyUserAboutArchivedAutobooking', () => {
    it('should send notification to user with chatId', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        userId: 'user1',
        supplyType: 'BOX',
        warehouseId: 'WH123',
        transitWarehouseName: 'Transit WH',
        dateType: 'WEEK',
        createdAt: new Date(2023, 0, 10),
      } as unknown as Autobooking;

      const mockUser = {
        id: 'user1',
        chatId: '123456',
      } as User;

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (autobookingDateManagerService as any).notifyUserAboutArchivedAutobooking(
        mockAutobooking,
      );

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
      });

      expect(TBOT.sendMessage).toHaveBeenCalledWith(
        '123456',
        expect.stringContaining('Неактуальное автобронирование архивировано'),
        expect.objectContaining({
          reply_markup: expect.any(Object),
          disable_notification: true,
        }),
      );
    });

    it('should not send notification if user has no chatId', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        userId: 'user1',
      } as unknown as Autobooking;

      const mockUser = {
        id: 'user1',
        chatId: null,
      } as User;

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (autobookingDateManagerService as any).notifyUserAboutArchivedAutobooking(
        mockAutobooking,
      );

      // Assert
      expect(TBOT.sendMessage).not.toHaveBeenCalled();
    });

    it('should not send notification if user not found', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        userId: 'user1',
      } as unknown as Autobooking;

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (autobookingDateManagerService as any).notifyUserAboutArchivedAutobooking(
        mockAutobooking,
      );

      // Assert
      expect(TBOT.sendMessage).not.toHaveBeenCalled();
    });

    it('should not attempt to find user if userId is not provided', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        userId: null,
      } as unknown as Autobooking;

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (autobookingDateManagerService as any).notifyUserAboutArchivedAutobooking(
        mockAutobooking,
      );

      // Assert
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(TBOT.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle errors when sending notification', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        userId: 'user1',
        supplyType: 'BOX',
        warehouseId: 'WH123',
        dateType: 'WEEK',
        createdAt: new Date(2023, 0, 10),
      } as unknown as Autobooking;

      const mockUser = {
        id: 'user1',
        chatId: '123456',
      } as User;

      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (TBOT.sendMessage as jest.Mock).mockRejectedValueOnce(
        new Error('TBOT error'),
      );

      // Act - should not throw
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (autobookingDateManagerService as any).notifyUserAboutArchivedAutobooking(
        mockAutobooking,
      );

      // Assert - error was logged
      expect(TBOT.sendMessage).toHaveBeenCalled();
    });
  });

  describe('getSupplyTypeText', () => {
    it('should return correct text for known supply types', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((autobookingDateManagerService as any).getSupplyTypeText('BOX')).toBe(
        'Короб',
      );
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (autobookingDateManagerService as any).getSupplyTypeText('MONOPALLETE'),
      ).toBe('Монопаллета');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (autobookingDateManagerService as any).getSupplyTypeText('SUPERSAFE'),
      ).toBe('Суперсейф');
    });

    it('should return the original value for unknown supply types', () => {
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (autobookingDateManagerService as any).getSupplyTypeText('UNKNOWN_TYPE'),
      ).toBe('UNKNOWN_TYPE');
    });
  });

  describe('getDateTypeText', () => {
    it('should return correct text for known date types', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((autobookingDateManagerService as any).getDateTypeText('WEEK')).toBe(
        'Неделя',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((autobookingDateManagerService as any).getDateTypeText('MONTH')).toBe(
        'Месяц',
      );
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (autobookingDateManagerService as any).getDateTypeText('CUSTOM_DATES'),
      ).toBe('Выбранные даты');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (autobookingDateManagerService as any).getDateTypeText('CUSTOM_PERIOD'),
      ).toBe('Произвольный период');
    });

    it('should return the original value for unknown date types', () => {
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (autobookingDateManagerService as any).getDateTypeText('UNKNOWN_TYPE'),
      ).toBe('UNKNOWN_TYPE');
    });
  });

  describe('cleanAutobooking', () => {
    it('should mark WEEK type autobooking as completed when end date is passed', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'WEEK',
        startDate: new Date(2023, 0, 1), // Jan 1, 2023
        endDate: new Date(2023, 0, 7), // Jan 7, 2023
      } as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).toHaveBeenCalledWith(mockAutobooking);
      expect(notifySpy).toHaveBeenCalledWith(mockAutobooking);

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should calculate end date for WEEK type when not provided', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'WEEK',
        startDate: new Date(2023, 0, 7), // Jan 7, 2023 (should end Jan 14)
        endDate: null,
      } as unknown as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).toHaveBeenCalledWith(mockAutobooking);
      expect(notifySpy).toHaveBeenCalledWith(mockAutobooking);

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should not mark WEEK type autobooking as completed when end date is in future', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'WEEK',
        startDate: new Date(2023, 0, 10), // Jan 10, 2023
        endDate: new Date(2023, 0, 20), // Jan 20, 2023 (future)
      } as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).not.toHaveBeenCalled();
      expect(notifySpy).not.toHaveBeenCalled();

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should mark MONTH type autobooking as completed when end date is passed', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'MONTH',
        startDate: new Date(2022, 11, 1), // Dec 1, 2022
        endDate: new Date(2022, 11, 31), // Dec 31, 2022
      } as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).toHaveBeenCalledWith(mockAutobooking);
      expect(notifySpy).toHaveBeenCalledWith(mockAutobooking);

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should calculate end date for MONTH type when not provided', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'MONTH',
        startDate: new Date(2022, 11, 14), // Dec 14, 2022 (should end Jan 14, 2023)
        endDate: null,
      } as unknown as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).toHaveBeenCalledWith(mockAutobooking);
      expect(notifySpy).toHaveBeenCalledWith(mockAutobooking);

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should mark CUSTOM_DATES type autobooking as completed when all dates are in the past', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'CUSTOM_DATES',
        customDates: [
          new Date(2023, 0, 1).toISOString(), // Jan 1, 2023
          new Date(2023, 0, 5).toISOString(), // Jan 5, 2023
          new Date(2023, 0, 10).toISOString(), // Jan 10, 2023
        ],
      } as unknown as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).toHaveBeenCalledWith(mockAutobooking);
      expect(notifySpy).toHaveBeenCalledWith(mockAutobooking);

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should not mark CUSTOM_DATES type autobooking as completed when some dates are in the future', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'CUSTOM_DATES',
        customDates: [
          new Date(2023, 0, 1).toISOString(), // Jan 1, 2023
          new Date(2023, 0, 20).toISOString(), // Jan 20, 2023 (future)
          new Date(2023, 0, 25).toISOString(), // Jan 25, 2023 (future)
        ],
      } as unknown as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).not.toHaveBeenCalled();
      expect(notifySpy).not.toHaveBeenCalled();

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should mark CUSTOM_PERIOD type autobooking as completed when end date is passed', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'CUSTOM_PERIOD',
        startDate: new Date(2023, 0, 1), // Jan 1, 2023
        endDate: new Date(2023, 0, 10), // Jan 10, 2023
      } as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).toHaveBeenCalledWith(mockAutobooking);
      expect(notifySpy).toHaveBeenCalledWith(mockAutobooking);

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should not mark CUSTOM_PERIOD type autobooking as completed when end date is in future', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'CUSTOM_PERIOD',
        startDate: new Date(2023, 0, 1), // Jan 1, 2023
        endDate: new Date(2023, 0, 20), // Jan 20, 2023 (future)
      } as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).not.toHaveBeenCalled();
      expect(notifySpy).not.toHaveBeenCalled();

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });

    it('should not process CUSTOM_PERIOD type autobooking when dates are missing', async () => {
      // Arrange
      const mockAutobooking = {
        id: '1',
        dateType: 'CUSTOM_PERIOD',
        startDate: new Date(2023, 0, 1), // Jan 1, 2023
        endDate: null,
      } as unknown as Autobooking;

      const updateSpy = jest.spyOn(
        autobookingDateManagerService as unknown as { updateAutobookingStatus: (a: Autobooking) => Promise<void> },
        'updateAutobookingStatus',
      );
      const notifySpy = jest.spyOn(
        autobookingDateManagerService as unknown as { notifyUserAboutArchivedAutobooking: (a: Autobooking) => Promise<void> },
        'notifyUserAboutArchivedAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAutobooking(mockAutobooking);

      // Assert
      expect(updateSpy).not.toHaveBeenCalled();
      expect(notifySpy).not.toHaveBeenCalled();

      updateSpy.mockRestore();
      notifySpy.mockRestore();
    });
  });

  describe('cleanAllAutobookings', () => {
    it('should clean all active autobookings', async () => {
      // Arrange
      const mockAutobookings = [
        {
          id: '1',
          dateType: 'WEEK',
          startDate: new Date(2023, 0, 1),
          endDate: new Date(2023, 0, 7),
        },
        {
          id: '2',
          dateType: 'MONTH',
          startDate: new Date(2022, 11, 1),
          endDate: new Date(2022, 11, 31),
        },
      ] as Autobooking[];

      (prisma.autobooking.findMany as jest.Mock).mockResolvedValueOnce(
        mockAutobookings,
      );

      const cleanSpy = jest.spyOn(
        autobookingDateManagerService,
        'cleanAutobooking',
      );

      // Act
      await autobookingDateManagerService.cleanAllAutobookings();

      // Assert
      expect(prisma.autobooking.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(cleanSpy).toHaveBeenCalledTimes(2);
      expect(cleanSpy).toHaveBeenCalledWith(mockAutobookings[0]);
      expect(cleanSpy).toHaveBeenCalledWith(mockAutobookings[1]);

      cleanSpy.mockRestore();
    });

    it('should handle errors when cleaning all autobookings', async () => {
      // Arrange
      (prisma.autobooking.findMany as jest.Mock).mockRejectedValueOnce(
        new Error('DB error'),
      );

      // Act - should not throw
      await autobookingDateManagerService.cleanAllAutobookings();

      // Assert - error was logged (we can't check logger.error directly due to mock)
      expect(prisma.autobooking.findMany).toHaveBeenCalled();
    });
  });
});
