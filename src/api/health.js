/**
 * Health Check Endpoint
 *
 * Provides health status for monitoring systems (Kubernetes, Docker, etc.)
 * Reports system health, resource usage, and component status
 */

import { logger } from '../utils/logger.js';

const startTime = Date.now();
const healthChecks = new Map();

/**
 * Register a health check
 *
 * @param {string} name - Check name
 * @param {Function} checkFn - Async function that returns {healthy: boolean, details?: any}
 */
export function registerHealthCheck(name, checkFn) {
  healthChecks.set(name, checkFn);
  logger.info(`Registered health check: ${name}`);
}

/**
 * Get system uptime in seconds
 */
function getUptime() {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Get memory usage information
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    heapUsedPercent: Math.round((usage.heapUsed / usage.heapTotal) * 100)
  };
}

/**
 * Get CPU usage information
 */
function getCpuUsage() {
  const cpuUsage = process.cpuUsage();
  return {
    user: Math.round(cpuUsage.user / 1000), // ms
    system: Math.round(cpuUsage.system / 1000) // ms
  };
}

/**
 * Execute all registered health checks
 */
async function runHealthChecks() {
  const results = {};
  let allHealthy = true;

  for (const [name, checkFn] of healthChecks.entries()) {
    try {
      const result = await Promise.race([
        checkFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
      ]);

      results[name] = {
        healthy: result.healthy !== false,
        ...result
      };

      if (!results[name].healthy) {
        allHealthy = false;
      }
    } catch (error) {
      results[name] = {
        healthy: false,
        error: error.message
      };
      allHealthy = false;
    }
  }

  return { allHealthy, results };
}

/**
 * Basic health check - just checks if process is running
 */
export async function healthCheck() {
  const memory = getMemoryUsage();
  const cpu = getCpuUsage();
  const uptime = getUptime();

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
    memory: memory,
    cpu: cpu,
    pid: process.pid
  };
}

/**
 * Detailed health check - includes component checks
 */
export async function detailedHealthCheck() {
  const basic = await healthCheck();
  const { allHealthy, results } = await runHealthChecks();

  return {
    ...basic,
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks: results,
    healthy: allHealthy
  };
}

/**
 * Readiness check - returns 200 if ready to accept traffic
 */
export async function readinessCheck() {
  const { allHealthy, results } = await runHealthChecks();

  return {
    ready: allHealthy,
    timestamp: new Date().toISOString(),
    checks: results
  };
}

/**
 * Liveness check - returns 200 if process is alive
 */
export async function livenessCheck() {
  return {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: getUptime()
  };
}

/**
 * Example health check: Database connection
 */
export async function checkDatabase(db) {
  if (!db) {
    return { healthy: false, message: 'Database not initialized' };
  }

  try {
    // Try a simple query
    const result = db.prepare('SELECT 1').get();
    return {
      healthy: true,
      message: 'Database connection OK'
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Database error: ${error.message}`
    };
  }
}

/**
 * Example health check: Memory threshold
 */
export async function checkMemoryUsage(thresholdPercent = 90) {
  const memory = getMemoryUsage();
  const isHealthy = memory.heapUsedPercent < thresholdPercent;

  return {
    healthy: isHealthy,
    message: isHealthy
      ? `Memory usage OK (${memory.heapUsedPercent}%)`
      : `Memory usage high (${memory.heapUsedPercent}%)`,
    heapUsedPercent: memory.heapUsedPercent,
    threshold: thresholdPercent
  };
}

/**
 * HTTP endpoint handler factory
 * Creates Express-compatible handlers
 */
export function createHealthEndpoints() {
  return {
    // GET /health - Basic health check
    basic: async (req, res) => {
      try {
        const health = await healthCheck();
        res.status(200).json(health);
      } catch (error) {
        logger.error('Health check error:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    },

    // GET /health/detailed - Detailed health with component checks
    detailed: async (req, res) => {
      try {
        const health = await detailedHealthCheck();
        const status = health.healthy ? 200 : 503;
        res.status(status).json(health);
      } catch (error) {
        logger.error('Detailed health check error:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    },

    // GET /health/ready - Kubernetes readiness probe
    ready: async (req, res) => {
      try {
        const readiness = await readinessCheck();
        const status = readiness.ready ? 200 : 503;
        res.status(status).json(readiness);
      } catch (error) {
        logger.error('Readiness check error:', error);
        res.status(503).json({
          ready: false,
          error: error.message
        });
      }
    },

    // GET /health/live - Kubernetes liveness probe
    live: async (req, res) => {
      try {
        const liveness = await livenessCheck();
        res.status(200).json(liveness);
      } catch (error) {
        logger.error('Liveness check error:', error);
        res.status(503).json({
          alive: false,
          error: error.message
        });
      }
    }
  };
}
