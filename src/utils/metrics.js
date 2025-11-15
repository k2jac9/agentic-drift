/**
 * Metrics Collection System
 *
 * Provides application metrics for monitoring and observability
 * Compatible with Prometheus, Grafana, and other monitoring tools
 */

import { logger } from './logger.js';

/**
 * Metric types
 */
const MetricType = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
};

/**
 * Metrics registry
 */
class MetricsRegistry {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  /**
   * Register a new metric
   */
  register(name, type, help, labels = []) {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }

    const metric = new Metric(name, type, help, labels);
    this.metrics.set(name, metric);
    return metric;
  }

  /**
   * Get a registered metric
   */
  get(name) {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics in Prometheus format
   */
  export() {
    const lines = [];

    for (const [name, metric] of this.metrics.entries()) {
      // Add HELP line
      lines.push(`# HELP ${name} ${metric.help}`);

      // Add TYPE line
      lines.push(`# TYPE ${name} ${metric.type}`);

      // Add metric values
      const values = metric.export();
      lines.push(...values);

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset() {
    for (const metric of this.metrics.values()) {
      metric.reset();
    }
  }

  /**
   * Get metrics summary as JSON
   */
  toJSON() {
    const result = {
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
      metrics: {}
    };

    for (const [name, metric] of this.metrics.entries()) {
      result.metrics[name] = metric.toJSON();
    }

    return result;
  }
}

/**
 * Individual metric
 */
class Metric {
  constructor(name, type, help, labels = []) {
    this.name = name;
    this.type = type;
    this.help = help;
    this.labels = labels;
    this.values = new Map();
  }

  /**
   * Get label key from label values
   */
  _getLabelKey(labelValues = {}) {
    if (this.labels.length === 0) {
      return '_default';
    }

    const parts = [];
    for (const label of this.labels) {
      parts.push(`${label}="${labelValues[label] || ''}"`);
    }
    return parts.join(',');
  }

  /**
   * Get or create value for label combination
   */
  _getValue(labelValues = {}) {
    const key = this._getLabelKey(labelValues);
    if (!this.values.has(key)) {
      this.values.set(key, this._createValue());
    }
    return this.values.get(key);
  }

  /**
   * Create initial value based on metric type
   */
  _createValue() {
    switch (this.type) {
      case MetricType.COUNTER:
        return { value: 0 };
      case MetricType.GAUGE:
        return { value: 0 };
      case MetricType.HISTOGRAM:
        return {
          count: 0,
          sum: 0,
          buckets: new Map([
            [0.005, 0],
            [0.01, 0],
            [0.025, 0],
            [0.05, 0],
            [0.1, 0],
            [0.25, 0],
            [0.5, 0],
            [1, 0],
            [2.5, 0],
            [5, 0],
            [10, 0],
            [Infinity, 0]
          ])
        };
      case MetricType.SUMMARY:
        return {
          count: 0,
          sum: 0,
          values: []
        };
      default:
        return { value: 0 };
    }
  }

  /**
   * Increment counter
   */
  inc(labelValues = {}, amount = 1) {
    const value = this._getValue(labelValues);
    value.value += amount;
  }

  /**
   * Set gauge value
   */
  set(labelValues = {}, newValue) {
    const value = this._getValue(labelValues);
    value.value = newValue;
  }

  /**
   * Observe value for histogram/summary
   */
  observe(labelValues = {}, observedValue) {
    const value = this._getValue(labelValues);

    if (this.type === MetricType.HISTOGRAM) {
      value.count++;
      value.sum += observedValue;

      // Update buckets
      for (const [bucket, _] of value.buckets) {
        if (observedValue <= bucket) {
          value.buckets.set(bucket, value.buckets.get(bucket) + 1);
        }
      }
    } else if (this.type === MetricType.SUMMARY) {
      value.count++;
      value.sum += observedValue;
      value.values.push(observedValue);

      // Keep only last 1000 values
      if (value.values.length > 1000) {
        value.values.shift();
      }
    }
  }

  /**
   * Export metric in Prometheus format
   */
  export() {
    const lines = [];

    for (const [labelKey, value] of this.values.entries()) {
      const labelStr = labelKey === '_default' ? '' : `{${labelKey}}`;

      if (this.type === MetricType.HISTOGRAM) {
        // Export histogram buckets
        for (const [bucket, count] of value.buckets) {
          const bucketLabel = bucket === Infinity ? '+Inf' : bucket;
          lines.push(
            `${this.name}_bucket{le="${bucketLabel}"${labelKey !== '_default' ? ',' + labelKey : ''}} ${count}`
          );
        }
        lines.push(`${this.name}_sum${labelStr} ${value.sum}`);
        lines.push(`${this.name}_count${labelStr} ${value.count}`);
      } else if (this.type === MetricType.SUMMARY) {
        // Calculate quantiles
        const sorted = [...value.values].sort((a, b) => a - b);
        const quantiles = [0.5, 0.9, 0.99];

        for (const q of quantiles) {
          const index = Math.floor(sorted.length * q);
          const quantileValue = sorted[index] || 0;
          lines.push(`${this.name}{quantile="${q}"${labelKey !== '_default' ? ',' + labelKey : ''}} ${quantileValue}`);
        }
        lines.push(`${this.name}_sum${labelStr} ${value.sum}`);
        lines.push(`${this.name}_count${labelStr} ${value.count}`);
      } else {
        // Counter or Gauge
        lines.push(`${this.name}${labelStr} ${value.value}`);
      }
    }

    return lines;
  }

  /**
   * Reset metric values
   */
  reset() {
    this.values.clear();
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    const result = {
      type: this.type,
      help: this.help,
      labels: this.labels,
      values: {}
    };

    for (const [key, value] of this.values.entries()) {
      result.values[key] = value;
    }

    return result;
  }
}

// Global registry instance
const registry = new MetricsRegistry();

/**
 * Application metrics
 */

// Request metrics
export const requestsTotal = registry.register(
  'drift_requests_total',
  MetricType.COUNTER,
  'Total number of drift detection requests',
  ['method', 'status']
);

export const requestDuration = registry.register(
  'drift_request_duration_seconds',
  MetricType.HISTOGRAM,
  'Request duration in seconds',
  ['method']
);

// Drift detection metrics
export const driftsDetected = registry.register(
  'drift_detections_total',
  MetricType.COUNTER,
  'Total number of drift events detected',
  ['severity', 'industry']
);

export const driftScore = registry.register('drift_score', MetricType.GAUGE, 'Latest drift score', ['industry']);

// AgentDB metrics
export const agentdbQueries = registry.register(
  'agentdb_queries_total',
  MetricType.COUNTER,
  'Total number of AgentDB queries',
  ['operation', 'status']
);

export const agentdbQueryDuration = registry.register(
  'agentdb_query_duration_seconds',
  MetricType.HISTOGRAM,
  'AgentDB query duration in seconds',
  ['operation']
);

// Memory metrics
export const memoryUsage = registry.register(
  'process_memory_usage_bytes',
  MetricType.GAUGE,
  'Process memory usage in bytes',
  ['type']
);

// Error metrics
export const errorsTotal = registry.register('errors_total', MetricType.COUNTER, 'Total number of errors', [
  'type',
  'severity'
]);

/**
 * Helper functions
 */

/**
 * Track request timing
 */
export function trackRequest(method, fn) {
  return async (...args) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const duration = (Date.now() - startTime) / 1000;

      requestsTotal.inc({ method, status: 'success' });
      requestDuration.observe({ method }, duration);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      requestsTotal.inc({ method, status: 'error' });
      requestDuration.observe({ method }, duration);
      errorsTotal.inc({ type: error.name, severity: 'error' });

      throw error;
    }
  };
}

