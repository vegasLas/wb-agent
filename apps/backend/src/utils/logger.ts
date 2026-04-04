import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, json, colorize, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create the logger instance
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'wb-api' },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? combine(timestamp(), json())
          : combine(
              colorize(),
              timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              devFormat,
            ),
    }),
  ],
});

// Request logging format
export const requestLoggerFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);
