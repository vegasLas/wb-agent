import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTimeMs: number;
      message?: string;
    };
    memory: {
      status: 'up' | 'down';
      usedMb: number;
      totalMb: number;
      usagePercent: number;
      message?: string;
    };
    disk?: {
      status: 'up' | 'down';
      message?: string;
    };
  };
}

/**
 * Basic health check endpoint
 * Returns minimal data for load balancer health checks
 */
export async function basicHealthCheck(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
}

/**
 * Detailed health check endpoint
 * Returns comprehensive system status for monitoring dashboards
 */
export async function detailedHealthCheck(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const health: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime(),
    checks: {
      database: { status: 'down', responseTimeMs: 0 },
      memory: { status: 'up', usedMb: 0, totalMb: 0, usagePercent: 0 },
    },
  };

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'up',
      responseTimeMs: Date.now() - dbStart,
    };
  } catch (error) {
    health.checks.database = {
      status: 'down',
      responseTimeMs: Date.now() - startTime,
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
    health.status = 'unhealthy';
    logger.error('Health check: Database connection failed', { error });
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const usedMb = Math.round(memUsage.heapUsed / 1024 / 1024);
  const totalMb = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercent = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0;

  health.checks.memory = {
    status: 'up',
    usedMb,
    totalMb,
    usagePercent,
  };

  // Warn if memory usage is high (>85%)
  if (usagePercent > 85) {
    health.checks.memory.message = `High memory usage: ${usagePercent}%`;
    if (health.status === 'healthy') {
      health.status = 'degraded';
    }
  }

  // Response status based on health
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    success: health.status !== 'unhealthy',
    data: health,
  });
}

/**
 * Readiness probe endpoint
 * Returns 200 when the application is ready to accept traffic
 */
export async function readinessCheck(req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      data: {
        ready: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      success: false,
      data: {
        ready: false,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Liveness probe endpoint
 * Returns 200 if the application process is running
 */
export async function livenessCheck(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
}
