/**
 * Monitoring Cleanup Cron Jobs
 * Phase 8: Date Management - Scheduled cleanup tasks
 *
 * Purpose: Runs scheduled cleanup tasks for autobookings and triggers
 * to archive/expire items that are no longer valid.
 *
 * Schedule: Runs at midnight Moscow time (21:00 UTC)
 */

import { scheduleJob } from 'node-schedule';
import { autobookingDateManagerService } from '../services/monitoring/autobooking-date-manager.service';
import { triggerDateManagerService } from '../services/monitoring/trigger-date-manager.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('MonitoringCleanup');
import { env } from '../config/env';

// Flag to prevent concurrent executions
let isCleaning = false;

/**
 * Initialize monitoring cleanup cron jobs
 * Called once during server startup
 */
export function initializeMonitoringCleanupJobs(): void {
  // Check if cleanup is disabled via environment variable
  const isCleanupEnabled = env.RUN_MONITORING_CLEANUP !== 'false';

  if (!isCleanupEnabled) {
    logger.info(
      'RUN_MONITORING_CLEANUP is false, skipping cleanup jobs',
    );
    return;
  }

  logger.info('Initializing monitoring cleanup cron jobs');

  // Schedule job to run at midnight Moscow time (21:00 UTC)
  // This archives expired autobookings
  scheduleJob('00 21 * * *', async () => {
    if (isCleaning) {
      logger.warn(
        'Cleanup already in progress, skipping...',
      );
      return;
    }

    isCleaning = true;
    logger.info(
      'Running midnight (Moscow time) autobooking cleanup...',
    );

    try {
      await autobookingDateManagerService.cleanAllAutobookings();
      logger.info('Autobooking cleanup completed');
    } catch (error) {
      logger.error('Error in autobooking cleanup:', error);
    } finally {
      isCleaning = false;
    }
  });

  // Schedule trigger cleanup at 00:18 Moscow time (21:18 UTC)
  // This expires triggers that are no longer valid
  scheduleJob('18 21 * * *', async () => {
    if (isCleaning) {
      logger.warn(
        'Cleanup already in progress, skipping...',
      );
      return;
    }

    isCleaning = true;
    logger.info(
      'Running midnight (Moscow time) trigger cleanup...',
    );

    try {
      await triggerDateManagerService.cleanAllTriggers();
      logger.info('Trigger cleanup completed');
    } catch (error) {
      logger.error('Error in trigger cleanup:', error);
    } finally {
      isCleaning = false;
    }
  });

  logger.info(
    'Scheduled jobs: Autobooking cleanup at 00:00 MSK, Trigger cleanup at 00:18 MSK',
  );

  // Also run once at startup to clean any items that might have expired while the server was down
  // Use setTimeout to allow server to fully start before running cleanup
  setTimeout(async () => {
    logger.info('Running initial cleanup at startup...');
    try {
      await autobookingDateManagerService.cleanAllAutobookings();
      await triggerDateManagerService.cleanAllTriggers();
      logger.info('Initial cleanup completed');
    } catch (error) {
      logger.error('Error during initial cleanup:', error);
    }
  }, 5000); // Wait 5 seconds after startup
}

/**
 * Run cleanup manually (for testing or admin purposes)
 */
export async function runManualCleanup(): Promise<{
  autobookings: number;
  triggers: number;
}> {
  logger.info('Running manual cleanup...');

  try {
    await autobookingDateManagerService.cleanAllAutobookings();
    await triggerDateManagerService.cleanAllTriggers();

    logger.info('Manual cleanup completed');
    return { autobookings: 0, triggers: 0 };
  } catch (error) {
    logger.error('Error during manual cleanup:', error);
    throw error;
  }
}
