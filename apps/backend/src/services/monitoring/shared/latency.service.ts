import type { ISharedLatencyService } from "../interfaces/shared.interfaces";

// Constants for latency calculation
const LATENCY_MIN_MS = 8.1 * 1000;
const LATENCY_MAX_MS = 14.5 * 1000;

export class SharedLatencyService implements ISharedLatencyService {
  /**
   * Generates a random latency value between min and max bounds
   * Used for simulating realistic API call delays
   */
  generateLatency(): number {
    return parseFloat(
      (
        Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS) +
        LATENCY_MIN_MS
      ).toFixed(16),
    );
  }

  /**
   * Gets the minimum latency value
   */
  getMinLatency(): number {
    return LATENCY_MIN_MS;
  }

  /**
   * Gets the maximum latency value
   */
  getMaxLatency(): number {
    return LATENCY_MAX_MS;
  }

  /**
   * Generates latency within custom bounds
   */
  generateCustomLatency(minMs: number, maxMs: number): number {
    return parseFloat((Math.random() * (maxMs - minMs) + minMs).toFixed(16));
  }
}

export const sharedLatencyService = new SharedLatencyService();
