/**
 * Processing State Service Tests
 * Migrated from: server/services/monitoring/shared/__tests__/processingStateService.test.ts
 *
 * Changes made:
 * - Replaced vitest (vi) with jest
 * - Updated import paths
 * - Same test logic preserved
 */

import {
  SharedProcessingStateService,
  sharedProcessingStateService,
} from '../processing-state.service';

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SharedProcessingStateService', () => {
  let service: SharedProcessingStateService;

  beforeEach(() => {
    service = new SharedProcessingStateService();
  });

  afterEach(() => {
    service.clearAllState();
  });

  describe('Autobooking State Management', () => {
    describe('markAutobookingAsProcessed', () => {
      test('should mark autobooking as processed', () => {
        // Act
        service.markAutobookingAsProcessed('booking-1');

        // Assert
        expect(service.isAutobookingProcessed('booking-1')).toBe(true);
      });

      test('should track multiple processed autobookings', () => {
        // Act
        service.markAutobookingAsProcessed('booking-1');
        service.markAutobookingAsProcessed('booking-2');

        // Assert
        expect(service.isAutobookingProcessed('booking-1')).toBe(true);
        expect(service.isAutobookingProcessed('booking-2')).toBe(true);
      });
    });

    describe('isAutobookingProcessed', () => {
      test('should return false for unprocessed booking', () => {
        // Act & Assert
        expect(service.isAutobookingProcessed('unprocessed-booking')).toBe(
          false,
        );
      });

      test('should return true for processed booking', () => {
        // Arrange
        service.markAutobookingAsProcessed('booking-1');

        // Act & Assert
        expect(service.isAutobookingProcessed('booking-1')).toBe(true);
      });
    });

    describe('resetAutobookingState', () => {
      test('should clear all autobooking state', () => {
        // Arrange
        service.markAutobookingAsProcessed('booking-1');
        service.markAutobookingAsProcessed('booking-2');

        // Act
        service.resetAutobookingState();

        // Assert
        expect(service.isAutobookingProcessed('booking-1')).toBe(false);
        expect(service.isAutobookingProcessed('booking-2')).toBe(false);
      });

      test('should clear console log counts', () => {
        // Arrange
        service.incrementConsoleLogCount('key1', 'autobooking');
        service.incrementConsoleLogCount('key2', 'autobooking');

        // Act
        service.resetAutobookingState();

        // Assert
        expect(service.getConsoleLogCount('key1', 'autobooking')).toBe(0);
      });
    });

    describe('getProcessedAutobookingIds', () => {
      test('should return empty set initially', () => {
        // Act
        const ids = service.getProcessedAutobookingIds();

        // Assert
        expect(ids.size).toBe(0);
      });

      test('should return all processed ids', () => {
        // Arrange
        service.markAutobookingAsProcessed('booking-1');
        service.markAutobookingAsProcessed('booking-2');

        // Act
        const ids = service.getProcessedAutobookingIds();

        // Assert
        expect(ids.size).toBe(2);
        expect(ids.has('booking-1')).toBe(true);
        expect(ids.has('booking-2')).toBe(true);
      });
    });
  });

  describe('Reschedule State Management', () => {
    describe('markRescheduleAsProcessed', () => {
      test('should mark reschedule as processed', () => {
        // Act
        service.markRescheduleAsProcessed('reschedule-1');

        // Assert
        expect(service.isRescheduleProcessed('reschedule-1')).toBe(true);
      });
    });

    describe('isRescheduleProcessed', () => {
      test('should return false for unprocessed reschedule', () => {
        // Act & Assert
        expect(service.isRescheduleProcessed('unprocessed-reschedule')).toBe(
          false,
        );
      });

      test('should return true for processed reschedule', () => {
        // Arrange
        service.markRescheduleAsProcessed('reschedule-1');

        // Act & Assert
        expect(service.isRescheduleProcessed('reschedule-1')).toBe(true);
      });
    });

    describe('resetRescheduleState', () => {
      test('should clear all reschedule state', () => {
        // Arrange
        service.markRescheduleAsProcessed('reschedule-1');

        // Act
        service.resetRescheduleState();

        // Assert
        expect(service.isRescheduleProcessed('reschedule-1')).toBe(false);
      });
    });

    describe('getProcessedRescheduleIds', () => {
      test('should return all processed reschedule ids', () => {
        // Arrange
        service.markRescheduleAsProcessed('reschedule-1');
        service.markRescheduleAsProcessed('reschedule-2');

        // Act
        const ids = service.getProcessedRescheduleIds();

        // Assert
        expect(ids.size).toBe(2);
      });
    });
  });

  describe('Console Log Count Management', () => {
    describe('incrementConsoleLogCount', () => {
      test('should increment count for key', () => {
        // Act
        const count1 = service.incrementConsoleLogCount('key1', 'autobooking');
        const count2 = service.incrementConsoleLogCount('key1', 'autobooking');

        // Assert
        expect(count1).toBe(1);
        expect(count2).toBe(2);
      });

      test('should track separate counts for autobooking and reschedule', () => {
        // Act
        service.incrementConsoleLogCount('key1', 'autobooking');
        service.incrementConsoleLogCount('key1', 'reschedule');

        // Assert
        expect(service.getConsoleLogCount('key1', 'autobooking')).toBe(1);
        expect(service.getConsoleLogCount('key1', 'reschedule')).toBe(1);
      });
    });

    describe('getConsoleLogCount', () => {
      test('should return 0 for unknown key', () => {
        // Act & Assert
        expect(service.getConsoleLogCount('unknown', 'autobooking')).toBe(0);
      });

      test('should return correct count', () => {
        // Arrange
        service.incrementConsoleLogCount('key1', 'autobooking');
        service.incrementConsoleLogCount('key1', 'autobooking');

        // Act & Assert
        expect(service.getConsoleLogCount('key1', 'autobooking')).toBe(2);
      });
    });

    describe('clearConsoleLogCount', () => {
      test('should clear count for key', () => {
        // Arrange
        service.incrementConsoleLogCount('key1', 'autobooking');

        // Act
        service.clearConsoleLogCount('key1', 'autobooking');

        // Assert
        expect(service.getConsoleLogCount('key1', 'autobooking')).toBe(0);
      });
    });
  });

  describe('General State Management', () => {
    describe('clearAllState', () => {
      test('should clear all state', () => {
        // Arrange
        service.markAutobookingAsProcessed('booking-1');
        service.markRescheduleAsProcessed('reschedule-1');
        service.incrementConsoleLogCount('key1', 'autobooking');

        // Act
        service.clearAllState();

        // Assert
        expect(service.isAutobookingProcessed('booking-1')).toBe(false);
        expect(service.isRescheduleProcessed('reschedule-1')).toBe(false);
        expect(service.getConsoleLogCount('key1', 'autobooking')).toBe(0);
      });
    });

    describe('getProcessingStats', () => {
      test('should return default stats when empty', () => {
        // Act
        const stats = service.getProcessingStats();

        // Assert
        expect(stats).toEqual({
          autobooking: { processedCount: 0, loggedKeys: 0 },
          reschedule: { processedCount: 0, loggedKeys: 0 },
        });
      });

      test('should return correct statistics', () => {
        // Arrange
        service.markAutobookingAsProcessed('booking-1');
        service.markAutobookingAsProcessed('booking-2');
        service.markRescheduleAsProcessed('reschedule-1');
        service.incrementConsoleLogCount('key1', 'autobooking');
        service.incrementConsoleLogCount('key2', 'autobooking');

        // Act
        const stats = service.getProcessingStats();

        // Assert
        expect(stats.autobooking.processedCount).toBe(2);
        expect(stats.autobooking.loggedKeys).toBe(2);
        expect(stats.reschedule.processedCount).toBe(1);
        expect(stats.reschedule.loggedKeys).toBe(0);
      });
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(sharedProcessingStateService).toBeInstanceOf(
        SharedProcessingStateService,
      );
    });
  });
});
