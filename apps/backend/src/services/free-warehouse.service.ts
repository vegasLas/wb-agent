/**
 * Free Warehouse Service
 * Migrated from deprecated project server/services/freeWarehouseService.ts
 * Handles fetching warehouses from free API with caching
 */

import { Supply } from '../types/wb';
import { triggerService } from './trigger.service';
import { apiKeyRateLimiterService } from './api-key-rate-limiter.service';
import { logger } from '../utils/logger';

export class FreeWarehouseService {
  private static instance: FreeWarehouseService;
  private cachedWarehouses: Supply[] = [];
  private lastUpdateTimestamp: number = 0;
  private readonly CACHE_FRESHNESS_MS = 5000; // Only return cache if updated within last 5 seconds

  static getInstance(): FreeWarehouseService {
    if (!this.instance) {
      this.instance = new FreeWarehouseService();
    }
    return this.instance;
  }

  /**
   * Method to be called from triggerDateUpdate.ts plugin
   * Fetches warehouses without awaiting - fire and forget
   * Returns wait info if should wait, or null if proceeded with fetch
   */
  async fetchWarehousesNonBlocking(): Promise<{
    shouldWait: boolean;
    waitTime?: number;
  } | null> {
    try {
      // Check if we should wait before making the next request
      const waitInfo = await apiKeyRateLimiterService.shouldWaitBeforeNextRequest();
      if (waitInfo.shouldWait) {
        // Return wait info instead of proceeding
        return { shouldWait: true, waitTime: waitInfo.waitTime };
      }

      // Fire and forget - don't await the response
      // Fetch all warehouses (triggersService.getCoefficients with empty or no parameter gets all)
      triggerService
        .getCoefficients()
        .then((warehouses) => {
          // Filter only valid warehouses and update cache
          const validWarehouses = warehouses.filter(
            (warehouse) =>
              warehouse?.boxTypeID &&
              warehouse.allowUnload === true &&
              warehouse.coefficient >= 0
          );
          this.updateCache(validWarehouses);
        })
        .catch((error) => {
          const errorMessage = error?.message || '';
          logger.error('Error fetching free API warehouses:', errorMessage);
          
          // Handle database recovery errors silently - they're expected during maintenance
          if (this.isDatabaseRecoveryError(errorMessage)) {
            logger.info('Free API temporarily unavailable due to database recovery');
            return;
          }
        });

      // Return null to indicate we proceeded with the fetch
      return null;
    } catch (error) {
      logger.error('Error in fetchWarehousesNonBlocking:', error);
      return null;
    }
  }

  /**
   * Checks if cache is fresh (updated within last 5 seconds)
   */
  private isCacheFresh(): boolean {
    return Date.now() - this.lastUpdateTimestamp <= this.CACHE_FRESHNESS_MS;
  }

  /**
   * Gets cached warehouses filtered by requested IDs
   * Only returns data if cache was updated within last 5 seconds
   */
  getCachedWarehouses(warehouseIds: number[]): Supply[] {
    if (this.cachedWarehouses.length === 0 || !this.isCacheFresh()) {
      return [];
    }

    // Filter warehouses by requested IDs
    return this.cachedWarehouses.filter((warehouse) =>
      warehouseIds.includes(warehouse.warehouseID)
    );
  }

  /**
   * Gets all cached warehouses
   * Only returns data if cache was updated within last 5 seconds
   */
  getAllCachedWarehouses(): Supply[] {
    if (!this.isCacheFresh()) {
      return [];
    }
    return this.cachedWarehouses;
  }

  /**
   * Updates the cache with new warehouse data
   */
  private updateCache(warehouses: Supply[]): void {
    this.cachedWarehouses = warehouses;
    this.lastUpdateTimestamp = Date.now();

    // logger.info(`Updated warehouse cache with ${warehouses.length} warehouses`)
  }

  /**
   * Gets optimal interval for requests
   */
  getOptimalInterval(): number {
    return apiKeyRateLimiterService.getOptimalInterval();
  }

  /**
   * Checks if error is a database recovery error (temporary)
   */
  private isDatabaseRecoveryError(errorMessage: string): boolean {
    const recoveryErrors = [
      'FATAL: terminating connection due to conflict with recovery',
      'SQLSTATE 40001',
      'get supplier darkstore office error',
    ];

    return recoveryErrors.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Gets cache status information
   */
  getCacheInfo(): {
    warehouseCount: number;
    lastUpdate: number;
    isEmpty: boolean;
    isFresh: boolean;
    ageMs: number;
    optimalInterval: number;
  } {
    const ageMs = Date.now() - this.lastUpdateTimestamp;
    return {
      warehouseCount: this.cachedWarehouses.length,
      lastUpdate: this.lastUpdateTimestamp,
      isEmpty: this.cachedWarehouses.length === 0,
      isFresh: this.isCacheFresh(),
      ageMs,
      optimalInterval: this.getOptimalInterval(),
    };
  }
}

// Export singleton instance
export const freeWarehouseService = FreeWarehouseService.getInstance();
