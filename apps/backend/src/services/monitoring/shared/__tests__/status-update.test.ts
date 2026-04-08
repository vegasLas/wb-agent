/**
 * Status Update Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/statusUpdateService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import {
  SharedStatusUpdateService,
  sharedStatusUpdateService,
} from '@/services/monitoring/shared/status-update.service';
import { prisma } from '@/config/database';

// Mock prisma
jest.mock('../../../../config/database', () => ({
  prisma: {
    autobooking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    autobookingReschedule: {
      findUnique: jest.fn(),
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

describe('SharedStatusUpdateService', () => {
  let service: SharedStatusUpdateService;
  let mockPrisma: jest.Mocked<typeof prisma>;

  beforeEach(() => {
    service = new SharedStatusUpdateService();
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    jest.clearAllMocks();
  });

  describe('updateCompletedDates', () => {
    test('should handle CUSTOM_DATES_SINGLE date type', async () => {
      // Arrange
      const item = {
        dateType: 'CUSTOM_DATES_SINGLE',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        completedDates: [],
      };
      const completedDate = new Date('2024-01-15');

      // Act
      const result = await service.updateCompletedDates(item, completedDate);

      // Assert
      expect(result.newStatus).toBe('COMPLETED');
      expect(result.updatedCompletedDates).toHaveLength(1);
    });

    test('should handle CUSTOM_DATES with remaining dates', async () => {
      // Arrange
      const item = {
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15'), new Date('2024-01-16')],
        completedDates: [],
      };
      const completedDate = new Date('2024-01-15');

      // Act
      const result = await service.updateCompletedDates(item, completedDate);

      // Assert
      expect(result.newStatus).toBe('ACTIVE');
      expect(result.updatedCustomDates).toHaveLength(1);
    });

    test('should handle CUSTOM_DATES with all dates completed', async () => {
      // Arrange
      const item = {
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15')],
        completedDates: [],
      };
      const completedDate = new Date('2024-01-15');

      // Act
      const result = await service.updateCompletedDates(item, completedDate);

      // Assert
      expect(result.newStatus).toBe('COMPLETED');
      expect(result.updatedCustomDates).toHaveLength(0);
    });

    test('should handle WEEK date type', async () => {
      // Arrange
      const item = {
        dateType: 'WEEK',
        customDates: [],
        completedDates: [],
      };
      const completedDate = new Date('2024-01-15');

      // Act
      const result = await service.updateCompletedDates(item, completedDate);

      // Assert
      expect(result.newStatus).toBe('COMPLETED');
    });

    test('should handle MONTH date type', async () => {
      // Arrange
      const item = {
        dateType: 'MONTH',
        customDates: [],
        completedDates: [],
      };
      const completedDate = new Date('2024-01-15');

      // Act
      const result = await service.updateCompletedDates(item, completedDate);

      // Assert
      expect(result.newStatus).toBe('COMPLETED');
    });
  });

  describe('updateAutobookingStatus', () => {
    test('should update autobooking status for CUSTOM_DATES', async () => {
      // Arrange
      (mockPrisma.autobooking.findUnique as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        dateType: 'CUSTOM_DATES',
        customDates: [new Date('2024-01-15')],
        completedDates: [],
      });
      (mockPrisma.autobooking.update as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
      });

      // Act
      await service.updateAutobookingStatus(
        'booking-1',
        new Date('2024-01-15'),
        'CUSTOM_DATES',
      );

      // Assert
      expect(mockPrisma.autobooking.update).toHaveBeenCalled();
    });

    test('should update autobooking status for WEEK date type', async () => {
      // Arrange
      (mockPrisma.autobooking.update as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
      });

      // Act
      await service.updateAutobookingStatus(
        'booking-1',
        new Date('2024-01-15'),
        'WEEK',
      );

      // Assert
      expect(mockPrisma.autobooking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: {
          status: 'COMPLETED',
          completedDates: [expect.any(Date)],
        },
      });
    });

    test('should handle missing autobooking', async () => {
      // Arrange
      (mockPrisma.autobooking.findUnique as jest.Mock).mockResolvedValue(null);

      // Act - should not throw
      await expect(
        service.updateAutobookingStatus(
          'missing-id',
          new Date('2024-01-15'),
          'CUSTOM_DATES',
        ),
      ).resolves.not.toThrow();
    });

    test('should handle database errors', async () => {
      // Arrange
      (mockPrisma.autobooking.update as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      // Act & Assert - should throw error
      await expect(
        service.updateAutobookingStatus(
          'booking-1',
          new Date('2024-01-15'),
          'WEEK',
        ),
      ).rejects.toThrow('DB error');
    });
  });

  describe('updateRescheduleStatus', () => {
    test('should update reschedule status for CUSTOM_DATES_SINGLE', async () => {
      // Arrange
      (
        mockPrisma.autobookingReschedule.findUnique as jest.Mock
      ).mockResolvedValue({
        id: 'reschedule-1',
        dateType: 'CUSTOM_DATES_SINGLE',
        customDates: [new Date('2024-01-15')],
        completedDates: [],
      });
      (mockPrisma.autobookingReschedule.update as jest.Mock).mockResolvedValue({
        id: 'reschedule-1',
        status: 'COMPLETED',
      });

      // Act
      await service.updateRescheduleStatus(
        'reschedule-1',
        new Date('2024-01-15'),
        'CUSTOM_DATES_SINGLE',
      );

      // Assert
      expect(mockPrisma.autobookingReschedule.update).toHaveBeenCalled();
    });

    test('should update reschedule status for non-CUSTOM_DATES_SINGLE', async () => {
      // Arrange
      (mockPrisma.autobookingReschedule.update as jest.Mock).mockResolvedValue({
        id: 'reschedule-1',
        status: 'COMPLETED',
      });

      // Act
      await service.updateRescheduleStatus(
        'reschedule-1',
        new Date('2024-01-15'),
        'WEEK',
      );

      // Assert
      expect(mockPrisma.autobookingReschedule.update).toHaveBeenCalledWith({
        where: { id: 'reschedule-1' },
        data: {
          status: 'COMPLETED',
          completedDates: [expect.any(Date)],
        },
      });
    });
  });

  describe('updateGenericItemStatus', () => {
    test('should call updateAutobookingStatus for autobooking table', async () => {
      // Arrange
      (mockPrisma.autobooking.update as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        status: 'COMPLETED',
      });

      // Act
      await service.updateGenericItemStatus(
        'autobooking',
        'booking-1',
        new Date('2024-01-15'),
        'WEEK',
      );

      // Assert
      expect(mockPrisma.autobooking.update).toHaveBeenCalled();
    });

    test('should call updateRescheduleStatus for autobookingReschedule table', async () => {
      // Arrange
      (mockPrisma.autobookingReschedule.update as jest.Mock).mockResolvedValue({
        id: 'reschedule-1',
        status: 'COMPLETED',
      });

      // Act
      await service.updateGenericItemStatus(
        'autobookingReschedule',
        'reschedule-1',
        new Date('2024-01-15'),
        'WEEK',
      );

      // Assert
      expect(mockPrisma.autobookingReschedule.update).toHaveBeenCalled();
    });
  });

  describe('shouldMarkAsCompleted', () => {
    test('should return true for CUSTOM_DATES_SINGLE', () => {
      // Act
      const result = service.shouldMarkAsCompleted(
        'CUSTOM_DATES_SINGLE',
        [],
        new Date(),
      );

      // Assert
      expect(result).toBe(true);
    });

    test('should return true for CUSTOM_DATES with no remaining dates', () => {
      // Arrange
      const customDates: Date[] = [];
      const completedDate = new Date('2024-01-15');

      // Act
      const result = service.shouldMarkAsCompleted(
        'CUSTOM_DATES',
        customDates,
        completedDate,
      );

      // Assert
      expect(result).toBe(true);
    });

    test('should return false for CUSTOM_DATES with remaining dates', () => {
      // Arrange
      const customDates = [new Date('2024-01-16')];
      const completedDate = new Date('2024-01-15');

      // Act
      const result = service.shouldMarkAsCompleted(
        'CUSTOM_DATES',
        customDates,
        completedDate,
      );

      // Assert - should return false because there's still 2024-01-16 remaining
      expect(result).toBe(false);
    });

    test('should return true for WEEK date type', () => {
      // Act
      const result = service.shouldMarkAsCompleted('WEEK', [], new Date());

      // Assert
      expect(result).toBe(true);
    });

    test('should return true for MONTH date type', () => {
      // Act
      const result = service.shouldMarkAsCompleted('MONTH', [], new Date());

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getEffectiveDates', () => {
    test('should return filtered custom dates for CUSTOM_DATES', () => {
      // Arrange
      const today = new Date();
      const futureDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const pastDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      // Act
      const result = service.getEffectiveDates('CUSTOM_DATES', null, null, [
        futureDate,
        pastDate,
      ]);

      // Assert
      expect(result).toContainEqual(expect.any(Date));
    });

    test('should return empty array for WEEK without startDate', () => {
      // Act
      const result = service.getEffectiveDates('WEEK', null, null, []);

      // Assert
      expect(result).toEqual([]);
    });

    test('should return date range for WEEK with startDate', () => {
      // Arrange
      const startDate = new Date();

      // Act
      const result = service.getEffectiveDates('WEEK', startDate, null, []);

      // Assert
      expect(result.length).toBeGreaterThan(0);
    });

    test('should return empty array for MONTH without startDate', () => {
      // Act
      const result = service.getEffectiveDates('MONTH', null, null, []);

      // Assert
      expect(result).toEqual([]);
    });

    test('should return date range for CUSTOM_PERIOD', () => {
      // Arrange
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);

      // Act
      const result = service.getEffectiveDates(
        'CUSTOM_PERIOD',
        startDate,
        endDate,
        [],
      );

      // Assert
      expect(result.length).toBeGreaterThan(0);
    });

    test('should return empty array for CUSTOM_PERIOD without dates', () => {
      // Act
      const result = service.getEffectiveDates('CUSTOM_PERIOD', null, null, []);

      // Assert
      expect(result).toEqual([]);
    });

    test('should return empty array for unknown date type', () => {
      // Act
      const result = service.getEffectiveDates('UNKNOWN', null, null, []);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedStatusUpdateService).toBeInstanceOf(
        SharedStatusUpdateService,
      );
    });
  });
});
