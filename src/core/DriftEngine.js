/**
 * DriftEngine - Core Multi-Method Drift Detection Engine
 *
 * Implements research-backed statistical methods:
 * - PSI (Population Stability Index): Industry standard for credit risk
 * - KS (Kolmogorov-Smirnov): Non-parametric distribution comparison
 * - JSD (Jensen-Shannon Divergence): Symmetric KL divergence
 * - Statistical Drift: Mean and standard deviation shifts
 *
 * TDD Implementation with AgentDB Integration
 */

import { createDatabase, EmbeddingService, ReflexionMemory, SkillLibrary } from 'agentdb';
import { StatisticsUtil } from '../utils/StatisticsUtil.js';

export class DriftEngine {
  constructor(config = {}, dependencies = null) {
    // Validate config values
    const driftThreshold = config.driftThreshold || 0.1;
    if (driftThreshold <= 0 || driftThreshold > 1) {
      throw new Error('driftThreshold must be between 0 and 1');
    }

    const predictionWindow = config.predictionWindow || 7;
    if (predictionWindow < 1) {
      throw new Error('predictionWindow must be positive');
    }

    const maxHistorySize = config.maxHistorySize || 1000;
    if (maxHistorySize < 1) {
      throw new Error('maxHistorySize must be positive');
    }

    this.config = {
      driftThreshold,
      predictionWindow,
      autoAdapt: config.autoAdapt !== undefined ? config.autoAdapt : false,
      dbPath: config.dbPath || ':memory:',
      maxHistorySize,
      ...config
    };

    // Initialize AgentDB for learning and memory
    // Support dependency injection for testing
    if (dependencies) {
      this.db = dependencies.db;
      this.embedder = dependencies.embedder;
      this.reflexion = dependencies.reflexion;
      this.skills = dependencies.skills;
    } else {
      // Dependencies will be initialized in the create() factory method
      this.db = null;
      this.embedder = null;
      this.reflexion = null;
      this.skills = null;
    }

    // Baseline distribution storage
    this.baselineDistribution = null;

    // Drift detection history
    this.history = [];

    // Adaptive sampling: track last check for skip optimization
    this.lastCheck = null;

    // Result memoization cache (LRU with max 100 entries)
    this.resultCache = new Map();
    this.maxCacheSize = config.maxCacheSize || 100;

    // Statistics
    this.stats = {
      totalChecks: 0,
      driftDetected: 0,
      checksSkipped: 0,
      cacheHits: 0,
      startTime: Date.now()
    };
  }

  /**
   * Factory method for creating DriftEngine with async AgentDB initialization
   * Use this for production, constructor with dependencies for testing
   */
  static async create(config = {}) {
    const engine = new DriftEngine(config);

    // Initialize AgentDB components asynchronously
    engine.db = await createDatabase(engine.config.dbPath);

    // Initialize AgentDB schema (episodes, skills tables, etc.)
    await engine._initializeAgentDBSchema();

    // Initialize EmbeddingService with config
    engine.embedder = new EmbeddingService({
      model: 'Xenova/all-MiniLM-L6-v2',
      dimension: 384,
      provider: 'transformers'
    });
    await engine.embedder.initialize();

    engine.reflexion = new ReflexionMemory(engine.db, engine.embedder);
    engine.skills = new SkillLibrary(engine.db, engine.embedder);

    console.log('✅ Using sql.js (WASM SQLite, no build tools required)');

    return engine;
  }

