/**
 * Centralized logging configuration using Pino
 *
 * Features:
 * - Structured JSON logging
 * - Configurable log levels
 * - Pretty printing in development
 * - Performance optimized (minimal overhead)
 */

import pino from 'pino';

// Determine log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configure transport for pretty printing in development
const transport =
  NODE_ENV === 'development'
    ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false
      }
    }
    : undefined;

/**
 * Create logger instance with configuration
 */
export const logger = pino({
  level: LOG_LEVEL,
  transport,
  formatters: {
    level: label => {
      return { level: label.toUpperCase() };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: NODE_ENV
  }
});

/**
 * Create child logger with specific context
 *
 * @param {string} name - Logger name/context
 * @param {Object} bindings - Additional context data
 * @returns {Object} Child logger
 */
export function createLogger(name, bindings = {}) {
  return logger.child({ name, ...bindings });
}

/**
 * Security logger for audit events
 */
export const securityLogger = logger.child({
  name: 'security',
  audit: true
});

/**
 * Performance logger for monitoring
 */
export const perfLogger = logger.child({
  name: 'performance'
});

/**
 * Create logger for specific domain monitor
 *
 * @param {string} domain - Domain name (financial, healthcare, manufacturing)
 * @returns {Object} Domain-specific logger
 */
export function createDomainLogger(domain) {
  return logger.child({
    name: 'drift-monitor',
    domain
  });
}
