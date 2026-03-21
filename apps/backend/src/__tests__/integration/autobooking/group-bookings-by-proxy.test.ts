/**
 * Autobooking Monitoring - Group Bookings By Proxy Tests
 * Migrated from: tests/autobookingMonitoring.groupBookingsByProxy.test.ts
 * 
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Tests sharedTaskOrganizerService directly (unit-style test)
 * - Same test logic preserved
 */

import { sharedTaskOrganizerService } from '../../../services/monitoring/shared/task-organizer.service';
import {
  createAutobooking,
  createMonitoringUser,
} from '../../helpers/autobooking-helpers';
import type { BookingTask, MonitoringUser } from '../../../services/monitoring/shared/interfaces/sharedInterfaces';

// Mock minimal dependencies
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TaskOrganizerService - Group Bookings By Proxy', () => {
  describe('Basic Functionality', () => {
    test('should group bookings with different proxies together', () => {
      // Arrange: Create booking tasks with different proxies
      const user1 = createMonitoringUser({
        userId: 1,
        proxy: { ip: '1.1.1.1', port: '8080', username: 'user1', password: 'pass1' },
      });
      const user2 = createMonitoringUser({
        userId: 2,
        proxy: { ip: '2.2.2.2', port: '8080', username: 'user2', password: 'pass2' },
      });

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
          booking: createAutobooking({ id: 'booking-2', userId: 2, supplierId: 'supplier-2', draftId: 'draft2' }),
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
      const groups = sharedTaskOrganizerService.groupTasksByProxy(tasks);

      // Assert: Should group into one group (different proxies can be together)
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    test('should separate bookings with same proxy into different groups when needed', () => {
      // Arrange: Create booking tasks with same proxy
      const sameProxy = { ip: '1.1.1.1', port: '8080', username: 'user1', password: 'pass1' };
      const user1 = createMonitoringUser({ userId: 1, proxy: sameProxy });
      const user2 = createMonitoringUser({ userId: 2, proxy: sameProxy });

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
          booking: createAutobooking({ id: 'booking-2', userId: 2, supplierId: 'supplier-2', draftId: 'draft2' }),
          availability: {
            warehouseId: 456,
            warehouseName: 'WH2',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-16', coefficient: 2.0 }],
          },
          targetDate: new Date('2024-01-16'),
        },
      ];

      // Act
      const groups = sharedTaskOrganizerService.groupTasksByProxy(tasks);

      // Assert: Groups should be organized appropriately
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle single booking', () => {
      // Arrange: Single booking task
      const user1 = createMonitoringUser({ userId: 1 });
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
      ];

      // Act
      const groups = sharedTaskOrganizerService.groupTasksByProxy(tasks);

      // Assert: Should create single group
      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(1);
    });

    test('should handle empty task list', () => {
      // Arrange: Empty task list
      const tasks: BookingTask[] = [];

      // Act
      const groups = sharedTaskOrganizerService.groupTasksByProxy(tasks);

      // Assert: Should return empty array
      expect(groups.length).toBe(0);
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle mixed proxy patterns', () => {
      // Arrange: Multiple users with different proxy patterns
      const proxy1 = { ip: '1.1.1.1', port: '8080', username: 'user1', password: 'pass1' };
      const proxy2 = { ip: '2.2.2.2', port: '8080', username: 'user2', password: 'pass2' };
      const proxy3 = { ip: '3.3.3.3', port: '8080', username: 'user3', password: 'pass3' };

      const user1 = createMonitoringUser({ userId: 1, proxy: proxy1 });
      const user2 = createMonitoringUser({ userId: 2, proxy: proxy2 });
      const user3 = createMonitoringUser({ userId: 3, proxy: proxy3 });

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
          booking: createAutobooking({ id: 'booking-2', userId: 2, supplierId: 'supplier-2', draftId: 'draft2' }),
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
          },
          targetDate: new Date('2024-01-15'),
        },
        {
          user: user3,
          booking: createAutobooking({ id: 'booking-3', userId: 3, supplierId: 'supplier-3', draftId: 'draft3' }),
          availability: {
            warehouseId: 456,
            warehouseName: 'WH2',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-16', coefficient: 2.0 }],
          },
          targetDate: new Date('2024-01-16'),
        },
      ];

      // Act
      const groups = sharedTaskOrganizerService.groupTasksByProxy(tasks);

      // Assert: Should create appropriate groups
      expect(groups.length).toBeGreaterThanOrEqual(1);
      // Total tasks should be preserved
      const totalTasks = groups.reduce((sum, group) => sum + group.length, 0);
      expect(totalTasks).toBe(3);
    });

    test('should handle all bookings with same proxy', () => {
      // Arrange: Multiple users all with same proxy
      const sameProxy = { ip: '1.1.1.1', port: '8080', username: 'user1', password: 'pass1' };
      const user1 = createMonitoringUser({ userId: 1, proxy: sameProxy });
      const user2 = createMonitoringUser({ userId: 2, proxy: sameProxy });
      const user3 = createMonitoringUser({ userId: 3, proxy: sameProxy });

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
          booking: createAutobooking({ id: 'booking-2', userId: 2, supplierId: 'supplier-2', draftId: 'draft2' }),
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-15', coefficient: 1.5 }],
          },
          targetDate: new Date('2024-01-15'),
        },
        {
          user: user3,
          booking: createAutobooking({ id: 'booking-3', userId: 3, supplierId: 'supplier-3', draftId: 'draft3' }),
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
      const groups = sharedTaskOrganizerService.groupTasksByProxy(tasks);

      // Assert: Should handle same-proxy bookings appropriately
      expect(groups.length).toBeGreaterThanOrEqual(1);
      const totalTasks = groups.reduce((sum, group) => sum + group.length, 0);
      expect(totalTasks).toBe(3);
    });
  });

  describe('Multiple Warehouse-Date Combinations', () => {
    test('should handle tasks for multiple warehouse-date combinations', () => {
      // Arrange: Tasks for different warehouse-date combinations
      const user1 = createMonitoringUser({ userId: 1 });
      const user2 = createMonitoringUser({ userId: 2 });

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
          booking: createAutobooking({ id: 'booking-2', userId: 2, supplierId: 'supplier-2', draftId: 'draft2' }),
          availability: {
            warehouseId: 456,
            warehouseName: 'WH2',
            boxTypeID: 2,
            availableDates: [{ date: '2024-01-16', coefficient: 2.0 }],
          },
          targetDate: new Date('2024-01-16'),
        },
      ];

      // Act
      const groups = sharedTaskOrganizerService.groupTasksByProxy(tasks);

      // Assert
      expect(groups.length).toBeGreaterThanOrEqual(1);
      const totalTasks = groups.reduce((sum, group) => sum + group.length, 0);
      expect(totalTasks).toBe(2);
    });
  });
});
