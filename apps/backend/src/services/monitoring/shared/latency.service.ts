/**
 * Latency Service
 * Phase 1: Foundation - Generates realistic API call delays
 * 
 * Purpose: Simulates realistic network latency for API calls to avoid
 * detection patterns and rate limiting
 */

import type { ISharedLatencyService } from './interfaces/sharedInterfaces';

// Constants for latency calculation (in milliseconds)
const LATENCY_MIN_MS = 8.1 * 1000;  // 8.1 seconds minimum
const LATENCY_MAX_MS = 14.5 * 1000; // 14.5 seconds maximum

/**
 * Service for generating realistic latency values
 * Used to simulate human-like delays between API calls
 */
export class SharedLatencyService implements ISharedLatencyService {
  /**
   * Generates a random latency value between min and max bounds
   * Used for simulating realistic API call delays
   * @returns Random latency in milliseconds with 16 decimal precision
   */
  generateLatency(): number {
    return parseFloat(
      (
        Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS) +
        LATENCY_MIN_MS
      ).toFixed(16)
    );
  }

  /**
   * Gets the minimum latency value
   * @returns Minimum latency in milliseconds
   */
  getMinLatency(): number {
    return LATENCY_MIN_MS;
  }

  /**
   * Gets the maximum latency value
   * @returns Maximum latency in milliseconds
   */
  getMaxLatency(): number {
    return LATENCY_MAX_MS;
  }

  /**
   * Generates latency within custom bounds
   * @param minMs - Minimum milliseconds
   * @param maxMs - Maximum milliseconds
   * @returns Random latency in milliseconds with 16 decimal precision
   */
  generateCustomLatency(minMs: number, maxMs: number): number {
    if (minMs >= maxMs) {
      throw new Error('minMs must be less than maxMs');
    }
    return parseFloat((Math.random() * (maxMs - minMs) + minMs).toFixed(16));
  }

  /**
   * Creates a promise that resolves after the generated latency
   * @returns Promise that resolves after the delay
   */
  async sleepWithLatency(): Promise<void> {
    const latency = this.generateLatency();
    return new Promise(resolve => setTimeout(resolve, latency));
  }

  /**
   * Creates a promise that resolves after a custom latency
   * @param minMs - Minimum milliseconds
   * @param maxMs - Maximum milliseconds
   * @returns Promise that resolves after the delay
   */
  async sleepWithCustomLatency(minMs: number, maxMs: number): Promise<void> {
    const latency = this.generateCustomLatency(minMs, maxMs);
    return new Promise(resolve => setTimeout(resolve, latency));
  }
}

/**
 * Singleton instance of the latency service
 */
export const sharedLatencyService = new SharedLatencyService();
