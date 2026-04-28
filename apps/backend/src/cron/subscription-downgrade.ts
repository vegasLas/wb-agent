/**
 * Subscription Downgrade Cron Job
 * Runs daily to downgrade expired paid users to FREE tier.
 */

import { downgradeExpiredUsers } from '@/services/user/subscription-downgrade.service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SubscriptionDowngradeCron');

/**
 * Run the daily subscription downgrade check.
 * This should be scheduled to run once per day (e.g., at midnight).
 */
export async function runSubscriptionDowngrade(): Promise<void> {
  logger.info('Starting daily subscription downgrade check');
  try {
    const count = await downgradeExpiredUsers();
    logger.info(`Subscription downgrade check completed. Downgraded ${count} users.`);
  } catch (error) {
    logger.error('Subscription downgrade check failed:', error);
  }
}

/**
 * Start the scheduled cron job.
 * In production, this should be called once during app startup.
 */
export function startSubscriptionDowngradeCron(): void {
  // Run immediately on startup (optional)
  // runSubscriptionDowngrade().catch(() => {});

  // Schedule daily at 00:00 UTC
  const intervalMs = 24 * 60 * 60 * 1000; // 24 hours

  // Run at next midnight
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const delay = nextMidnight.getTime() - now.getTime();

  setTimeout(() => {
    runSubscriptionDowngrade();
    // Then run every 24 hours
    setInterval(runSubscriptionDowngrade, intervalMs);
  }, delay);

  logger.info(`Subscription downgrade cron scheduled. First run at ${nextMidnight.toISOString()}`);
}