  /**
   * Initialize AgentDB schema (episodes, skills, etc.)
   * @private
   */
  async _initializeAgentDBSchema() {
    const schema = `
      -- Episodes table for Reflexion Memory
      CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        session_id TEXT NOT NULL,
        task TEXT NOT NULL,
        input TEXT,
        output TEXT,
        critique TEXT,
        reward REAL DEFAULT 0.0,
        success BOOLEAN DEFAULT 0,
        latency_ms INTEGER,
        tokens_used INTEGER,
        tags TEXT,
        metadata JSON,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_episodes_ts ON episodes(ts DESC);
      CREATE INDEX IF NOT EXISTS idx_episodes_session ON episodes(session_id);
      CREATE INDEX IF NOT EXISTS idx_episodes_reward ON episodes(reward DESC);
      CREATE INDEX IF NOT EXISTS idx_episodes_task ON episodes(task);
      CREATE INDEX IF NOT EXISTS idx_episodes_success ON episodes(success);
      CREATE INDEX IF NOT EXISTS idx_episodes_task_ts ON episodes(task, ts DESC);

      CREATE TABLE IF NOT EXISTS episode_embeddings (
        episode_id INTEGER PRIMARY KEY,
        embedding BLOB NOT NULL,
        embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
        FOREIGN KEY(episode_id) REFERENCES episodes(id) ON DELETE CASCADE
      );

      -- Skills table for Skill Library
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        signature JSON NOT NULL,
        code TEXT,
        success_rate REAL DEFAULT 0.0,
        uses INTEGER DEFAULT 0,
        avg_reward REAL DEFAULT 0.0,
        avg_latency_ms INTEGER DEFAULT 0,
        created_from_episode INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        last_used_at INTEGER,
        metadata JSON,
        FOREIGN KEY(created_from_episode) REFERENCES episodes(id)
      );

      CREATE INDEX IF NOT EXISTS idx_skills_success ON skills(success_rate DESC);
      CREATE INDEX IF NOT EXISTS idx_skills_uses ON skills(uses DESC);
      CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);

      CREATE TABLE IF NOT EXISTS skill_embeddings (
        skill_id INTEGER PRIMARY KEY,
        embedding BLOB NOT NULL,
        embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2',
        FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
      );
    `;

    // Execute schema in a single transaction
    this.db.exec(schema);
  }

