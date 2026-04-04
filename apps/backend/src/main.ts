/**
 * WB Refactored API - Main Entry Point
 *
 * This is the Express.js API server that replaces the Nuxt 3 server-side code.
 * It provides the same business logic with a clean architecture:
 * - Routes (Controllers) → Services → Prisma → Database
 */

import { startServer } from './app';
import { setupTelegramPlugin } from './plugins/telegram.plugin';
import { logger } from './utils/logger';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Setup Telegram bot plugin
setupTelegramPlugin();

// Start the server
startServer();
