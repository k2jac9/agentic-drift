/**
 * Graceful Shutdown Handler
 *
 * Handles SIGTERM, SIGINT signals for graceful shutdown
 * Ensures all resources are cleaned up properly before exit
 */

import { logger } from './logger.js';

const shutdownHandlers = new Set();
let isShuttingDown = false;

/**
 * Register a shutdown handler
 *
 * @param {Function} handler - Async function to call on shutdown
 * @param {string} name - Handler name for logging
 */
export function onShutdown(handler, name = 'anonymous') {
  shutdownHandlers.add({ handler, name });
}

/**
 * Perform graceful shutdown
 *
 * @param {string} signal - Signal that triggered shutdown
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`\n🛑 ${signal} received, starting graceful shutdown...`);

  const startTime = Date.now();
  const timeout = 30000; // 30 second timeout

  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), timeout);
    });

    // Execute all shutdown handlers in parallel
    const shutdownPromises = Array.from(shutdownHandlers).map(async ({ handler, name }) => {
      try {
        logger.info(`  Executing shutdown handler: ${name}`);
        await handler();
        logger.info(`  ✓ ${name} completed`);
      } catch (error) {
        logger.error(`  ✗ ${name} failed: ${error.message}`);
        throw error;
      }
    });

    // Wait for all handlers or timeout
    await Promise.race([Promise.all(shutdownPromises), timeoutPromise]);

    const duration = Date.now() - startTime;
    logger.info(`\n✅ Graceful shutdown complete in ${duration}ms`);
    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`\n❌ Shutdown error after ${duration}ms: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers for process signals
 */
export function setupGracefulShutdown() {
  // Handle SIGTERM (Docker, Kubernetes)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    logger.error('Uncaught exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  logger.info('✅ Graceful shutdown handlers registered');
}

/**
 * Example shutdown handlers for common resources
 */

/**
 * Close database connections
 */
export async function closeDatabaseConnections(databases = []) {
  logger.info('Closing database connections...');

  for (const db of databases) {
    try {
      if (db && typeof db.close === 'function') {
        await db.close();
      }
    } catch (error) {
      logger.error(`Failed to close database: ${error.message}`);
    }
  }
}

/**
 * Finish in-flight requests
 */
export async function finishInFlightRequests(server, timeout = 10000) {
  logger.info('Finishing in-flight requests...');

  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Request finish timeout'));
    }, timeout);

    server.close(err => {
      clearTimeout(timer);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Flush logs and metrics
 */
export async function flushLogsAndMetrics() {
  logger.info('Flushing logs and metrics...');

  // Wait a bit for async log transports to flush
  await new Promise(resolve => setTimeout(resolve, 1000));
}
