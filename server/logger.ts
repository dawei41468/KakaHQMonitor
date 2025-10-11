import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { type Request } from 'express';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Create Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'kaka-hq-monitor' },
  transports: [
    // Error log file
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    // Combined log file
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),

    // Console logging
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});

// Audit logger (separate from main logger)
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM',
      maxSize: '50m',
      maxFiles: '24', // Keep 2 years of monthly logs
      zippedArchive: true,
    }),
  ],
});

// Legacy log function for backward compatibility
export function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  logger.log(level, message);
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejections in production
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Utility function to get client IP address
export function getClientIP(req: Request): string {
  // Check for forwarded headers (when behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    // Take the first IP if multiple are present
    return forwarded.split(',')[0].trim();
  }

  // Check for other proxy headers
  const realIP = req.headers['x-real-ip'] as string;
  if (realIP) {
    return realIP;
  }

  // Fall back to connection remote address
  return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
}