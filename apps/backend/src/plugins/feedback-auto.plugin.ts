/**
 * Feedback Auto-Answer Plugin
 * Schedules periodic auto-answering of WB feedbacks via AI
 * Scoped per user + supplier
 */

import { scheduleJob } from 'node-schedule';
import { feedbackReviewService } from '@/services/domain/feedback/feedback-review.service';
import { prisma } from '@/config/database';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FeedbackAuto');

// Processing state flag to prevent concurrent executions
let isProcessing = false;

/**
 * Schedule the feedback auto-answer job
 * Runs every hour by default
 */
function scheduleFeedbackAutoAnswerJob(): void {
  const isDisabled = process.env.RUN_FEEDBACK_AUTO === 'false';

  if (isDisabled) {
    logger.info('RUN_FEEDBACK_AUTO is false, skipping feedback auto-answer job');
    return;
  }

  // Run every hour at minute 0
  logger.info('Scheduling feedback auto-answer job (hourly at :00)');

  const job = scheduleJob('0 * * * *', async () => {
    if (isProcessing) {
      logger.warn('Feedback auto-answer already in progress, skipping...');
      return;
    }

    isProcessing = true;
    logger.info('Running feedback auto-answer cycle...');

    try {
      // Find all user+supplier combinations with auto-answer enabled
      const enabledSettings = await prisma.feedbackSettings.findMany({
        where: { autoAnswerEnabled: true },
        select: { userId: true, supplierId: true },
      });

      logger.info(`Found ${enabledSettings.length} user+supplier combinations with auto-answer enabled`);

      for (const setting of enabledSettings) {
        try {
          const result = await feedbackReviewService.processUnansweredFeedbacks(
            setting.userId,
            setting.supplierId,
          );

          logger.info(
            `User ${setting.userId}, Supplier ${setting.supplierId}: processed=${result.processed}, posted=${result.posted}, skipped=${result.skipped}, failed=${result.failed}`,
          );
        } catch (error) {
          logger.error(`Error processing feedbacks for user ${setting.userId}, supplier ${setting.supplierId}:`, error);
        }
      }

      logger.info('Feedback auto-answer cycle completed');
    } catch (error) {
      logger.error('Error in feedback auto-answer cycle:', error);
    } finally {
      isProcessing = false;
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
 * Setup function to initialize the feedback auto-answer plugin
 */
export function setupFeedbackAutoPlugin(): void {
  logger.info('Setting up feedback auto-answer plugin...');
  scheduleFeedbackAutoAnswerJob();
  logger.info('Feedback auto-answer plugin setup complete');
}

/**
 * Get current processing status
 */
export function getFeedbackAutoStatus(): {
  isProcessing: boolean;
} {
  return { isProcessing };
}
