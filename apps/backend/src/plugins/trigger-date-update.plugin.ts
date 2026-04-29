/**
 * Trigger Date Update Plugin
 * Migrated from deprecated project: /Users/muhammad/Documents/wb/server/plugins/triggerDateUpdate.ts
 *
 * Purpose: Sets up dynamic interval monitoring and warehouse fetching
 * - Fetches warehouses from free API and close API non-blocking
 * - Runs warehouse monitoring with optimal intervals based on API key availability
 * - Integrates with existing monitoring cleanup cron jobs
 */

import { scheduleJob } from 'node-schedule';
import { triggerDateManagerService } from '@/services/monitoring/trigger-date-manager.service';
import { warehouseMonitoringV2Service } from '@/services/monitoring/warehouse-monitoring-v2.service';
import { freeWarehouseService } from '@/services/external/wb/free-warehouse.service';
import { closeApiService } from '@/services/external/wb/close-api.service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TriggerDateUpdate');

// Processing state flags to prevent concurrent executions
let isCleaning = false;
let isMonitoring = false;

// Dynamic interval state
let currentInterval: NodeJS.Timeout | null = null;
let currentIntervalMs = 1000;

/**
 * Schedule the midnight trigger cleanup job (00:18 Moscow time = 21:18 UTC)
 * This complements the monitoring-cleanup.ts cron job
 */
function scheduleTriggerCleanupJob(): void {
  // Check if disabled via environment variable (similar to deprecated project)
  const isDisabled = process.env.RUN_AUTOB_DATE_UPDATE === 'false';

  if (isDisabled) {
    logger.info(
      'RUN_AUTOB_DATE_UPDATE is false, skipping trigger date update job',
    );
    return;
  }

  logger.debug(
    'Scheduling trigger cleanup job at 00:18 Moscow time (21:18 UTC)',
  );

  // Schedule job to run at 00:18 Moscow time (21:18 UTC)
  // Note: This complements the job in monitoring-cleanup.ts, but keeps the same time as deprecated project
  const job = scheduleJob('18 21 * * *', async () => {
    if (isCleaning) {
      logger.warn('Cleanup already in progress, skipping...');
      return;
    }

    isCleaning = true;
    logger.debug('Running midnight (Moscow time) trigger date update...');

    try {
      await triggerDateManagerService.cleanAllTriggers();
      logger.debug('Trigger cleanup completed - processed all triggers');
    } catch (error) {
      logger.error('Error in midnight trigger update:', error);
    } finally {
      isCleaning = false;
    }
  });

  // Clean up on process termination
  process.on('SIGINT', () => {
    job.cancel();
  });
  process.on('SIGTERM', () => {
    job.cancel();
  });
}

/**
 * Schedule the dynamic interval monitoring loop
 * This is the core monitoring flow from the deprecated project
 */
function scheduleDynamicMonitoring(): void {
  logger.debug('Starting dynamic interval monitoring...');

  const scheduleNextMonitoring = () => {
    // Clear any existing timeout
    if (currentInterval) {
      clearTimeout(currentInterval);
    }

    currentInterval = setTimeout(async () => {
      // Fetch warehouses non-blocking (fire and forget)
      // These update internal caches that monitoring services use
      freeWarehouseService.fetchWarehousesNonBlocking();
      closeApiService.fetchCloseApiDataNonBlocking();

      // Skip monitoring if cleanup is in progress
      if (isCleaning || isMonitoring) {
        // Calculate interval for next cycle based on API key availability
        currentIntervalMs = freeWarehouseService.getOptimalInterval();
        scheduleNextMonitoring();
        return;
      }

      // Proceed with monitoring
      isMonitoring = true;
      try {
        await warehouseMonitoringV2Service.monitorWarehouses();

        // Calculate optimal interval for next request based on number of API keys
        currentIntervalMs = freeWarehouseService.getOptimalInterval();
        // Routine monitoring cycle - debug only
      } catch (error) {
        logger.error('Error in warehouse monitoring:', error);
        // On error, use a longer interval to prevent hammering
        currentIntervalMs = 5000;
      } finally {
        isMonitoring = false;
        scheduleNextMonitoring();
      }
    }, currentIntervalMs);
  };

  // Start the monitoring loop
  scheduleNextMonitoring();

  // Log initial status (debug only)
  const cacheInfo = freeWarehouseService.getCacheInfo();
  logger.debug(
    `Monitoring started with interval: ${currentIntervalMs}ms, warehouses: ${cacheInfo.warehouseCount}`,
  );
}

/**
 * Setup function to initialize the trigger date update plugin
 * Called once during server startup from main.ts
 */
export function setupTriggerDateUpdatePlugin(): void {
  logger.debug('Setting up trigger date update plugin...');

  // 1. Schedule the midnight cleanup job (from deprecated plugin)
  scheduleTriggerCleanupJob();

  // 2. Start the dynamic interval monitoring loop (from deprecated plugin)
  scheduleDynamicMonitoring();

  // 3. Setup cleanup handlers for graceful shutdown
  setupCleanupHandlers();

  logger.debug('Setup complete');
}

/**
 * Setup cleanup handlers for graceful shutdown
 */
function setupCleanupHandlers(): void {
  const cleanup = () => {
    logger.debug('Cleaning up...');

    if (currentInterval) {
      clearTimeout(currentInterval);
      currentInterval = null;
    }

    // Reset flags
    isCleaning = false;
    isMonitoring = false;
  };

  // Handle graceful shutdown
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

/**
 * Get current monitoring status (for health checks or debugging)
 */
export function getMonitoringStatus(): {
  isCleaning: boolean;
  isMonitoring: boolean;
  currentIntervalMs: number;
  freeWarehouseCache: ReturnType<typeof freeWarehouseService.getCacheInfo>;
  closeApiCache: ReturnType<typeof closeApiService.getCacheInfo>;
} {
  return {
    isCleaning,
    isMonitoring,
    currentIntervalMs,
    freeWarehouseCache: freeWarehouseService.getCacheInfo(),
    closeApiCache: closeApiService.getCacheInfo(),
  };
}
