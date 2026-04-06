import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, colorize, printf } = winston.format;

// Color scheme for different log levels
const levelColors = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[36m', // cyan
  debug: '\x1b[35m', // magenta
};

const resetColor = '\x1b[0m';

// Extract just the service/class name without brackets for cleaner output
const cleanLabel = (label: string | undefined): string => {
  if (!label) return '';
  return label.replace(/[[\]]/g, '');
};

// Custom format for console output with colors
const consoleFormat = printf(
  ({ level, message, timestamp, label, service, ...metadata }) => {
    const color = levelColors[level as keyof typeof levelColors] || '';
    const context =
      cleanLabel(label as string) || cleanLabel(service as string) || 'app';
    let msg = `${timestamp} ${color}[${level.toUpperCase()}]${resetColor} [${context}]: ${message}`;

    // Only include metadata if there are meaningful fields
    const metaKeys = Object.keys(metadata).filter(
      (key) => key !== 'service' && key !== 'timestamp' && key !== 'label',
    );

    if (metaKeys.length > 0) {
      const meta = metaKeys.reduce(
        (acc, key) => {
          acc[key] = metadata[key];
          return acc;
        },
        {} as Record<string, unknown>,
      );
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  },
);

// Simple format for production (no JSON)
const simpleFormat = printf(({ level, message, timestamp, label, service }) => {
  const context =
    cleanLabel(label as string) || cleanLabel(service as string) || 'app';
  return `${timestamp} [${level.toUpperCase()}] [${context}]: ${message}`;
});

// Base logger instance
const baseLogger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'wb-api' },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? combine(timestamp({ format: 'DD-MM HH:mm' }), simpleFormat)
          : combine(
              colorize({ all: true }),
              timestamp({ format: 'DD-MM HH:mm' }),
              consoleFormat,
            ),
    }),
  ],
});

/**
 * Create a child logger with a specific label (class/service name)
 * Usage: const logger = createLogger('WarehouseMonitoringV2');
 * Output: 2026-04-06 10:19:03 [INFO] [WarehouseMonitoringV2]: message
 */
export function createLogger(label: string): winston.Logger {
  return baseLogger.child({ label });
}

// Default logger instance (for backward compatibility)
export const logger = baseLogger;

// Request logging format (for HTTP requests)
export const requestLoggerFormat = combine(
  timestamp({ format: 'DD-MM HH:mm' }),
  printf(
    ({
      level,
      message,
      timestamp,
      label,
      service,
      method,
      url,
      statusCode,
      duration,
    }) => {
      const context =
        cleanLabel(label as string) || cleanLabel(service as string) || 'app';
      let msg = `${timestamp} [${level.toUpperCase()}] [${context}]: ${message}`;
      if (method && url) {
        msg += ` | ${method} ${url}`;
        if (statusCode) msg += ` ${statusCode}`;
        if (duration) msg += ` (${duration}ms)`;
      }
      return msg;
    },
  ),
);
