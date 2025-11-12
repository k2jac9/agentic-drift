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

import {
  createDatabase,
  EmbeddingService,
  ReflexionMemory,
  SkillLibrary
} from 'agentdb';

export class DriftEngine {
  constructor(config = {}, dependencies = null) {
    this.config = {
      driftThreshold: config.driftThreshold || 0.1,
      predictionWindow: config.predictionWindow || 7,
      autoAdapt: config.autoAdapt !== undefined ? config.autoAdapt : false,
      dbPath: config.dbPath || ':memory:',
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

    // Statistics
    this.stats = {
      totalChecks: 0,
      driftDetected: 0,
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
    // Validate input
    if (!data || data.length === 0) {
      throw new Error('Baseline data cannot be empty');
    }

    // Calculate statistics
    const statistics = this._calculateStatistics(data);

    // Store baseline
    this.baselineDistribution = {
      data: data,
      statistics: statistics,
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

    console.log(`✓ Baseline set: ${data.length} samples, mean=${statistics.mean.toFixed(2)}, std=${statistics.std.toFixed(2)}`);

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

    const results = {
      timestamp: Date.now(),
      isDrift: false,
      severity: 'none',
      scores: {},
      methods: {},
      averageScore: 0,
      primaryMethod: this.config.primaryMethod || 'psi'
    };

    // Calculate drift using multiple methods
    const methods = [
      { name: 'psi', fn: this._calculatePSI.bind(this) },
      { name: 'ks', fn: this._kolmogorovSmirnov.bind(this) },
      { name: 'jsd', fn: this._jensenShannonDivergence.bind(this) },
      { name: 'statistical', fn: this._statisticalDrift.bind(this) }
    ];

    for (const method of methods) {
      const score = method.fn(this.baselineDistribution.data, currentData);
      results.scores[method.name] = score;
      results.methods[method.name] = {
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
      results.averageScore = primaryScore * primaryWeight +
        otherScores.reduce((a, b) => a + b, 0) * otherWeight;
    }

    // Determine drift based on weighted average score (not individual methods)
    // For very small samples (<10), apply a tolerance multiplier due to inherent unreliability
    let effectiveThreshold = this.config.driftThreshold;
    if (minSampleSize < 10) {
      effectiveThreshold = this.config.driftThreshold * 2.0; // Double threshold for tiny samples
    }
    results.isDrift = results.averageScore > effectiveThreshold;

    // Determine severity
    results.severity = this._calculateSeverity(results.averageScore);

    // Update statistics
    this.stats.totalChecks++;
    if (results.isDrift) {
      this.stats.driftDetected++;
    }

    // Store in history
    this.history.push(results);

    // Store drift event in AgentDB
    await this.reflexion.storeEpisode({
      sessionId: `drift-check-${Date.now()}`,
      task: 'detect_drift',
      reward: results.isDrift ? 0.3 : 0.9,
      success: !results.isDrift,
      critique: `Drift ${results.isDrift ? 'detected' : 'not detected'}: severity ${results.severity}`
    });

    return results;
  }

  /**
   * Calculate Population Stability Index (PSI)
   * Industry standard for credit risk modeling
   */
  _calculatePSI(baseline, current) {
    // Adaptive binning based on sample size
    // Use fewer bins for small samples to avoid sparsity
    const minSampleSize = Math.min(baseline.length, current.length);
    let bins;
    if (minSampleSize < 10) {
      bins = 3; // Very small samples: 3 bins
    } else if (minSampleSize < 50) {
      bins = 5; // Small samples: 5 bins
    } else if (minSampleSize < 200) {
      bins = 10; // Medium samples: 10 bins
    } else {
      bins = 20; // Large samples: 20 bins (industry standard)
    }

    // Use combined min/max to ensure consistent bin boundaries
    const combinedMin = Math.min(Math.min(...baseline), Math.min(...current));
    const combinedMax = Math.max(Math.max(...baseline), Math.max(...current));

    const baselineHist = this._createHistogramWithRange(baseline, bins, combinedMin, combinedMax);
    const currentHist = this._createHistogramWithRange(current, bins, combinedMin, combinedMax);

    let psi = 0;
    for (let i = 0; i < bins; i++) {
      const baselinePct = baselineHist[i] / baseline.length;
      const currentPct = currentHist[i] / current.length;

      // Skip if both are zero (empty bins)
      if (baselinePct === 0 && currentPct === 0) continue;

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
    const sortedBaseline = [...baseline].sort((a, b) => a - b);
    const sortedCurrent = [...current].sort((a, b) => a - b);

    // Get all unique values from both distributions
    const allValues = [...new Set([...sortedBaseline, ...sortedCurrent])].sort((a, b) => a - b);

    let maxDiff = 0;

    for (const value of allValues) {
      // Count how many values are <= this value in each distribution (ECDF)
      const baselineCount = sortedBaseline.filter(x => x <= value).length;
      const currentCount = sortedCurrent.filter(x => x <= value).length;

      const cdfBaseline = baselineCount / baseline.length;
      const cdfCurrent = currentCount / current.length;
      const diff = Math.abs(cdfBaseline - cdfCurrent);

      maxDiff = Math.max(maxDiff, diff);
    }

    return maxDiff;
  }

  /**
   * Jensen-Shannon Divergence
   * Symmetric measure of distribution similarity
   */
  _jensenShannonDivergence(baseline, current) {
    // Adaptive binning based on sample size (same as PSI)
    const minSampleSize = Math.min(baseline.length, current.length);
    let bins;
    if (minSampleSize < 10) {
      bins = 3;
    } else if (minSampleSize < 50) {
      bins = 5;
    } else if (minSampleSize < 200) {
      bins = 10;
    } else {
      bins = 20;
    }

    // Use combined min/max to ensure consistent bin boundaries
    const combinedMin = Math.min(Math.min(...baseline), Math.min(...current));
    const combinedMax = Math.max(Math.max(...baseline), Math.max(...current));

    const baselineHist = this._createHistogramWithRange(baseline, bins, combinedMin, combinedMax);
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
    const baselineStats = this._calculateStatistics(baseline);
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
  _calculateSeverity(avgScore) {
    const threshold = this.config.driftThreshold;

    if (avgScore < threshold * 0.5) return 'none';
    if (avgScore < threshold) return 'low';
    if (avgScore < threshold * 2) return 'medium';
    if (avgScore < threshold * 3) return 'high';
    return 'critical';
  }

  /**
   * Get drift detection statistics
   */
  getStats() {
    const driftRate = this.stats.totalChecks > 0
      ? ((this.stats.driftDetected / this.stats.totalChecks) * 100).toFixed(1) + '%'
      : '0%';

    return {
      totalChecks: this.stats.totalChecks,
      driftDetected: this.stats.driftDetected,
      driftRate: driftRate,
      uptime: Date.now() - this.stats.startTime,
      recentHistory: this.history.slice(-10)
    };
  }

  /**
   * Helper: Calculate basic statistics
   */
  _calculateStatistics(data) {
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    return {
      mean: mean,
      std: std,
      min: Math.min(...data),
      max: Math.max(...data),
      count: n
    };
  }

  /**
   * Helper: Create histogram for binning data
   */
  _createHistogram(data, bins) {
    const min = Math.min(...data);
    const max = Math.max(...data);
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
      if (binIndex >= bins) binIndex = bins - 1; // Handle edge case
      if (binIndex < 0) binIndex = 0; // Handle values below min
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
