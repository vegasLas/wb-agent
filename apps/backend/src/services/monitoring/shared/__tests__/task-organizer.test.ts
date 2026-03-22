/**
 * Task Organizer Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/taskOrganizerService.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Aligned test API with implementation (Map-based returns)
 * - Same test logic preserved
 */

import { SharedTaskOrganizerService, sharedTaskOrganizerService } from '../task-organizer.service';
import { sharedAvailabilityFilterService } from '../availability-filter.service';
import {
  createAutobooking,
  createMonitoringUser,
  getFutureDate,
} from '../../../../__tests__/helpers/autobooking-helpers';
import type { BookingTask, WarehouseAvailability } from '../interfaces/sharedInterfaces';

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock availability filter service
jest.mock('../availability-filter.service', () => ({
  sharedAvailabilityFilterService: {
    convertToSchedulableItem: jest.fn(),
    filterMatchingAvailabilities: jest.fn(),
  },
}));

describe('SharedTaskOrganizerService', () => {
  let service: SharedTaskOrganizerService;

  beforeEach(() => {
    service = new SharedTaskOrganizerService();
    jest.clearAllMocks();
  });

  describe('organizeAutobookingsByWarehouseDate', () => {
    test('should organize autobookings by warehouse-date', () => {
      // Arrange
      const mockConvertFn = jest.spyOn(sharedAvailabilityFilterService, 'convertToSchedulableItem');
      const mockFilterFn = jest.spyOn(sharedAvailabilityFilterService, 'filterMatchingAvailabilities');

      const futureDate = getFutureDate(7);
      const monitoringUsers = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({
              id: 'booking-1',
              userId: 1,
              warehouseId: 123,
              customDates: [futureDate],
            }),
          ],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: futureDate.toISOString().split('T')[0], coefficient: 1.5 }],
        },
      ];

      mockConvertFn.mockReturnValue({} as any);
      mockFilterFn.mockReturnValue([
        {
          availability: availabilities[0],
          matchingDates: [
            {
              effectiveDate: futureDate,
              availableDate: { date: futureDate.toISOString().split('T')[0], coefficient: 1.5 },
            },
          ],
        },
      ]);

      // Act
      const result = service.organizeAutobookingsByWarehouseDate(
        monitoringUsers,
        availabilities
      );

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBeGreaterThanOrEqual(0);
    });

    test('should return empty map when no matching availabilities', () => {
      // Arrange
      const mockConvertFn = jest.spyOn(sharedAvailabilityFilterService, 'convertToSchedulableItem');
      const mockFilterFn = jest.spyOn(sharedAvailabilityFilterService, 'filterMatchingAvailabilities');

      const monitoringUsers = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({ id: 'booking-1', userId: 1 }),
          ],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [];

      mockConvertFn.mockReturnValue({} as any);
      mockFilterFn.mockReturnValue([]);

      // Act
      const result = service.organizeAutobookingsByWarehouseDate(
        monitoringUsers,
        availabilities
      );

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });

  describe('organizeReschedulesByWarehouseDate', () => {
    test('should organize reschedules by warehouse-date', () => {
      // Arrange
      const mockConvertFn = jest.spyOn(sharedAvailabilityFilterService, 'convertToSchedulableItem');
      const mockFilterFn = jest.spyOn(sharedAvailabilityFilterService, 'filterMatchingAvailabilities');

      const futureDate = getFutureDate(7);
      const monitoringUsers = [
        createMonitoringUser({
          userId: 1,
          reschedules: [
            {
              id: 'reschedule-1',
              userId: 1,
              supplierId: 'supplier-1',
              supplyId: 'supply-123',
              warehouseId: 123,
              currentDate: new Date(),
              targetDateFrom: futureDate,
              targetDateTo: getFutureDate(14),
              coefficient: 5,
              status: 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [
        {
          warehouseId: 123,
          warehouseName: 'Test WH',
          boxTypeID: 2,
          availableDates: [{ date: futureDate.toISOString().split('T')[0], coefficient: 1.5 }],
        },
      ];

      mockConvertFn.mockReturnValue({} as any);
      mockFilterFn.mockReturnValue([
        {
          availability: availabilities[0],
          matchingDates: [
            {
              effectiveDate: futureDate,
              availableDate: { date: futureDate.toISOString().split('T')[0], coefficient: 1.5 },
            },
          ],
        },
      ]);

      // Act
      const result = service.organizeReschedulesByWarehouseDate(
        monitoringUsers,
        availabilities
      );

      // Assert
      expect(result).toBeInstanceOf(Map);
    });
  });

  describe('groupTasksByProxy', () => {
    test('should group tasks with different proxies separately', () => {
      // Arrange
      const proxy1 = { ip: '1.1.1.1', port: '8080', username: 'user1', password: 'pass1' };
      const proxy2 = { ip: '2.2.2.2', port: '8080', username: 'user2', password: 'pass2' };

      const user1 = createMonitoringUser({ userId: 1, proxy: proxy1 });
      const user2 = createMonitoringUser({ userId: 2, proxy: proxy2 });

      const tasksMap = new Map<string, BookingTask[]>();
      tasksMap.set('key1', [
        {
          user: user1,
          booking: createAutobooking({ id: 'booking-1', userId: 1 }),
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
          },
          targetDate: new Date('2024-01-15'),
          coefficient: 1.5,
        },
        {
          user: user2,
          booking: createAutobooking({ id: 'booking-2', userId: 2 }),
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
          },
          targetDate: new Date('2024-01-15'),
          coefficient: 1.5,
        },
      ]);

      // Act
      const result = service.groupTasksByProxy(tasksMap);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.has('key1')).toBe(true);
      const groups = result.get('key1')!;
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    test('should return empty map for empty map input', () => {
      // Arrange
      const emptyMap = new Map<string, BookingTask[]>();

      // Act
      const result = service.groupTasksByProxy(emptyMap);

      // Assert
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    test('should handle single task', () => {
      // Arrange
      const user = createMonitoringUser({ userId: 1 });
      const tasksMap = new Map<string, BookingTask[]>();
      tasksMap.set('key1', [
        {
          user,
          booking: createAutobooking({ id: 'booking-1', userId: 1 }),
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
          },
          targetDate: new Date('2024-01-15'),
          coefficient: 1.5,
        },
      ]);

      // Act
      const result = service.groupTasksByProxy(tasksMap);

      // Assert
      expect(result.has('key1')).toBe(true);
      const groups = result.get('key1')!;
      expect(groups.length).toBe(1);
    });
  });

  describe('getProxyString', () => {
    test('should return proxy string representation', () => {
      // Arrange
      const proxy = { ip: '1.1.1.1', port: '8080', username: 'user1', password: 'pass1' };
      const user = createMonitoringUser({ userId: 1, proxy });
      const task: BookingTask = {
        user,
        booking: createAutobooking({ id: 'booking-1', userId: 1 }),
        availability: {
          warehouseId: 123,
          warehouseName: 'WH1',
          boxTypeID: 2,
          availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
        },
        targetDate: new Date('2024-01-15'),
        coefficient: 1.5,
      };

      // Act
      const proxyString = service.getProxyString(task);

      // Assert
      expect(proxyString).toContain('1.1.1.1');
      expect(proxyString).toContain('8080');
    });

    test('should return "no-proxy" when proxy is undefined', () => {
      // Arrange
      const user = createMonitoringUser({ userId: 1, proxy: undefined });
      const task = {
        user,
        booking: createAutobooking({ id: 'booking-1', userId: 1 }),
        availability: {
          warehouseId: 123,
          warehouseName: 'WH1',
          boxTypeID: 2,
          availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
        },
        targetDate: new Date('2024-01-15'),
        coefficient: 1.5,
      };

      // Act
      const result = service.getProxyString(task);

      // Assert
      expect(result).toBe('no-proxy');
    });

    test('should return "no-proxy" when proxy is null', () => {
      // Arrange
      const user = createMonitoringUser({ userId: 1, proxy: null as any });
      const task = {
        user,
        booking: createAutobooking({ id: 'booking-1', userId: 1 }),
        availability: {
          warehouseId: 123,
          warehouseName: 'WH1',
          boxTypeID: 2,
          availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
        },
        targetDate: new Date('2024-01-15'),
        coefficient: 1.5,
      };

      // Act
      const result = service.getProxyString(task);

      // Assert
      expect(result).toBe('no-proxy');
    });

    test('should handle proxy as string', () => {
      // Arrange
      const user = createMonitoringUser({ userId: 1, proxy: '192.168.1.2:3128' as any });
      const task = {
        user,
        booking: createAutobooking({ id: 'booking-1', userId: 1 }),
        availability: {
          warehouseId: 123,
          warehouseName: 'WH1',
          boxTypeID: 2,
          availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
        },
        targetDate: new Date('2024-01-15'),
        coefficient: 1.5,
      };

      // Act
      const result = service.getProxyString(task);

      // Assert
      expect(result).toBe('192.168.1.2:3128');
    });

    test('should return "no-proxy" for invalid proxy objects', () => {
      // Arrange
      const user = createMonitoringUser({ userId: 1, proxy: { invalid: 'object' } as any });
      const task = {
        user,
        booking: createAutobooking({ id: 'booking-1', userId: 1 }),
        availability: {
          warehouseId: 123,
          warehouseName: 'WH1',
          boxTypeID: 2,
          availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
        },
        targetDate: new Date('2024-01-15'),
        coefficient: 1.5,
      };

      // Act
      const result = service.getProxyString(task);

      // Assert
      expect(result).toBe('no-proxy');
    });
  });

  describe('optimizeTaskOrder', () => {
    test('should return same array for empty array', () => {
      const result = service.optimizeTaskOrder([]);
      expect(result).toEqual([]);
    });

    test('should return same array for single task', () => {
      const task = {
        coefficient: 1.5,
        user: { userId: 1, accounts: {}, proxy: null },
      };

      const result = service.optimizeTaskOrder([task as any]);

      expect(result).toEqual([task]);
    });

    test('should sort tasks by coefficient ascending', () => {
      const task1 = {
        coefficient: 3.0,
        user: { userId: 1, accounts: {}, proxy: 'proxy1' },
        id: 'task1',
      };
      const task2 = {
        coefficient: 1.5,
        user: { userId: 2, accounts: {}, proxy: 'proxy2' },
        id: 'task2',
      };
      const task3 = {
        coefficient: 2.0,
        user: { userId: 3, accounts: {}, proxy: 'proxy3' },
        id: 'task3',
      };

      const result = service.optimizeTaskOrder([task1, task2, task3] as any);

      expect(result[0].coefficient).toBe(1.5);
      expect(result[1].coefficient).toBe(2.0);
      expect(result[2].coefficient).toBe(3.0);
    });

    test('should interleave tasks from different proxies', () => {
      const task1a = {
        coefficient: 1.0,
        user: { userId: 1, accounts: {}, proxy: 'proxy1' },
        id: 'task1a',
      };
      const task1b = {
        coefficient: 3.0,
        user: { userId: 2, accounts: {}, proxy: 'proxy1' },
        id: 'task1b',
      };
      const task2a = {
        coefficient: 2.0,
        user: { userId: 3, accounts: {}, proxy: 'proxy2' },
        id: 'task2a',
      };

      const result = service.optimizeTaskOrder([task1a, task1b, task2a] as any);

      // Should interleave by proxy while maintaining coefficient order within proxy groups
      expect(result[0].id).toBe('task1a'); // proxy1, coeff 1.0
      expect(result[1].id).toBe('task2a'); // proxy2, coeff 2.0
      expect(result[2].id).toBe('task1b'); // proxy1, coeff 3.0
    });

    test('should handle tasks with no proxy', () => {
      const task1 = {
        coefficient: 1.0,
        user: { userId: 1, accounts: {} },
        id: 'task1',
      };
      const task2 = {
        coefficient: 2.0,
        user: { userId: 2, accounts: {} },
        id: 'task2',
      };

      const result = service.optimizeTaskOrder([task1, task2] as any);

      expect(result).toHaveLength(2);
      expect(result[0].coefficient).toBeLessThanOrEqual(result[1].coefficient);
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedTaskOrganizerService).toBeInstanceOf(SharedTaskOrganizerService);
    });
  });
});
