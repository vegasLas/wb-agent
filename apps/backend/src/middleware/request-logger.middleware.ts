import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Request logging middleware
 * Logs all incoming requests with their duration
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Store original end function
  const originalEnd = res.end.bind(res);
  
  // Override end function to log when response is sent
  res.end = function(chunk?: unknown, encoding?: unknown, cb?: unknown): Response {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request warning', logData);
    } else {
      logger.info('Request completed', logData);
    }

    // Call original end function
    return originalEnd(chunk, encoding, cb);
  };

  next();
};
