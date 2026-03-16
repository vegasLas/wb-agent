/**
 * Fake Data Detection Service
 * Migrated from deprecated project server/services/monitoring/fakeDataDetection.service.ts
 * Detects fake warehouse patterns based on BOX counts
 */

import { Supply } from '../../types/wb';
import { logger } from '../../utils/logger';

// Problematic warehouse IDs that should be monitored
const PROBLEMATIC_WAREHOUSE_IDS = [
  507, 120762, 130744, 208277, 206348, 117501, 301760, 117986, 301983, 130744,
];

// BOX count detection constants
const BOX_TYPE_ID = 2; // BOX supply type ID
const BOX_COUNT_THRESHOLD = 8; // If warehouse has 8+ BOX entries
const WAREHOUSE_BOX_THRESHOLD = 3; // If 3+ warehouses have BOX count >= 8

interface WarehouseLogEntry {
  count: number;
  lastLogTime: number;
}

interface WarehouseCount {
  warehouseId: number;
  boxTypeId: number;
  count: number;
}

export class FakeDataDetectionService {
  private loggedWarehouses: Map<string, WarehouseLogEntry> = new Map();
  private readonly WAREHOUSE_LOG_LIMIT = 3; // Max times to log same warehouse
  private readonly WAREHOUSE_LOG_COOLDOWN_MS = 360 * 60 * 1000; // 6 hours cooldown

  /**
   * Filters and logs warehouses that passed all checks - can be used anywhere
   */
  public filterAndLogPassedWarehouses(warehouses: Supply[]): Supply[] {
    const now = Date.now();

    // Filter warehouses with coefficient !== 0
    const filteredWarehouses = warehouses.filter((w) => w.coefficient !== 0);

    const warehousesToLog = this.getWarehousesToLog(filteredWarehouses, now);

    // Log filtered warehouses
    this.logPassedWarehouses(warehousesToLog);

    return warehousesToLog;
  }

  /**
   * Filters warehouses that should be logged based on logging rules
   */
  private getWarehousesToLog(warehouses: Supply[], now: number): Supply[] {
    return warehouses.filter((warehouse) => {
      const warehouseKey = `${warehouse.warehouseID}-${warehouse.date.split('T')[0]}-${warehouse.boxTypeID}-${warehouse.coefficient}`;
      return this.shouldLogWarehouse(warehouseKey, now);
    });
  }

  /**
   * Logs warehouses that passed all filters
   */
  private logPassedWarehouses(warehouses: Supply[]): void {
    if (warehouses.length > 0) {
      logger.info('✅ Warehouses that passed:');
      warehouses.forEach((warehouse, index) => {
        const date = warehouse.date.split('T')[0];
        const boxType =
          warehouse.boxTypeName || `BoxType-${warehouse.boxTypeID}`;
        logger.info(
          `  ${index + 1}. ID: ${warehouse.warehouseID} | Name: ${warehouse.warehouseName} | Date: ${date} | Coefficient: ${warehouse.coefficient} | BoxType: ${boxType}`
        );
      });
    }
  }

  /**
   * Checks if a warehouse should be logged and updates tracking counters
   */
  private shouldLogWarehouse(warehouseKey: string, now: number): boolean {
    const logEntry = this.loggedWarehouses.get(warehouseKey);

    if (!logEntry) {
      // First time seeing this warehouse - log it
      this.loggedWarehouses.set(warehouseKey, { count: 1, lastLogTime: now });
      return true;
    }

    if (logEntry.count < this.WAREHOUSE_LOG_LIMIT) {
      // Haven't hit limit yet - log it
      this.loggedWarehouses.set(warehouseKey, {
        count: logEntry.count + 1,
        lastLogTime: now,
      });
      return true;
    }

    // Check if cooldown period has passed
    const timeSinceLastLog = now - logEntry.lastLogTime;
    if (timeSinceLastLog >= this.WAREHOUSE_LOG_COOLDOWN_MS) {
      // Cooldown expired - reset counter and log
      this.loggedWarehouses.set(warehouseKey, { count: 1, lastLogTime: now });
      return true;
    }

    // Still in cooldown - don't log
    return false;
  }

  /**
   * Collects warehouse counts by warehouseId and boxTypeId
   * Returns counts in format: warehouseId-boxType: count
   */
  private collectWarehouseCounts(warehouses: Supply[]): WarehouseCount[] {
    const warehouseCountMap = new Map<string, number>();

    // Count warehouses by warehouseId-boxTypeId combination
    // Only count problematic warehouses
    warehouses.forEach((warehouse) => {
      if (
        warehouse.coefficient !== 0 &&
        PROBLEMATIC_WAREHOUSE_IDS.includes(warehouse.warehouseID)
      ) {
        const key = `${warehouse.warehouseID}-${warehouse.boxTypeID}`;
        const currentCount = warehouseCountMap.get(key) || 0;
        warehouseCountMap.set(key, currentCount + 1);
      }
    });

    // Convert to WarehouseCount array
    return Array.from(warehouseCountMap.entries()).map(([key, count]) => {
      const [warehouseId, boxTypeId] = key.split('-').map(Number);
      return {
        warehouseId,
        boxTypeId,
        count,
      };
    });
  }

  /**
   * Checks if too many problematic warehouses have high BOX counts simultaneously
   */
  private checkBoxCountThreshold(
    warehouseCounts: WarehouseCount[],
    originalWarehouses?: Supply[]
  ): {
    shouldSkip: boolean;
    reason?: string;
    details?: Record<string, unknown>;
  } {
    // Log checker details if counter allows
    // if (this.counter > 0) {
    //   this.logCheckerDetails(originalWarehouses)
    //   this.counter--
    // }

    // Filter for problematic BOX type (boxTypeId = 2) warehouses with count >= 8
    const highBoxCountWarehouses = warehouseCounts.filter(
      (wc) => wc.boxTypeId === BOX_TYPE_ID && wc.count >= BOX_COUNT_THRESHOLD
    );

    // If warehouse 206236 has BOX count >= 8, skip processing
    if (highBoxCountWarehouses.some((wc) => wc.warehouseId === 206236)) {
      return {
        shouldSkip: true,
        reason: `Found ${highBoxCountWarehouses.length} warehouses with BOX count >= ${BOX_COUNT_THRESHOLD}`,
        details: {
          boxCountWarehouseCount: highBoxCountWarehouses.length,
          threshold: WAREHOUSE_BOX_THRESHOLD,
          warehouses: highBoxCountWarehouses.map((wc) => ({
            warehouseId: wc.warehouseId,
            boxCount: wc.count,
          })),
        },
      };
    }

    return { shouldSkip: false };
  }

  /**
   * Checks if warehouses contain problematic patterns that should be filtered
   * Called from fetchAllWarehouses to detect problematic warehouse combinations
   */
  checkProblematicWarehouses(warehouses: Supply[]): {
    shouldSkip: boolean;
    reason?: string;
    details?: Record<string, unknown>;
  } {
    if (warehouses.length === 0) {
      return { shouldSkip: false };
    }

    // Filter warehouses with coefficient !== 0 for analysis
    const warehousesWithCoeff = warehouses.filter((w) => w.coefficient !== 0);

    if (warehousesWithCoeff.length === 0) {
      return { shouldSkip: false };
    }

    // Check for BOX count threshold
    const warehouseCounts = this.collectWarehouseCounts(warehousesWithCoeff);
    return this.checkBoxCountThreshold(warehouseCounts, warehousesWithCoeff);
  }
}

export const fakeDataDetectionService = new FakeDataDetectionService();
