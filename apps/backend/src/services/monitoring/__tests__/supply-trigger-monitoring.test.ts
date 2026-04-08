/**
 * Supply Trigger Monitoring Service Tests
 * Migrated from: server/services/monitoring/__tests__/supplyTriggerMonitoring.service.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Updated test method from processTriggers to processAvailabilities (new architecture)
 * - Preserved all test scenarios from deprecated tests
 */

import { SupplyTriggerMonitoringService } from '@/services/monitoring/supply-trigger-monitoring.service';
import { triggerService } from '@/services/internal/trigger.service';
import { TBOT } from '@/utils/TBOT';
import { SUPPLY_TYPES } from '@/constants/triggers';
import type {
  WarehouseAvailability,
  MonitoringUser,
} from '@/services/monitoring/interfaces/trigger-monitoring.interfaces';
import type { SupplyTrigger } from '@prisma/client';

// Mock dependencies
jest.mock('../../trigger.service', () => ({
  triggerService: {
    updateTriggerStatus: jest.fn().mockResolvedValue(undefined),
    updateLastNotificationTime: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../utils/TBOT', () => ({
  TBOT: {
    sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
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

jest.mock('../../../config/database', () => ({
  prisma: {
    user: {
      update: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('SupplyTriggerMonitoringService', () => {
  let service: SupplyTriggerMonitoringService;
  let mockSendMessage: jest.Mock;
  let mockUpdateTriggerStatus: jest.Mock;
  let mockUpdateLastNotificationTime: jest.Mock;

  beforeEach(() => {
    service = new SupplyTriggerMonitoringService();
    mockSendMessage = TBOT.sendMessage as jest.Mock;
    mockUpdateTriggerStatus = triggerService.updateTriggerStatus as jest.Mock;
    mockUpdateLastNotificationTime =
      triggerService.updateLastNotificationTime as jest.Mock;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createMockTrigger = (
    overrides: Partial<SupplyTrigger> = {},
  ): SupplyTrigger => ({
    id: 'trigger-1',
    userId: 1,
    warehouseIds: [123],
    supplyTypes: [SUPPLY_TYPES.BOX],
    isActive: true,
    checkInterval: 180,
    maxCoefficient: 0,
    lastNotificationAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    searchMode: 'TODAY',
    startDate: null,
    endDate: null,
    selectedDates: [],
    status: 'RELEVANT',
    ...overrides,
  });

  const createMockUser = (
    overrides: Partial<MonitoringUser> = {},
  ): MonitoringUser => ({
    userId: 1,
    userAgent: 'test-agent',
    proxy: { ip: '127.0.0.1', port: '8080', username: '', password: '' },
    chatId: 'chat123',
    supplyTriggers: [createMockTrigger()],
    ...overrides,
  });

  const createMockAvailability = (
    overrides: Partial<WarehouseAvailability> = {},
  ): WarehouseAvailability => ({
    warehouseId: 123,
    warehouseName: 'Test Warehouse',
    boxTypeID: 2,
    availableDates: [
      { date: '2024-01-01', coefficient: 0 },
      { date: '2024-01-02', coefficient: 1.5 },
    ],
    ...overrides,
  });

  describe('processAvailabilities', () => {
    it('should skip users without chatId', async () => {
      const user = createMockUser({ chatId: undefined });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should skip users without supply triggers', async () => {
      const user = createMockUser({ supplyTriggers: [] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should process valid user with matching availability', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const user = createMockUser();
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalledWith(
        'chat123',
        expect.any(String),
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.any(Object),
        }),
      );
    });
  });

  describe('trigger status filtering', () => {
    it('should skip triggers with non-RELEVANT status', async () => {
      const trigger = createMockTrigger({ status: 'EXPIRED' });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should process triggers with RELEVANT status', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ status: 'RELEVANT' });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('warehouse filtering', () => {
    it('should filter by warehouse ID', async () => {
      const trigger = createMockTrigger({ warehouseIds: [456] });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability({ warehouseId: 123 })];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should match correct warehouse ID', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ warehouseIds: [123] });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability({ warehouseId: 123 })];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('supply type filtering', () => {
    it('should match BOX supply type', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ supplyTypes: [SUPPLY_TYPES.BOX] });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability({ boxTypeID: 2 })];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should match MONOPALLETE supply type', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({
        supplyTypes: [SUPPLY_TYPES.MONOPALLETE],
      });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability({ boxTypeID: 5 })];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should reject mismatched supply types', async () => {
      const trigger = createMockTrigger({ supplyTypes: [SUPPLY_TYPES.BOX] });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability({ boxTypeID: 5 })];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('coefficient filtering', () => {
    it('should accept only free slots when maxCoefficient is 0', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ maxCoefficient: 0 });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [
            { date: '2024-01-01', coefficient: 0 },
            { date: '2024-01-02', coefficient: 1.5 },
          ],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      // Should send notification with only free slots
      expect(mockSendMessage).toHaveBeenCalled();
      const message = mockSendMessage.mock.calls[0][1];
      expect(message).toContain('Бесплатно');
    });

    it('should accept slots within max coefficient', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ maxCoefficient: 2.0 });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [{ date: '2024-01-01', coefficient: 1.5 }],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should reject slots above max coefficient', async () => {
      const trigger = createMockTrigger({ maxCoefficient: 1.0 });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [{ date: '2024-01-01', coefficient: 2.5 }],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('search mode filtering', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should filter TODAY dates correctly', async () => {
      const trigger = createMockTrigger({ searchMode: 'TODAY' });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [
            { date: '2024-01-01', coefficient: 0 },
            { date: '2024-01-02', coefficient: 0 },
          ],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
      const message = mockSendMessage.mock.calls[0][1];
      expect(message).toContain('01 янв');
    });

    it('should filter TOMORROW dates correctly', async () => {
      const trigger = createMockTrigger({ searchMode: 'TOMORROW' });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [{ date: '2024-01-02', coefficient: 0 }],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should filter CUSTOM_DATES correctly', async () => {
      const trigger = createMockTrigger({
        searchMode: 'CUSTOM_DATES',
        selectedDates: [new Date('2024-01-15')],
      });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [
            { date: '2024-01-15', coefficient: 0 },
            { date: '2024-01-16', coefficient: 0 },
          ],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
      const message = mockSendMessage.mock.calls[0][1];
      expect(message).toContain('15 янв');
    });

    it('should filter RANGE dates correctly', async () => {
      const trigger = createMockTrigger({
        searchMode: 'RANGE',
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-01-20'),
      });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [{ date: '2024-01-15', coefficient: 0 }],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should filter WEEK dates correctly', async () => {
      const trigger = createMockTrigger({ searchMode: 'WEEK' });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [
            { date: '2024-01-01', coefficient: 0 },
            { date: '2024-01-06', coefficient: 0 },
          ],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('trigger status updates', () => {
    it('should mark UNTIL_FOUND triggers as COMPLETED', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ searchMode: 'UNTIL_FOUND' });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockUpdateTriggerStatus).toHaveBeenCalledWith(
        'trigger-1',
        'COMPLETED',
      );
    });

    it('should update lastNotificationAt for other triggers', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ searchMode: 'TODAY' });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockUpdateLastNotificationTime).toHaveBeenCalledWith('trigger-1');
    });
  });

  describe('rate limiting', () => {
    it('should not notify if checkInterval has not passed', async () => {
      const recentTime = new Date();
      recentTime.setMinutes(recentTime.getMinutes() - 30); // 30 minutes ago (less than 180 min interval)

      const trigger = createMockTrigger({
        checkInterval: 180, // 3 hours
        lastNotificationAt: recentTime,
      });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should notify when notification interval has passed', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const oldTime = new Date('2024-01-01T08:00:00Z'); // 4 hours ago (more than 180 min interval)

      const trigger = createMockTrigger({
        checkInterval: 180, // 3 hours
        lastNotificationAt: oldTime,
      });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('notification messages', () => {
    it('should include warehouse name and box type', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger();
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          warehouseName: 'Электросталь',
          boxTypeID: 2,
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalledWith(
        'chat123',
        expect.stringContaining('Электросталь'),
        expect.any(Object),
      );
      const message = mockSendMessage.mock.calls[0][1];
      expect(message).toContain('Короб');
    });

    it('should format free slots correctly', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ maxCoefficient: 0 });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [{ date: '2024-01-01', coefficient: 0 }],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      const message = mockSendMessage.mock.calls[0][1];
      expect(message).toContain('Бесплатно');
    });

    it('should format paid slots correctly', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const trigger = createMockTrigger({ maxCoefficient: 2.0 });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [
        createMockAvailability({
          availableDates: [{ date: '2024-01-01', coefficient: 1.5 }],
        }),
      ];

      await service.processAvailabilities([user], availabilities);

      const message = mockSendMessage.mock.calls[0][1];
      expect(message).toContain('1.5');
    });
  });

  describe('edge cases', () => {
    it('should handle empty availabilities', async () => {
      const user = createMockUser();

      await service.processAvailabilities([user], []);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should handle empty selectedDates for CUSTOM_DATES', async () => {
      const trigger = createMockTrigger({
        searchMode: 'CUSTOM_DATES',
        selectedDates: [],
      });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should handle missing dates for RANGE', async () => {
      const trigger = createMockTrigger({
        searchMode: 'RANGE',
        startDate: null,
        endDate: null,
      });
      const user = createMockUser({ supplyTriggers: [trigger] });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should handle multiple triggers per user', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      const triggers = [
        createMockTrigger({ id: 'trigger-1', searchMode: 'TODAY' }),
        createMockTrigger({ id: 'trigger-2', searchMode: 'TODAY' }),
      ];
      const user = createMockUser({ supplyTriggers: triggers });
      const availabilities = [createMockAvailability()];

      await service.processAvailabilities([user], availabilities);

      expect(mockSendMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle TBOT not being initialized', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

      // Temporarily set TBOT to null
      const originalTBOT = (TBOT as any).sendMessage;
      (TBOT as any).sendMessage = null;

      const user = createMockUser();
      const availabilities = [createMockAvailability()];

      // Should not throw
      await expect(
        service.processAvailabilities([user], availabilities),
      ).resolves.not.toThrow();

      // Restore
      (TBOT as any).sendMessage = originalTBOT;
    });
  });
});
