import type { ISharedProcessingStateService } from "../interfaces/shared.interfaces";

export class SharedProcessingStateService implements ISharedProcessingStateService {
  // Processing state for autobooking
  private readonly autobookingState = {
    processedBookingIds: new Set<string>(),
    consoleLogCount: new Map<string, number>(),
  };

  // Processing state for reschedule
  private readonly rescheduleState = {
    processedRescheduleIds: new Set<string>(),
    consoleLogCount: new Map<string, number>(),
  };

  /**
   * Resets processing state for autobooking
   */
  resetAutobookingState(): void {
    this.autobookingState.processedBookingIds.clear();
    this.autobookingState.consoleLogCount.clear();
  }

  /**
   * Resets processing state for reschedule
   */
  resetRescheduleState(): void {
    this.rescheduleState.processedRescheduleIds.clear();
    this.rescheduleState.consoleLogCount.clear();
  }

  /**
   * Checks if autobooking is already processed
   */
  isAutobookingProcessed(bookingId: string): boolean {
    return this.autobookingState.processedBookingIds.has(bookingId);
  }

  /**
   * Checks if reschedule is already processed
   */
  isRescheduleProcessed(rescheduleId: string): boolean {
    return this.rescheduleState.processedRescheduleIds.has(rescheduleId);
  }

  /**
   * Marks autobooking as processed
   */
  markAutobookingAsProcessed(bookingId: string): void {
    this.autobookingState.processedBookingIds.add(bookingId);
  }

  /**
   * Marks reschedule as processed
   */
  markRescheduleAsProcessed(rescheduleId: string): void {
    this.rescheduleState.processedRescheduleIds.add(rescheduleId);
  }

  /**
   * Gets all processed autobooking IDs
   */
  getProcessedAutobookingIds(): Set<string> {
    return new Set(this.autobookingState.processedBookingIds);
  }

  /**
   * Gets all processed reschedule IDs
   */
  getProcessedRescheduleIds(): Set<string> {
    return new Set(this.rescheduleState.processedRescheduleIds);
  }

  /**
   * Increments console log count for a key
   */
  incrementConsoleLogCount(
    key: string,
    type: "autobooking" | "reschedule",
  ): number {
    const state =
      type === "autobooking" ? this.autobookingState : this.rescheduleState;
    const currentCount = state.consoleLogCount.get(key) || 0;
    const newCount = currentCount + 1;
    state.consoleLogCount.set(key, newCount);
    return newCount;
  }

  /**
   * Gets console log count for a key
   */
  getConsoleLogCount(key: string, type: "autobooking" | "reschedule"): number {
    const state =
      type === "autobooking" ? this.autobookingState : this.rescheduleState;
    return state.consoleLogCount.get(key) || 0;
  }

  /**
   * Clears console log count for a key
   */
  clearConsoleLogCount(key: string, type: "autobooking" | "reschedule"): void {
    const state =
      type === "autobooking" ? this.autobookingState : this.rescheduleState;
    state.consoleLogCount.delete(key);
  }

  /**
   * Gets processing statistics
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
        processedCount: this.autobookingState.processedBookingIds.size,
        loggedKeys: this.autobookingState.consoleLogCount.size,
      },
      reschedule: {
        processedCount: this.rescheduleState.processedRescheduleIds.size,
        loggedKeys: this.rescheduleState.consoleLogCount.size,
      },
    };
  }

  /**
   * Clears all processing state
   */
  clearAllState(): void {
    this.resetAutobookingState();
    this.resetRescheduleState();
  }
}

export const sharedProcessingStateService = new SharedProcessingStateService();
