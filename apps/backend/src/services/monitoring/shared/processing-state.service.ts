/**
 * Processing State Service
 * Phase 1: Foundation - Tracks processed items per monitoring cycle
 *
 * Purpose: Prevents duplicate processing of autobookings and reschedules
 * within a single monitoring cycle. Tracks console log counts for debugging.
 */

import type { ISharedProcessingStateService } from './interfaces/sharedInterfaces';

interface ProcessingState {
  processedIds: Set<string>;
  consoleLogCount: Map<string, number>;
}

/**
 * Service for tracking processing state across monitoring cycles
 * Ensures items are not processed multiple times in the same cycle
 */
export class SharedProcessingStateService
  implements ISharedProcessingStateService
{
  // Processing state for autobooking
  private readonly autobookingState: ProcessingState = {
    processedIds: new Set<string>(),
    consoleLogCount: new Map<string, number>(),
  };

  // Processing state for reschedule
  private readonly rescheduleState: ProcessingState = {
    processedIds: new Set<string>(),
    consoleLogCount: new Map<string, number>(),
  };

  /**
   * Resets processing state for autobooking
   * Should be called at the start of each monitoring cycle
   */
  resetAutobookingState(): void {
    this.autobookingState.processedIds.clear();
    this.autobookingState.consoleLogCount.clear();
  }

  /**
   * Resets processing state for reschedule
   * Should be called at the start of each monitoring cycle
   */
  resetRescheduleState(): void {
    this.rescheduleState.processedIds.clear();
    this.rescheduleState.consoleLogCount.clear();
  }

  /**
   * Checks if autobooking is already processed in current cycle
   * @param bookingId - The autobooking ID to check
   * @returns True if already processed
   */
  isAutobookingProcessed(bookingId: string): boolean {
    return this.autobookingState.processedIds.has(bookingId);
  }

  /**
   * Checks if reschedule is already processed in current cycle
   * @param rescheduleId - The reschedule ID to check
   * @returns True if already processed
   */
  isRescheduleProcessed(rescheduleId: string): boolean {
    return this.rescheduleState.processedIds.has(rescheduleId);
  }

  /**
   * Marks autobooking as processed
   * @param bookingId - The autobooking ID to mark
   */
  markAutobookingAsProcessed(bookingId: string): void {
    this.autobookingState.processedIds.add(bookingId);
  }

  /**
   * Marks reschedule as processed
   * @param rescheduleId - The reschedule ID to mark
   */
  markRescheduleAsProcessed(rescheduleId: string): void {
    this.rescheduleState.processedIds.add(rescheduleId);
  }

  /**
   * Gets all processed autobooking IDs
   * @returns Set of processed autobooking IDs
   */
  getProcessedAutobookingIds(): Set<string> {
    return new Set(this.autobookingState.processedIds);
  }

  /**
   * Gets all processed reschedule IDs
   * @returns Set of processed reschedule IDs
   */
  getProcessedRescheduleIds(): Set<string> {
    return new Set(this.rescheduleState.processedIds);
  }

  /**
   * Increments console log count for a key
   * Used for limiting repetitive log messages
   * @param key - The log key/category
   * @param type - Either 'autobooking' or 'reschedule'
   * @returns New count after increment
   */
  incrementConsoleLogCount(
    key: string,
    type: 'autobooking' | 'reschedule',
  ): number {
    const state =
      type === 'autobooking' ? this.autobookingState : this.rescheduleState;
    const currentCount = state.consoleLogCount.get(key) || 0;
    const newCount = currentCount + 1;
    state.consoleLogCount.set(key, newCount);
    return newCount;
  }

  /**
   * Gets console log count for a key
   * @param key - The log key/category
   * @param type - Either 'autobooking' or 'reschedule'
   * @returns Current count
   */
  getConsoleLogCount(key: string, type: 'autobooking' | 'reschedule'): number {
    const state =
      type === 'autobooking' ? this.autobookingState : this.rescheduleState;
    return state.consoleLogCount.get(key) || 0;
  }

  /**
   * Clears console log count for a key
   * @param key - The log key/category
   * @param type - Either 'autobooking' or 'reschedule'
   */
  clearConsoleLogCount(key: string, type: 'autobooking' | 'reschedule'): void {
    const state =
      type === 'autobooking' ? this.autobookingState : this.rescheduleState;
    state.consoleLogCount.delete(key);
  }

  /**
   * Gets processing statistics for monitoring
   * @returns Statistics for both autobooking and reschedule
   */
  getProcessingStats(): {
    autobooking: {
      processedCount: number;
      loggedKeys: number;
    };
    reschedule: {
      processedCount: number;
      loggedKeys: number;
    };
  } {
    return {
      autobooking: {
        processedCount: this.autobookingState.processedIds.size,
        loggedKeys: this.autobookingState.consoleLogCount.size,
      },
      reschedule: {
        processedCount: this.rescheduleState.processedIds.size,
        loggedKeys: this.rescheduleState.consoleLogCount.size,
      },
    };
  }

  /**
   * Clears all processing state
   * Should be called when shutting down or resetting
   */
  clearAllState(): void {
    this.resetAutobookingState();
    this.resetRescheduleState();
  }
}

/**
 * Singleton instance of the processing state service
 */
export const sharedProcessingStateService = new SharedProcessingStateService();
