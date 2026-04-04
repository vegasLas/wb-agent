/**
 * Warehouse Data Cache Service
 * Migrated from deprecated project server/services/monitoring/warehouseDataCache.service.ts
 * Handles caching and validation of warehouse data with blacklist support
 */

import { Supply } from '../../types/wb';
import { AcceptanceCoefficientsResponse, AcceptanceType } from '../../types/wb';

interface CachedWarehouseData {
  warehouseID: number;
  date: string;
  coefficient: number;
  allowUnload: boolean;
  acceptanceType: AcceptanceType;
  lastUpdated: Date;
}

interface BlacklistedWarehouse {
  warehouseId: number;
  boxTypeId: number;
  lastUpdated: Date;
}

export class WarehouseDataCacheService {
  private closeApiCache = new Map<string, CachedWarehouseData>();
  private blacklistedWarehouses = new Map<string, BlacklistedWarehouse>();
  private lastCacheCleanup: Date = new Date();
  private readonly CACHE_CLEANUP_INTERVAL = 20 * 60 * 1000; // 20 minutes
  private readonly CACHE_ENTRY_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BLACKLIST_TTL = 10 * 60 * 1000; // 10 minutes

  private generateCacheKey(
    warehouseId: number,
    date: string,
    boxTypeId: number,
  ): string {
    return `${warehouseId}-${date}-${boxTypeId}`;
  }

  private generateBlacklistKey(warehouseId: number, boxTypeId: number): string {
    return `${warehouseId}-${boxTypeId}`;
  }

  private isCacheValid(cachedData: CachedWarehouseData): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - new Date(cachedData.lastUpdated).getTime();
    return cacheAge < this.CACHE_ENTRY_TTL;
  }

  private isBlacklistValid(
    blacklistedWarehouse: BlacklistedWarehouse,
  ): boolean {
    const now = new Date();
    const age =
      now.getTime() - new Date(blacklistedWarehouse.lastUpdated).getTime();
    return age < this.BLACKLIST_TTL;
  }

  private shouldCleanCache(): boolean {
    const now = new Date();
    return (
      now.getTime() - this.lastCacheCleanup.getTime() >=
      this.CACHE_CLEANUP_INTERVAL
    );
  }

  clearStaleCache(): void {
    if (!this.shouldCleanCache()) return;

    const now = new Date();

    // Clear stale cache entries
    this.closeApiCache.clear();

    // Clear expired blacklist entries
    for (const [key, value] of this.blacklistedWarehouses.entries()) {
      if (!this.isBlacklistValid(value)) {
        this.blacklistedWarehouses.delete(key);
      }
    }

    this.lastCacheCleanup = now;
  }

  isWarehouseBlacklisted(warehouseId: number, boxTypeId: number): boolean {
    const key = this.generateBlacklistKey(warehouseId, boxTypeId);
    const blacklistedWarehouse = this.blacklistedWarehouses.get(key);
    return (
      blacklistedWarehouse !== undefined &&
      this.isBlacklistValid(blacklistedWarehouse)
    );
  }

  blacklistWarehouse(warehouseId: number, boxTypeId: number): void {
    const key = this.generateBlacklistKey(warehouseId, boxTypeId);
    this.blacklistedWarehouses.set(key, {
      warehouseId,
      boxTypeId,
      lastUpdated: new Date(),
    });
  }

  getCachedData(
    warehouseId: number,
    date: string,
    boxTypeId: number | undefined,
  ): CachedWarehouseData | null {
    if (!boxTypeId) return null;

    const key = this.generateCacheKey(warehouseId, date, boxTypeId);
    const cachedData = this.closeApiCache.get(key);

    if (!cachedData || !this.isCacheValid(cachedData)) {
      return null;
    }

    return cachedData;
  }

  updateCache(
    closeApiData: AcceptanceCoefficientsResponse['result']['report'],
  ): void {
    const now = new Date();

    closeApiData.forEach((warehouse) => {
      const boxTypeIds =
        warehouse.acceptanceType === AcceptanceType.box
          ? [2]
          : warehouse.acceptanceType === AcceptanceType.pallet
            ? [5]
            : [6];

      boxTypeIds.forEach((boxTypeId) => {
        const key = this.generateCacheKey(
          warehouse.warehouseID,
          warehouse.date,
          boxTypeId,
        );
        this.closeApiCache.set(key, {
          ...warehouse,
          lastUpdated: now,
        });
      });
    });
  }

  needsCloseApiCheck(freeApiWarehouses: Supply[]): boolean {
    const freeDatesCount = new Map<number, number>();

    freeApiWarehouses.forEach((warehouse) => {
      if (warehouse.allowUnload === true && warehouse.coefficient === 0) {
        const currentCount = freeDatesCount.get(warehouse.warehouseID) || 0;
        freeDatesCount.set(warehouse.warehouseID, currentCount + 1);
      }
    });

    return Array.from(freeDatesCount.values()).some((count) => count > 5);
  }

  hasNewDates(freeApiWarehouses: Supply[]): boolean {
    // Only check non-blacklisted warehouses
    const validWarehouses = freeApiWarehouses.filter(
      (warehouse) =>
        warehouse.boxTypeID &&
        !this.isWarehouseBlacklisted(
          warehouse.warehouseID,
          warehouse.boxTypeID,
        ),
    );

    // If all warehouses are blacklisted, no need to check
    if (validWarehouses.length === 0) return false;

    // Check if any valid warehouse has new dates
    return validWarehouses.some((warehouse) => {
      if (!warehouse.boxTypeID) return false;
      const cachedData = this.getCachedData(
        warehouse.warehouseID,
        warehouse.date,
        warehouse.boxTypeID,
      );
      return !cachedData;
    });
  }

  validateWarehouse(
    freeWarehouse: Supply,
    closeApiData: CachedWarehouseData | null,
  ): boolean {
    if (!closeApiData || !freeWarehouse.boxTypeID) return false;

    // Don't validate blacklisted warehouses
    if (
      this.isWarehouseBlacklisted(
        freeWarehouse.warehouseID,
        freeWarehouse.boxTypeID,
      )
    ) {
      return false;
    }

    const supplyAcceptanceType =
      freeWarehouse.boxTypeID === 2
        ? AcceptanceType.box
        : freeWarehouse.boxTypeID === 5
          ? AcceptanceType.pallet
          : AcceptanceType.supersafe;

    const isSameDate =
      new Date(freeWarehouse.date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) ===
      new Date(closeApiData.date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

    const isValid =
      closeApiData.warehouseID === freeWarehouse.warehouseID &&
      closeApiData.coefficient >= 0 &&
      closeApiData.allowUnload === true &&
      closeApiData.acceptanceType === supplyAcceptanceType &&
      isSameDate;

    // If validation fails, blacklist this warehouse+boxType combination
    if (!isValid) {
      logger.info(
        'blacklisting warehouse',
        freeWarehouse.warehouseID,
        freeWarehouse.boxTypeID,
      );
      this.blacklistWarehouse(
        freeWarehouse.warehouseID,
        freeWarehouse.boxTypeID,
      );
    }

    return isValid;
  }
}

// Import logger at the end to avoid circular dependencies
import { logger } from '../../utils/logger';

export const warehouseDataCacheService = new WarehouseDataCacheService();
