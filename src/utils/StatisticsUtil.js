/**
 * StatisticsUtil - Shared statistical utility functions
 *
 * Eliminates code duplication across domain monitors
 * Implements efficient single-pass algorithms where possible
 */

export class StatisticsUtil {
  /**
   * Calculate mean using Welford's single-pass algorithm
   * More numerically stable than sum/count for large datasets
   *
   * @param {number[]} data - Array of numbers
   * @returns {number} Mean value
   */
  static calculateMean(data) {
    if (!data || data.length === 0) {
      return 0;
    }

    let mean = 0;
    for (let i = 0; i < data.length; i++) {
      mean += (data[i] - mean) / (i + 1);
    }

    return mean;
  }

  /**
   * Calculate standard deviation using Welford's algorithm
   * Single-pass algorithm for numerical stability
   *
   * @param {number[]} data - Array of numbers
   * @returns {number} Standard deviation
   */
  static calculateStd(data) {
    if (!data || data.length === 0) {
      return 0;
    }

    const stats = this.calculateStats(data);
    return stats.std;
  }

  /**
   * Calculate mean and standard deviation in a single pass
   * Uses Welford's algorithm for numerical stability
   *
   * @param {number[]} data - Array of numbers
   * @returns {{mean: number, variance: number, std: number, count: number}}
   */
  static calculateStats(data) {
    if (!data || data.length === 0) {
      return { mean: 0, variance: 0, std: 0, count: 0 };
    }

    let count = 0;
    let mean = 0;
    let M2 = 0;

    for (const value of data) {
      count++;
      const delta = value - mean;
      mean += delta / count;
      const delta2 = value - mean;
      M2 += delta * delta2;
    }

    const variance = count > 1 ? M2 / count : 0;
    const std = Math.sqrt(variance);

    return { mean, variance, std, count };
  }

  /**
   * Calculate trend (slope) from time series data
   * Uses simple linear regression
   *
   * @param {number[]} data - Array of values
   * @param {number[]} timestamps - Optional timestamps (defaults to indices)
   * @returns {number} Trend slope
   */
  static calculateTrend(data, timestamps = null) {
    if (!data || data.length < 2) {
      return 0;
    }

    const n = data.length;
    const x = timestamps || Array.from({ length: n }, (_, i) => i);

    // Calculate means
    const meanX = this.calculateMean(x);
    const meanY = this.calculateMean(data);

    // Calculate slope using covariance / variance
    let covariance = 0;
    let variance = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = data[i] - meanY;
      covariance += dx * dy;
      variance += dx * dx;
    }

    return variance === 0 ? 0 : covariance / variance;
  }

  /**
   * Calculate percentile value
   *
   * @param {number[]} data - Array of numbers
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  static calculatePercentile(data, percentile) {
    if (!data || data.length === 0) {
      return 0;
    }

    const sorted = [...data].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate median (50th percentile)
   *
   * @param {number[]} data - Array of numbers
   * @returns {number} Median value
   */
  static calculateMedian(data) {
    return this.calculatePercentile(data, 50);
  }

  /**
   * Calculate min and max in single pass
   *
   * @param {number[]} data - Array of numbers
   * @returns {{min: number, max: number}}
   */
  static calculateRange(data) {
    if (!data || data.length === 0) {
      return { min: 0, max: 0 };
    }

    let min = data[0];
    let max = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i] < min) {
        min = data[i];
      }
      if (data[i] > max) {
        max = data[i];
      }
    }

    return { min, max };
  }

  /**
   * Assess impact severity based on drift score and context
   *
   * @param {Object} drift - Drift result
   * @param {string} severity - Severity level
   * @param {Object} options - Assessment options
   * @returns {string} Impact level (low, medium, high, critical)
   */
  static assessImpact(drift, severity, options = {}) {
    const industryMultipliers = {
      healthcare: 1.5, // More conservative
      financial: 1.3, // Regulatory requirements
      manufacturing: 1.0 // Standard
    };

    const multiplier = industryMultipliers[options.industry] || 1.0;
    const adjustedScore = drift.averageScore * multiplier;

    if (severity === 'critical' || adjustedScore > 0.5) {
      return 'critical';
    } else if (severity === 'high' || adjustedScore > 0.3) {
      return 'high';
    } else if (severity === 'medium' || adjustedScore > 0.15) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check if value is valid number
   *
   * @param {*} value - Value to check
   * @returns {boolean} True if valid number
   */
  static isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * Clean data array by removing invalid values
   *
   * @param {number[]} data - Array to clean
   * @returns {number[]} Cleaned array
   */
  static cleanData(data) {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.filter(this.isValidNumber);
  }
}
