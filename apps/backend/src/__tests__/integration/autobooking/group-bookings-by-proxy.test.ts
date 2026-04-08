/**
 * Autobooking Monitoring - Group Bookings By Proxy Tests
 * Migrated from: tests/autobookingMonitoring.groupBookingsByProxy.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths to use new project structure
 * - Tests sharedTaskOrganizerService directly (unit-style test)
 * - Same test logic preserved
 * - Uses Map<string, BookingTask[]> as expected by the service API
 */

import { sharedTaskOrganizerService } from '@/services/monitoring/shared/task-organizer.service';
import {
  createAutobooking,
  createMonitoringUser,
} from '@/__tests__/helpers/autobooking-helpers';
import type {
  BookingTask,
  MonitoringUser,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('should group bookings with different proxies together', () => {
      // Arrange: Create booking tasks with different proxies
      const user1 = createMonitoringUser({
        userId: 1,
        proxy: {
          ip: '1.1.1.1',
          port: '8080',
          username: 'user1',
          password: 'pass1',
        },
      });
      const user2 = createMonitoringUser({
        userId: 2,
        proxy: {
          ip: '2.2.2.2',
          port: '8080',
          username: 'user2',
          password: 'pass2',
        },
      });
      const user3 = createMonitoringUser({
        userId: 3,
        proxy: {
          ip: '3.3.3.3',
          port: '8080',
          username: 'user3',
          password: 'pass3',
        },
      });

      const bookingTasks = [
        {
          booking: createAutobooking({ id: 'booking-1', userId: 1 }),
          user: user1,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-2',
            userId: 2,
            supplierId: 'supplier-2',
            draftId: 'draft2',
          }),
          user: user2,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-3',
            userId: 3,
            supplierId: 'supplier-3',
            draftId: 'draft3',
          }),
          user: user3,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
      ];

      const warehouseDateBookingsMap = new Map([
        ['123-Wed Jan 01 2025-BOX', bookingTasks],
      ]);

      // Act
      const result = sharedTaskOrganizerService.groupTasksByProxy(
        warehouseDateBookingsMap,
      );

      // Assert
      expect(result.size).toBe(1);
      expect(result.has('123-Wed Jan 01 2025-BOX')).toBe(true);

      const proxyGroups = result.get('123-Wed Jan 01 2025-BOX')!;
      expect(proxyGroups).toHaveLength(1); // All different proxies can go in one group
      expect(proxyGroups[0]).toHaveLength(3); // All three bookings in one group

      const bookingIds = proxyGroups[0].map(
        (task: BookingTask) => task.booking.id,
      );
      expect(bookingIds).toEqual(['booking-1', 'booking-2', 'booking-3']);
    });

    test('should create separate groups when bookings have same proxies', () => {
      // Arrange: Some bookings share the same proxy
      const sameProxy = {
        ip: '1.1.1.1',
        port: '8080',
        username: 'user1',
        password: 'pass1',
      };
      const user1 = createMonitoringUser({ userId: 1, proxy: sameProxy });
      const user2 = createMonitoringUser({
        userId: 2,
        proxy: {
          ip: '2.2.2.2',
          port: '8080',
          username: 'user2',
          password: 'pass2',
        },
      });
      const user3 = createMonitoringUser({ userId: 3, proxy: sameProxy }); // Same as user1

      const bookingTasks = [
        {
          booking: createAutobooking({ id: 'booking-1', userId: 1 }),
          user: user1,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-2',
            userId: 2,
            supplierId: 'supplier-2',
            draftId: 'draft2',
          }),
          user: user2,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-3',
            userId: 3,
            supplierId: 'supplier-3',
            draftId: 'draft3',
          }),
          user: user3,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
      ];

      const warehouseDateBookingsMap = new Map([
        ['123-Wed Jan 01 2025-BOX', bookingTasks],
      ]);

      // Act
      const result = sharedTaskOrganizerService.groupTasksByProxy(
        warehouseDateBookingsMap,
      );

      // Assert
      const proxyGroups = result.get('123-Wed Jan 01 2025-BOX')!;
      expect(proxyGroups).toHaveLength(2); // Two groups needed

      // Group 1: booking-1 (proxy1) + booking-2 (proxy2)
      // Group 2: booking-3 (proxy1, can't go with group1 since it already has proxy1)
      expect(proxyGroups[0]).toHaveLength(2);
      expect(proxyGroups[1]).toHaveLength(1);

      const group1BookingIds = proxyGroups[0].map(
        (task: BookingTask) => task.booking.id,
      );
      const group2BookingIds = proxyGroups[1].map(
        (task: BookingTask) => task.booking.id,
      );

      expect(group1BookingIds).toContain('booking-1');
      expect(group1BookingIds).toContain('booking-2');
      expect(group2BookingIds).toContain('booking-3');
    });

    test('should handle single booking', () => {
      // Arrange: Single booking task
      const user1 = createMonitoringUser({ userId: 1 });
      const bookingTask = {
        booking: createAutobooking({ id: 'booking-1', userId: 1 }),
        user: user1,
        warehouseName: 'Warehouse 1',
        coefficient: 100,
        availability: {
          warehouseId: 123,
          warehouseName: 'WH1',
          boxTypeID: 2 as const,
          availableDates: [],
        },
      };

      const warehouseDateBookingsMap = new Map([
        ['123-Wed Jan 01 2025-BOX', [bookingTask]],
      ]);

      // Act
      const result = sharedTaskOrganizerService.groupTasksByProxy(
        warehouseDateBookingsMap,
      );

      // Assert: Should create single group
      expect(result.size).toBe(1);
      const proxyGroups = result.get('123-Wed Jan 01 2025-BOX')!;
      expect(proxyGroups).toHaveLength(1);
      expect(proxyGroups[0]).toHaveLength(1);
      expect(proxyGroups[0][0].booking.id).toBe('booking-1');
    });

    test('should handle empty booking tasks', () => {
      // Arrange: Empty task list
      const warehouseDateBookingsMap = new Map([
        ['123-Wed Jan 01 2025-BOX', []],
      ]);

      // Act
      const result = sharedTaskOrganizerService.groupTasksByProxy(
        warehouseDateBookingsMap,
      );

      // Assert: Should return empty array for this key
      expect(result.size).toBe(1);
      const proxyGroups = result.get('123-Wed Jan 01 2025-BOX')!;
      expect(proxyGroups).toHaveLength(0);
    });
  });

  describe('Complex Scenarios', () => {
    test('should optimize grouping with mixed proxy patterns', () => {
      // Arrange: 6 bookings with 3 different proxies, some repeated
      const proxy1 = {
        ip: '1.1.1.1',
        port: '8080',
        username: 'user1',
        password: 'pass1',
      };
      const proxy2 = {
        ip: '2.2.2.2',
        port: '8080',
        username: 'user2',
        password: 'pass2',
      };
      const proxy3 = {
        ip: '3.3.3.3',
        port: '8080',
        username: 'user3',
        password: 'pass3',
      };
      const proxy4 = {
        ip: '4.4.4.4',
        port: '8080',
        username: 'user4',
        password: 'pass4',
      };

      const user1 = createMonitoringUser({ userId: 1, proxy: proxy1 });
      const user2 = createMonitoringUser({ userId: 2, proxy: proxy2 });
      const user3 = createMonitoringUser({ userId: 3, proxy: proxy3 });
      const user4 = createMonitoringUser({ userId: 4, proxy: proxy1 }); // Same as user1
      const user5 = createMonitoringUser({ userId: 5, proxy: proxy2 }); // Same as user2
      const user6 = createMonitoringUser({ userId: 6, proxy: proxy4 });

      const bookingTasks = [
        {
          booking: createAutobooking({ id: 'booking-1', userId: 1 }),
          user: user1,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-2',
            userId: 2,
            supplierId: 'supplier-2',
            draftId: 'draft2',
          }),
          user: user2,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-3',
            userId: 3,
            supplierId: 'supplier-3',
            draftId: 'draft3',
          }),
          user: user3,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-4',
            userId: 4,
            supplierId: 'supplier-4',
            draftId: 'draft4',
          }),
          user: user4,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-5',
            userId: 5,
            supplierId: 'supplier-5',
            draftId: 'draft5',
          }),
          user: user5,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-6',
            userId: 6,
            supplierId: 'supplier-6',
            draftId: 'draft6',
          }),
          user: user6,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
      ];

      const warehouseDateBookingsMap = new Map([
        ['123-Wed Jan 01 2025-BOX', bookingTasks],
      ]);

      // Act
      const result = sharedTaskOrganizerService.groupTasksByProxy(
        warehouseDateBookingsMap,
      );

      // Assert
      const proxyGroups = result.get('123-Wed Jan 01 2025-BOX')!;

      // Expected grouping:
      // Group 1: booking-1 (proxy1) + booking-2 (proxy2) + booking-3 (proxy3) + booking-6 (proxy4)
      // Group 2: booking-4 (proxy1) + booking-5 (proxy2) - both can be together since they have different proxies
      expect(proxyGroups).toHaveLength(2);

      // Verify all bookings are accounted for
      const allBookingIds = proxyGroups
        .flatMap((group: BookingTask[]) =>
          group.map((task: BookingTask) => task.booking.id),
        )
        .sort();
      expect(allBookingIds).toEqual([
        'booking-1',
        'booking-2',
        'booking-3',
        'booking-4',
        'booking-5',
        'booking-6',
      ]);

      // Verify group sizes: first group has 4 bookings, second group has 2 bookings
      expect(proxyGroups[0]).toHaveLength(4);
      expect(proxyGroups[1]).toHaveLength(2);

      // Verify no group has duplicate proxies
      for (const group of proxyGroups) {
        const proxies = group.map(
          (task: BookingTask) =>
            `${task.user.proxy?.ip}:${task.user.proxy?.port}`,
        );
        const uniqueProxies = new Set(proxies);
        expect(proxies.length).toBe(uniqueProxies.size); // No duplicates
      }
    });

    test('should handle all bookings with same proxy', () => {
      // Arrange: All bookings have identical proxy
      const sameProxy = {
        ip: '1.1.1.1',
        port: '8080',
        username: 'user1',
        password: 'pass1',
      };
      const user1 = createMonitoringUser({ userId: 1, proxy: sameProxy });
      const user2 = createMonitoringUser({ userId: 2, proxy: sameProxy });
      const user3 = createMonitoringUser({ userId: 3, proxy: sameProxy });

      const bookingTasks = [
        {
          booking: createAutobooking({ id: 'booking-1', userId: 1 }),
          user: user1,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-2',
            userId: 2,
            supplierId: 'supplier-2',
            draftId: 'draft2',
          }),
          user: user2,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-3',
            userId: 3,
            supplierId: 'supplier-3',
            draftId: 'draft3',
          }),
          user: user3,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
      ];

      const warehouseDateBookingsMap = new Map([
        ['123-Wed Jan 01 2025-BOX', bookingTasks],
      ]);

      // Act
      const result = sharedTaskOrganizerService.groupTasksByProxy(
        warehouseDateBookingsMap,
      );

      // Assert
      const proxyGroups = result.get('123-Wed Jan 01 2025-BOX')!;

      // Each booking needs its own group since they all have the same proxy
      expect(proxyGroups).toHaveLength(3);
      expect(proxyGroups[0]).toHaveLength(1);
      expect(proxyGroups[1]).toHaveLength(1);
      expect(proxyGroups[2]).toHaveLength(1);

      const allBookingIds = proxyGroups
        .flatMap((group: BookingTask[]) =>
          group.map((task: BookingTask) => task.booking.id),
        )
        .sort();
      expect(allBookingIds).toEqual(['booking-1', 'booking-2', 'booking-3']);
    });
  });

  describe('Multiple Warehouse-Date Combinations', () => {
    test('should handle multiple warehouse-date keys correctly', () => {
      // Arrange: Different warehouse-date combinations
      const user1 = createMonitoringUser({
        userId: 1,
        proxy: {
          ip: '1.1.1.1',
          port: '8080',
          username: 'user1',
          password: 'pass1',
        },
      });
      const user2 = createMonitoringUser({
        userId: 2,
        proxy: {
          ip: '2.2.2.2',
          port: '8080',
          username: 'user2',
          password: 'pass2',
        },
      });

      const bookingTasks1 = [
        {
          booking: createAutobooking({ id: 'booking-1', userId: 1 }),
          user: user1,
          warehouseName: 'Warehouse 1',
          coefficient: 100,
          availability: {
            warehouseId: 123,
            warehouseName: 'WH1',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
      ];

      const bookingTasks2 = [
        {
          booking: createAutobooking({
            id: 'booking-2',
            userId: 1,
            supplierId: 'supplier-2',
            draftId: 'draft2',
          }),
          user: user1, // Same user, different warehouse-date
          warehouseName: 'Warehouse 2',
          coefficient: 200,
          availability: {
            warehouseId: 124,
            warehouseName: 'WH2',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
        {
          booking: createAutobooking({
            id: 'booking-3',
            userId: 2,
            supplierId: 'supplier-3',
            draftId: 'draft3',
          }),
          user: user2,
          warehouseName: 'Warehouse 2',
          coefficient: 200,
          availability: {
            warehouseId: 124,
            warehouseName: 'WH2',
            boxTypeID: 2 as const,
            availableDates: [],
          },
        },
      ];

      const warehouseDateBookingsMap = new Map([
        ['123-Wed Jan 01 2025-BOX', bookingTasks1],
        ['124-Wed Jan 01 2025-BOX', bookingTasks2],
      ]);

      // Act
      const result = sharedTaskOrganizerService.groupTasksByProxy(
        warehouseDateBookingsMap,
      );

      // Assert
      expect(result.size).toBe(2);

      // Check first warehouse-date
      const proxyGroups1 = result.get('123-Wed Jan 01 2025-BOX')!;
      expect(proxyGroups1).toHaveLength(1); // One group
      expect(proxyGroups1[0]).toHaveLength(1);
      expect(proxyGroups1[0][0].booking.id).toBe('booking-1');

      // Check second warehouse-date
      const proxyGroups2 = result.get('124-Wed Jan 01 2025-BOX')!;
      expect(proxyGroups2).toHaveLength(1); // One group with different proxies
      expect(proxyGroups2[0]).toHaveLength(2); // Both bookings can be together (different proxies)

      const group2BookingIds = proxyGroups2[0]
        .map((task: BookingTask) => task.booking.id)
        .sort();
      expect(group2BookingIds).toEqual(['booking-2', 'booking-3']);
    });
  });
});