/**
 * Track drift detection
 */
export function trackDriftDetection(severity, industry, score) {
  driftsDetected.inc({ severity, industry });
  driftScore.set({ industry }, score);
}

/**
 * Track AgentDB operation
 */
export function trackAgentDBQuery(operation, fn) {
  return async (...args) => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const duration = (Date.now() - startTime) / 1000;

      agentdbQueries.inc({ operation, status: 'success' });
      agentdbQueryDuration.observe({ operation }, duration);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      agentdbQueries.inc({ operation, status: 'error' });
      agentdbQueryDuration.observe({ operation }, duration);

      throw error;
    }
  };
}

/**
 * Update memory metrics
 */
export function updateMemoryMetrics() {
  const usage = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, usage.rss);
  memoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ type: 'external' }, usage.external);
}

/**
 * Export all metrics in Prometheus format
 */
export function exportMetrics() {
  updateMemoryMetrics();
  return registry.export();
}

/**
 * Get metrics as JSON
 */
export function getMetricsJSON() {
  updateMemoryMetrics();
  return registry.toJSON();
}

/**
 * Reset all metrics
 */
export function resetMetrics() {
  registry.reset();
  logger.info('Metrics reset');
}

/**
 * Start periodic metrics collection
 */
export function startMetricsCollection(intervalMs = 60000) {
  const intervalId = setInterval(() => {
    updateMemoryMetrics();
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    logger.info('Stopped metrics collection');
  };
}

// Export registry for advanced usage
export { registry, MetricType };