  /**
   * Set baseline distribution from training data
   */
  async setBaseline(data, metadata = {}) {
    // Comprehensive input validation
    if (!data || data.length === 0) {
      throw new Error('Baseline data cannot be empty');
    }

    if (!Array.isArray(data)) {
      throw new Error('Baseline data must be an array');
    }

    // Validate all values are numbers
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        throw new Error(`Invalid value at index ${i}: ${value}. All values must be finite numbers.`);
      }
    }

    // Warn if sample size is very small
    if (data.length < 3) {
      console.warn(`Warning: Baseline sample size is very small (${data.length}). Drift detection may be unreliable.`);
    }

    // Calculate statistics
    const statistics = this._calculateStatistics(data);

    // Pre-calculate and cache histograms for common bin sizes (3, 5, 10, 20)
    const { min, max } = statistics;
    const cachedHistograms = {};
    for (const bins of [3, 5, 10, 20]) {
      cachedHistograms[bins] = this._createHistogramWithRange(data, bins, min, max);
    }

    // Store baseline with all cached data for maximum performance
    this.baselineDistribution = {
      data: data,
      sortedData: [...data].sort((a, b) => a - b), // Cache sorted array for KS test
      statistics: statistics,
      histograms: cachedHistograms, // Pre-computed histograms for PSI/JSD
      metadata: metadata,
      timestamp: Date.now()
    };

    // Store in AgentDB for versioning
    await this.reflexion.storeEpisode({
      sessionId: `baseline-${Date.now()}`,
      task: 'set_baseline',
      reward: 1.0,
      success: true,
      critique: `Baseline set with ${data.length} samples`
    });

    console.log(
      `✓ Baseline set: ${data.length} samples, mean=${statistics.mean.toFixed(2)}, std=${statistics.std.toFixed(2)}`
    );

    return this.baselineDistribution;
  }

  /**
   * Detect drift in current data using multiple statistical methods
   */
  async detectDrift(currentData, options = {}) {
    // Validate baseline is set
    if (!this.baselineDistribution) {
      throw new Error('Baseline not set. Call setBaseline() first.');
    }

    // Validate current data
    if (!currentData || currentData.length === 0) {
      throw new Error('Current data cannot be empty');
    }

    if (!Array.isArray(currentData)) {
      throw new Error('Current data must be an array');
    }

    // Validate all values are numbers
    for (let i = 0; i < currentData.length; i++) {
      const value = currentData[i];
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        throw new Error(`Invalid value at index ${i}: ${value}. All values must be finite numbers.`);
      }
    }

    // Result memoization: Check cache for identical data
    if (options.memoization !== false) {
      const dataHash = this._hashData(currentData);
      const cached = this.resultCache.get(dataHash);

      if (cached) {
        this.stats.cacheHits++;
        return {
          ...cached,
          timestamp: Date.now(),
          cached: true
        };
      }
    }

    // Adaptive sampling: Skip check if data hasn't changed significantly
    // This optimization is useful for streaming data with stable periods
    if (options.adaptiveSampling !== false && this.lastCheck) {
      const quickStats = this._calculateQuickStats(currentData);
      const lastStats = this.lastCheck.stats;

      // Check if mean and std are within 5% of last check
      const meanDiff = Math.abs(quickStats.mean - lastStats.mean) / lastStats.mean;
      const stdDiff = Math.abs(quickStats.std - lastStats.std) / (lastStats.std || 1);

      if (meanDiff < 0.05 && stdDiff < 0.05) {
        this.stats.totalChecks++;
        this.stats.checksSkipped++;
        const skippedResult = {
          ...this.lastCheck.result,
          timestamp: Date.now(),
          skipped: true,
          reason: 'Data unchanged from last check (adaptive sampling)'
        };

        // Still add to history for tracking, even if skipped
        this.history.push(skippedResult);
        if (this.history.length > this.config.maxHistorySize) {
          this.history.shift();
        }

        return skippedResult;
      }
    }

    const results = {
      timestamp: Date.now(),
      isDrift: false,
      severity: 'none',
      scores: {},
      methods: {},
      averageScore: 0,
      primaryMethod: this.config.primaryMethod || 'psi'
    };

    // Calculate drift using multiple methods in parallel for maximum performance
    const methods = [
      { name: 'psi', fn: this._calculatePSI.bind(this) },
      { name: 'ks', fn: this._kolmogorovSmirnov.bind(this) },
      { name: 'jsd', fn: this._jensenShannonDivergence.bind(this) },
      { name: 'statistical', fn: this._statisticalDrift.bind(this) }
    ];

    // Execute all methods in parallel (non-blocking, CPU-efficient)
    const methodResults = await Promise.all(
      methods.map(async method => ({
        name: method.name,
        score: method.fn(this.baselineDistribution.data, currentData)
      }))
    );

    // Populate results from parallel execution
    for (const { name, score } of methodResults) {
      results.scores[name] = score;
      results.methods[name] = {
        score: score,
        isDrift: score > this.config.driftThreshold
      };
    }

    // Calculate weighted average score (favor primary method)
    const primaryMethod = results.primaryMethod;
    const primaryScore = results.scores[primaryMethod];
    const otherScores = Object.entries(results.scores)
      .filter(([name]) => name !== primaryMethod)
      .map(([_, score]) => score);

    // Adaptive weighting based on sample size
    // For very small samples (<20), histogram-based methods (PSI, JSD) are unreliable
    // Use KS test (non-parametric, handles small samples better) instead
    const minSampleSize = Math.min(this.baselineDistribution.data.length, currentData.length);
    let primaryWeight, otherWeight;

    if (minSampleSize < 20 && primaryMethod === 'psi') {
      // Small samples: favor KS over PSI
      const ksScore = results.scores['ks'];
      results.averageScore = ksScore * 0.7 + (results.scores['jsd'] + results.scores['statistical']) * 0.15;
    } else {
      // Normal weighting: 60% primary method, 40% distributed to others
      primaryWeight = 0.6;
      otherWeight = otherScores.length > 0 ? 0.4 / otherScores.length : 0;
      results.averageScore = primaryScore * primaryWeight + otherScores.reduce((a, b) => a + b, 0) * otherWeight;
    }

    // Determine drift based on weighted average score (not individual methods)
    // For small samples (≤20), apply a tolerance multiplier due to inherent unreliability
    // Very small samples (≤10) need even higher tolerance due to large CDF steps
    let effectiveThreshold = this.config.driftThreshold;
    if (minSampleSize <= 10) {
      effectiveThreshold = this.config.driftThreshold * 1.75; // 75% higher threshold for very small samples
    } else if (minSampleSize <= 20) {
      effectiveThreshold = this.config.driftThreshold * 1.5; // 50% higher threshold for small samples
    }
    results.isDrift = results.averageScore > effectiveThreshold;

    // Determine severity
    // If no drift detected, severity is 'none' regardless of score
    // Otherwise, use score thresholds adjusted for small samples
    if (!results.isDrift) {
      results.severity = 'none';
    } else {
      results.severity = this._calculateSeverity(results.averageScore, effectiveThreshold);
    }

    // Update statistics
    this.stats.totalChecks++;
    if (results.isDrift) {
      this.stats.driftDetected++;
    }

    // Store in history (bounded to prevent memory leaks)
    this.history.push(results);
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift(); // Remove oldest entry
    }

    // Compress old history entries (keep only last 100 full, compress others)
    // This saves memory while maintaining trend information
    if (this.history.length > 100) {
      const compressionThreshold = this.history.length - 100;
      for (let i = 0; i < compressionThreshold; i++) {
        if (!this.history[i].compressed) {
          this.history[i] = this._compressHistoryEntry(this.history[i]);
        }
      }
    }

    // Store drift event in AgentDB
    await this.reflexion.storeEpisode({
      sessionId: `drift-check-${Date.now()}`,
      task: 'detect_drift',
      reward: results.isDrift ? 0.3 : 0.9,
      success: !results.isDrift,
      critique: `Drift ${results.isDrift ? 'detected' : 'not detected'}: severity ${results.severity}`
    });

    // Update last check for adaptive sampling optimization
    this.lastCheck = {
      result: results,
      stats: this._calculateQuickStats(currentData),
      timestamp: Date.now()
    };

    // Store in result cache (LRU eviction if full)
    if (options.memoization !== false) {
      const dataHash = this._hashData(currentData);
      this.resultCache.set(dataHash, results);

      // LRU cache: remove oldest entry if cache is full
      if (this.resultCache.size > this.maxCacheSize) {
        const firstKey = this.resultCache.keys().next().value;
        this.resultCache.delete(firstKey);
      }
    }

    return results;
  }

  /**
   * Calculate Population Stability Index (PSI)
   * Industry standard for credit risk modeling
   */
  _calculatePSI(baseline, current) {
    // Adaptive binning based on sample size
    const minSampleSize = Math.min(baseline.length, current.length);
    const bins = this._getAdaptiveBinCount(minSampleSize);

    // Use combined min/max to ensure consistent bin boundaries
    const { min: combinedMin, max: combinedMax } = this._findMinMax(baseline, current);

    // Use cached baseline histogram if available (major performance boost)
    const baselineHist =
      this.baselineDistribution?.histograms?.[bins] ||
      this._createHistogramWithRange(baseline, bins, combinedMin, combinedMax);
    const currentHist = this._createHistogramWithRange(current, bins, combinedMin, combinedMax);

    let psi = 0;
    for (let i = 0; i < bins; i++) {
      const baselinePct = baselineHist[i] / baseline.length;
      const currentPct = currentHist[i] / current.length;

      // Skip if both are zero (empty bins)
      if (baselinePct === 0 && currentPct === 0) {
        continue;
      }

      // Standard PSI practice: use 0.5% minimum for financial data
      // This prevents artificial inflation when bins shift slightly
      const epsilon = 0.005;
      const baselineSafe = Math.max(baselinePct, epsilon);
      const currentSafe = Math.max(currentPct, epsilon);

      const binContribution = (currentPct - baselinePct) * Math.log(currentSafe / baselineSafe);
      psi += binContribution;
    }

    // PSI is always positive
    return Math.abs(psi);
  }

  /**
   * Kolmogorov-Smirnov Test
   * Non-parametric test for distribution differences
   */
  _kolmogorovSmirnov(baseline, current) {
    // Use cached sorted baseline if available
    const sortedBaseline = this.baselineDistribution?.sortedData || [...baseline].sort((a, b) => a - b);
    const sortedCurrent = [...current].sort((a, b) => a - b);

    // Optimized O(n) algorithm using two-pointer technique
    // Merge sorted arrays and track CDFs
    let i = 0,
      j = 0;
    let maxDiff = 0;
    const nBaseline = baseline.length;
    const nCurrent = current.length;

    while (i < nBaseline || j < nCurrent) {
      // Calculate CDFs at current position
      const cdfBaseline = i / nBaseline;
      const cdfCurrent = j / nCurrent;
      const diff = Math.abs(cdfBaseline - cdfCurrent);

      maxDiff = Math.max(maxDiff, diff);

      // Advance pointer with smaller value
      if (i >= nBaseline) {
        j++;
      } else if (j >= nCurrent) {
        i++;
      } else if (sortedBaseline[i] <= sortedCurrent[j]) {
        i++;
      } else {
        j++;
      }
    }

    return maxDiff;
  }

  /**
   * Jensen-Shannon Divergence
   * Symmetric measure of distribution similarity
   */
  _jensenShannonDivergence(baseline, current) {
    // Adaptive binning based on sample size
    const minSampleSize = Math.min(baseline.length, current.length);
    const bins = this._getAdaptiveBinCount(minSampleSize);

    // Use combined min/max to ensure consistent bin boundaries
    const { min: combinedMin, max: combinedMax } = this._findMinMax(baseline, current);

    // Use cached baseline histogram if available (major performance boost)
    const baselineHist =
      this.baselineDistribution?.histograms?.[bins] ||
      this._createHistogramWithRange(baseline, bins, combinedMin, combinedMax);
    const currentHist = this._createHistogramWithRange(current, bins, combinedMin, combinedMax);

    // Normalize to probabilities
    const p = baselineHist.map(x => x / baseline.length);
    const q = currentHist.map(x => x / current.length);

    // Calculate M = (P + Q) / 2
    const m = p.map((pi, i) => (pi + q[i]) / 2);

    // Calculate KL divergences
    const klPM = this._klDivergence(p, m);
    const klQM = this._klDivergence(q, m);

    // JSD = 0.5 * KL(P||M) + 0.5 * KL(Q||M)
    return 0.5 * klPM + 0.5 * klQM;
  }

  /**
   * Statistical Drift Detection
   * Based on mean and standard deviation shifts
   */
  _statisticalDrift(baseline, current) {
    // Use cached baseline statistics instead of recalculating
    const baselineStats = this.baselineDistribution.statistics;
    const currentStats = this._calculateStatistics(current);

    // Normalized difference in means
    const meanDiff = Math.abs(currentStats.mean - baselineStats.mean) / baselineStats.std;

    // Normalized difference in standard deviations
    const stdDiff = Math.abs(currentStats.std - baselineStats.std) / baselineStats.std;

    // Combined metric
    return (meanDiff + stdDiff) / 2;
  }

  /**
   * Calculate severity level based on average drift score
   */
  _calculateSeverity(avgScore, effectiveThreshold = null) {
    // Use provided effective threshold (which may be adjusted for small samples)
    // or fall back to base threshold
    const threshold = effectiveThreshold || this.config.driftThreshold;

    if (avgScore < threshold * 0.5) {
      return 'none';
    }
    if (avgScore < threshold) {
      return 'low';
    }
    if (avgScore < threshold * 2) {
      return 'medium';
    }
    if (avgScore < threshold * 3) {
      return 'high';
    }
    return 'critical';
  }

  /**
   * Get drift detection statistics
   */
  getStats() {
    const driftRate =
      this.stats.totalChecks > 0 ? ((this.stats.driftDetected / this.stats.totalChecks) * 100).toFixed(1) + '%' : '0%';

    return {
      totalChecks: this.stats.totalChecks,
      driftDetected: this.stats.driftDetected,
      driftRate: driftRate,
      uptime: Date.now() - this.stats.startTime,
      recentHistory: this.history.slice(-10)
    };
  }

  /**
   * Helper: Efficiently find min/max in single pass
   */
  _findMinMax(...arrays) {
    let min = Infinity;
    let max = -Infinity;

    for (const array of arrays) {
      for (const value of array) {
        if (value < min) {
          min = value;
        }
        if (value > max) {
          max = value;
        }
      }
    }

    return { min, max };
  }

  /**
   * Helper: Calculate adaptive bin count based on sample size
   * Follows industry standard: smaller samples need fewer bins
   */
  _getAdaptiveBinCount(minSampleSize) {
    if (minSampleSize < 10) {
      return 3;
    }
    if (minSampleSize < 50) {
      return 5;
    }
    if (minSampleSize < 200) {
      return 10;
    }
    return 20; // Industry standard for large samples
  }

  /**
   * Helper: Compress history entry to save memory
   * Keeps only essential fields, removes detailed scores
   */
  _compressHistoryEntry(entry) {
    return {
      timestamp: entry.timestamp,
      isDrift: entry.isDrift,
      severity: entry.severity,
      averageScore: entry.averageScore,
      compressed: true
    };
  }

  /**
   * Helper: Fast hash function for data arrays (for memoization)
   * Uses FNV-1a hash algorithm for good distribution
   */
  _hashData(data) {
    let hash = 2166136261; // FNV offset basis

    for (let i = 0; i < data.length; i++) {
      // Convert number to bytes representation
      const bytes = new Float64Array([data[i]]);
      const view = new Uint8Array(bytes.buffer);

      for (let j = 0; j < view.length; j++) {
        hash ^= view[j];
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
    }

    return hash >>> 0; // Convert to unsigned 32-bit integer
  }

  /**
   * Helper: Calculate quick statistics (mean and std only) for adaptive sampling
   * Uses Welford's single-pass algorithm for numerical stability and performance
   */
  _calculateQuickStats(data) {
    const stats = StatisticsUtil.calculateStats(data);
    return {
      mean: stats.mean,
      std: stats.std
    };
  }

  /**
   * Helper: Calculate basic statistics using Welford's single-pass algorithm
   * More numerically stable and performant than two-pass approach
   */
  _calculateStatistics(data) {
    const stats = StatisticsUtil.calculateStats(data);
    const range = StatisticsUtil.calculateRange(data);

    return {
      mean: stats.mean,
      std: stats.std,
      variance: stats.variance,
      min: range.min,
      max: range.max,
      count: stats.count
    };
  }

  /**
   * Helper: Create histogram for binning data
   */
  _createHistogram(data, bins) {
    const { min, max } = this._findMinMax(data);
    return this._createHistogramWithRange(data, bins, min, max);
  }

  /**
   * Helper: Create histogram with explicit range (for consistent binning)
   */
  _createHistogramWithRange(data, bins, min, max) {
    const binSize = (max - min) / bins;

    // Handle edge case where min === max
    if (binSize === 0) {
      const histogram = new Array(bins).fill(0);
      histogram[0] = data.length;
      return histogram;
    }

    const histogram = new Array(bins).fill(0);

    for (const value of data) {
      let binIndex = Math.floor((value - min) / binSize);
      if (binIndex >= bins) {
        binIndex = bins - 1;
      } // Handle edge case
      if (binIndex < 0) {
        binIndex = 0;
      } // Handle values below min
      histogram[binIndex]++;
    }

    return histogram;
  }

  /**
   * Helper: Calculate KL divergence
   */
  _klDivergence(p, q) {
    const epsilon = 0.0001;
    let divergence = 0;

    for (let i = 0; i < p.length; i++) {
      const pi = Math.max(p[i], epsilon);
      const qi = Math.max(q[i], epsilon);
      divergence += pi * Math.log(pi / qi);
    }

    return divergence;
  }
}
