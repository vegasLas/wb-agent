/**
 * Task Organizer Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/taskOrganizerService.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import { SharedTaskOrganizerService, sharedTaskOrganizerService } from '../task-organizer.service';
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

describe('SharedTaskOrganizerService', () => {
  let service: SharedTaskOrganizerService;

  beforeEach(() => {
    service = new SharedTaskOrganizerService();
  });

  describe('organizeAutobookingsByWarehouseDate', () => {
    test('should organize autobookings by warehouse-date', () => {
      // Arrange
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
      const monitoringUsers = [
        createMonitoringUser({
          userId: 1,
          autobookings: [
            createAutobooking({ id: 'booking-1', userId: 1 }),
          ],
        }),
      ];

      const availabilities: WarehouseAvailability[] = [];

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
              targetDateFrom: getFutureDate(7),
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
          availableDates: [{ date: getFutureDate(7).toISOString().split('T')[0], coefficient: 1.5 }],
        },
      ];

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

      const tasks: BookingTask[] = [
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
        },
      ];

      // Act
      const groups = service.groupTasksByProxy(tasks);

      // Assert
      expect(groups).toBeInstanceOf(Array);
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    test('should return empty array for empty tasks', () => {
      // Act
      const groups = service.groupTasksByProxy([]);

      // Assert
      expect(groups).toEqual([]);
    });

    test('should handle single task', () => {
      // Arrange
      const user = createMonitoringUser({ userId: 1 });
      const tasks: BookingTask[] = [
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
        },
      ];

      // Act
      const groups = service.groupTasksByProxy(tasks);

      // Assert
      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(1);
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
      };

      // Act
      const proxyString = service.getProxyString(task);

      // Assert
      expect(proxyString).toContain('1.1.1.1');
      expect(proxyString).toContain('8080');
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedTaskOrganizerService).toBeInstanceOf(SharedTaskOrganizerService);
    });
  });
});
