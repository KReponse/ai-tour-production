// backend/src/config/logger.js
// ✅ NEW - Centralized Logger Configuration

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// =========================
// ✅ LOG DIRECTORY
// =========================

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// =========================
// ✅ LOG FORMATS
// =========================

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// =========================
// ✅ TRANSPORTS
// =========================

const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  })
);

// File transports (enable in production)
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// =========================
// ✅ CREATE LOGGER
// =========================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'aitour-backend' },
  transports,
  exitOnError: false,
});

// =========================
// ✅ STREAM FOR MORGAN
// =========================

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// =========================
// ✅ HELPER METHODS
// =========================

const log = {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  error: (message, meta = {}) => {
    logger.error(message, meta);
  },
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
  http: (message, meta = {}) => {
    logger.http(message, meta);
  },
  verbose: (message, meta = {}) => {
    logger.verbose(message, meta);
  },
  silly: (message, meta = {}) => {
    logger.silly(message, meta);
  },
};

// =========================
// ✅ EXPORT
// =========================

export default log;
export { logger };