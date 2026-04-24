/**
 * WB Refactored API - Main Entry Point
 *
 * This is the Express.js API server that replaces the Nuxt 3 server-side code.
 * It provides the same business logic with a clean architecture:
 * - Routes (Controllers) → Services → Prisma → Database
 */

import { startServer } from '@/app';
import { setupTelegramPlugin } from '@/plugins/telegram.plugin';
import { setupTriggerDateUpdatePlugin } from '@/plugins/trigger-date-update.plugin';
import { setupFeedbackAutoPlugin } from '@/plugins/feedback-auto.plugin';
import { logger } from '@/utils/logger';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Do not exit — log and keep running so one bad promise doesn't kill the whole app
});

// Setup Telegram bot plugin
setupTelegramPlugin();

// Setup Trigger Date Update plugin (migrated from deprecated project)
// Handles: dynamic interval monitoring, warehouse fetching, midnight trigger cleanup
setupTriggerDateUpdatePlugin();

// Setup Feedback Auto-Answer plugin
// Handles: periodic AI-powered feedback answering
setupFeedbackAutoPlugin();

// Start the server
startServer();
