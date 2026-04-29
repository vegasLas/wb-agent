import winston from 'winston';
import { env } from '@/config/env';

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

// Convert any value to a log-safe string
const toLogString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

// Check if a value is a plain metadata object (not Error, Array, or primitive)
const isPlainMeta = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  if (value instanceof Error) return false;
  if (Array.isArray(value)) return false;
  return true;
};

// Custom format for console output with colors
const consoleFormat = printf(
  ({ level, message, timestamp, label, service, ...metadata }) => {
    const color = levelColors[level as keyof typeof levelColors] || '';
    const context =
      cleanLabel(label as string) || cleanLabel(service as string) || 'app';
    let msg = `${timestamp} ${color}[${level.toUpperCase()}]${resetColor} [${context}]: ${message}`;

    // Build meta object, preserving Error properties (Error props are non-enumerable)
    const meta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (key === 'service' || key === 'timestamp' || key === 'label') continue;
      if (value instanceof Error) {
        meta[key] = {
          message: value.message,
          stack: value.stack,
          name: value.name,
        };
      } else {
        meta[key] = value;
      }
    }

    if (Object.keys(meta).length > 0) {
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

// Log level methods that should support multiple arguments
type LogMethod = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'verbose' | 'silly';
const LOG_METHODS: LogMethod[] = ['log', 'info', 'warn', 'error', 'debug', 'verbose', 'silly'];

// Wrap a winston logger to support console.log-style multiple arguments:
// logger.info('msg')                       -> OK
// logger.info('msg', 'extra')              -> message: 'msg extra'
// logger.info('msg', 'a', 'b')             -> message: 'msg a b'
// logger.info('msg', { key: 'val' })       -> message: 'msg', meta: { key: 'val' }
// logger.info('msg', 'a', { key: 'val' })  -> message: 'msg a', meta: { key: 'val' }
// logger.error('msg', err)                 -> winston handles natively
function wrapLogger<T extends winston.Logger>(instance: T): T {
  const wrapped = {} as T;

  for (const method of LOG_METHODS) {
    const original = (instance as Record<string, unknown>)[method] as (
      ...args: unknown[]
    ) => void;
    (wrapped as Record<string, unknown>)[method] = (...args: unknown[]) => {
      if (args.length <= 1) {
        return original.apply(instance, args);
      }

      const lastArg = args[args.length - 1];
      if (lastArg instanceof Error) {
        // Let winston handle Errors natively so it preserves the stack trace
        const message = args
          .slice(0, -1)
          .map(toLogString)
          .join(' ');
        return original.call(instance, message, lastArg);
      }
      if (isPlainMeta(lastArg)) {
        const message = args
          .slice(0, -1)
          .map(toLogString)
          .join(' ');
        return original.call(instance, message, lastArg);
      }

      const message = args.map(toLogString).join(' ');
      return original.call(instance, message);
    };
  }

  // Proxy everything else (add, remove, child, level, etc.)
  return new Proxy(wrapped, {
    get(_target, prop) {
      if (LOG_METHODS.includes(prop as LogMethod)) {
        return (wrapped as Record<string, unknown>)[prop as string];
      }
      return (instance as Record<string, unknown>)[prop as string];
    },
  }) as T;
}

/**
 * Create a child logger with a specific label (class/service name)
 * Usage: const logger = createLogger('WarehouseMonitoringV2');
 * Output: 2026-04-06 10:19:03 [INFO] [WarehouseMonitoringV2]: message
 */
export function createLogger(label: string): winston.Logger {
  return wrapLogger(baseLogger.child({ label }));
}

// Default logger instance (for backward compatibility)
export const logger = wrapLogger(baseLogger);

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
