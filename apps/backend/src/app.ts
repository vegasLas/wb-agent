import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/error.middleware';
import routes from '@/routes';
import {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
} from '@/controllers/health.controller';

/**
 * Create and configure the Express application
 */
export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-init-data'],
    }),
  );

  // Compression middleware (disabled for AI chat to preserve streaming)
  app.use(
    compression({
      filter: (req, res) => {
        if (req.path === '/v1/ai/chat' || req.path.startsWith('/v1/ai/chat/')) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging disabled - only your console.log will show
  // app.use(requestLogger);

  // Health check endpoints
  app.get('/health', basicHealthCheck);
  app.get('/health/detailed', detailedHealthCheck);
  app.get('/health/ready', readinessCheck);
  app.get('/health/live', livenessCheck);

  // API routes
  app.use('/v1', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  const app = createApp();
  const port = parseInt(env.PORT, 10);

  app.listen(port, () => {
    logger.info(`🚀 Server running on port ${port}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${port}/health`);

    // Initialize monitoring cleanup cron jobs
    // initializeMonitoringCleanupJobs();
  });
}
