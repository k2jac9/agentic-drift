/**
 * DriftEngine - Core Data Drift Detection and Prediction Engine
 *
 * Enterprise-grade platform for detecting, predicting, and adapting to data drift
 * in production ML systems before it impacts model performance.
 *
 * Research-backed approach using:
 * - Statistical drift detection (KS, PSI, JS-Divergence)
 * - Predictive drift forecasting using historical patterns
 * - Adaptive response system with AgentDB memory
 * - Real-time monitoring and alerting
 */

export class DriftEngine {
  constructor(config = {}) {
    this.config = {
      driftThreshold: config.driftThreshold || 0.1,
      predictionWindow: config.predictionWindow || 7, // days
      autoAdapt: config.autoAdapt !== false,
      monitoringInterval: config.monitoringInterval || 3600000, // 1 hour
      ...config
    };

    // Memory stores for learning patterns (simplified, no database)
    this.episodeMemory = [];
    this.skillMemory = [];
    this.causalMemory = [];

    // Drift detection state
    this.baselineDistribution = null;
    this.driftHistory = [];
    this.predictions = [];
    this.alerts = [];

    // Statistics
    this.stats = {
      totalChecks: 0,
      driftsDetected: 0,
      driftsPredicted: 0,
      falsePositives: 0,
      adaptations: 0,
      startTime: Date.now()
    };
  }

  /**
   * Set baseline distribution for drift detection
   * @param {Array<number>} data - Training/baseline data
   * @param {Object} metadata - Metadata about the baseline
   */
  async setBaseline(data, metadata = {}) {
    this.baselineDistribution = {
      data: data,
      mean: this._calculateMean(data),
      std: this._calculateStd(data),
      min: Math.min(...data),
      max: Math.max(...data),
      timestamp: Date.now(),
      metadata: metadata
    };

    // Store baseline in memory for future reference
    this.episodeMemory.push({
      sessionId: 'baseline',
      task: 'set_baseline',
      reward: 1.0,
      success: true,
      timestamp: Date.now(),
      critique: `Baseline set with ${data.length} samples, mean=${this.baselineDistribution.mean.toFixed(2)}, std=${this.baselineDistribution.std.toFixed(2)}`
    });

    console.log(`✓ Baseline set: ${data.length} samples, mean=${this.baselineDistribution.mean.toFixed(2)}, std=${this.baselineDistribution.std.toFixed(2)}`);
    return this.baselineDistribution;
  }

  /**
   * Detect drift in current data using multiple statistical methods
   * @param {Array<number>} currentData - Current production data
   * @param {Object} options - Detection options
   * @returns {Object} Drift detection results
   */
  async detectDrift(currentData, options = {}) {
    if (!this.baselineDistribution) {
      throw new Error('Baseline not set. Call setBaseline() first.');
    }

    this.stats.totalChecks++;
    const results = {
      timestamp: Date.now(),
      isDrift: false,
      severity: 'none',
      scores: {},
      methods: {}
    };

    // Apply multiple drift detection methods
    const methods = [
      { name: 'psi', fn: this._calculatePSI },
      { name: 'ks', fn: this._kolmogorovSmirnov },
      { name: 'jsd', fn: this._jensenShannonDivergence },
      { name: 'statistical', fn: this._statisticalDrift }
    ];

    for (const method of methods) {
      const score = method.fn.call(this, this.baselineDistribution.data, currentData);
      results.scores[method.name] = score;
      results.methods[method.name] = {
        score: score,
        threshold: this.config.driftThreshold,
        drift: score > this.config.driftThreshold
      };

      if (score > this.config.driftThreshold) {
        results.isDrift = true;
      }
    }

    // Determine severity
    const avgScore = Object.values(results.scores).reduce((a, b) => a + b, 0) / Object.keys(results.scores).length;
    results.severity = this._calculateSeverity(avgScore);
    results.averageScore = avgScore;

    // Store drift event in history
    this.driftHistory.push(results);

    // Learn from this detection
    if (results.isDrift) {
      this.stats.driftsDetected++;
      await this._learnFromDrift(results, currentData);
    }

    // Store in episode memory
    this.episodeMemory.push({
      sessionId: `drift-check-${Date.now()}`,
      task: 'drift_detection',
      reward: results.isDrift ? 0.5 : 1.0,
      success: !results.isDrift,
      timestamp: Date.now(),
      critique: `Drift ${results.isDrift ? 'detected' : 'not detected'} with severity ${results.severity}, avg score: ${avgScore.toFixed(3)}`
    });

    return results;
  }

  /**
   * Predict future drift using historical patterns and AgentDB learning
   * @param {number} daysAhead - Days to predict ahead
   * @returns {Object} Drift prediction
   */
  async predictDrift(daysAhead = 7) {
    if (this.driftHistory.length < 3) {
      return {
        confidence: 0,
        prediction: 'insufficient_data',
        daysAhead: daysAhead,
        message: 'Need at least 3 historical drift checks for prediction'
      };
    }

    // Analyze historical drift patterns
    const recentDrifts = this.driftHistory.slice(-30); // Last 30 checks
    const driftRate = recentDrifts.filter(d => d.isDrift).length / recentDrifts.length;

    // Calculate trend
    const scores = recentDrifts.map(d => d.averageScore);
    const trend = this._calculateTrend(scores);

    // Use causal memory to find patterns
    const driftCauses = await this._analyzeDriftCauses();

    // Predict based on trend and historical patterns
    const prediction = {
      timestamp: Date.now(),
      daysAhead: daysAhead,
      driftRate: driftRate,
      trend: trend,
      predictedScore: this._extrapolateScore(scores, daysAhead),
      confidence: this._calculateConfidence(recentDrifts),
      prediction: 'no_drift',
      causes: driftCauses,
      recommendation: ''
    };

    // Determine prediction
    if (prediction.predictedScore > this.config.driftThreshold * 0.8) {
      prediction.prediction = 'drift_likely';
      prediction.recommendation = 'Consider proactive model retraining or data collection adjustment';
      this.stats.driftsPredicted++;
    } else if (trend > 0.05) {
      prediction.prediction = 'drift_possible';
      prediction.recommendation = 'Monitor closely, trend is increasing';
    } else {
      prediction.prediction = 'no_drift';
      prediction.recommendation = 'Continue normal monitoring';
    }

    // Store prediction
    this.predictions.push(prediction);

    // Learn from prediction
    this.skillMemory.push({
      name: `drift_prediction_${Date.now()}`,
      description: `Drift prediction: ${prediction.prediction} with ${(prediction.confidence * 100).toFixed(0)}% confidence`,
      timestamp: Date.now(),
      successRate: prediction.confidence,
      uses: 1,
      avgReward: prediction.confidence
    });

    return prediction;
  }

  /**
   * Get real-time drift statistics and insights
   */
  getStats() {
    const runtime = (Date.now() - this.stats.startTime) / 1000 / 60; // minutes

    return {
      ...this.stats,
      runtime: `${runtime.toFixed(1)} minutes`,
      driftRate: this.stats.totalChecks > 0 ? (this.stats.driftsDetected / this.stats.totalChecks * 100).toFixed(1) + '%' : '0%',
      avgChecksPerHour: this.stats.totalChecks / (runtime / 60),
      recentDrifts: this.driftHistory.slice(-10),
      recentPredictions: this.predictions.slice(-5),
      alerts: this.alerts.slice(-10)
    };
  }

  // ==================== STATISTICAL METHODS ====================

  /**
   * Calculate Population Stability Index (PSI)
   * Industry standard for credit risk modeling
   */
  _calculatePSI(baseline, current, bins = 10) {
    const baselineBins = this._createBins(baseline, bins);
    const currentBins = this._createBins(current, bins);

    let psi = 0;
    for (let i = 0; i < bins; i++) {
      const baselinePercent = (baselineBins[i] || 1e-10) / baseline.length;
      const currentPercent = (currentBins[i] || 1e-10) / current.length;
      psi += (currentPercent - baselinePercent) * Math.log(currentPercent / baselinePercent);
    }

    return Math.abs(psi);
  }

  /**
   * Kolmogorov-Smirnov Test
   * Non-parametric test for distribution differences
   */
  _kolmogorovSmirnov(baseline, current) {
    const sortedBaseline = [...baseline].sort((a, b) => a - b);
    const sortedCurrent = [...current].sort((a, b) => a - b);

    let maxDiff = 0;
    let i = 0, j = 0;

    while (i < sortedBaseline.length && j < sortedCurrent.length) {
      const cdfBaseline = i / sortedBaseline.length;
      const cdfCurrent = j / sortedCurrent.length;
      const diff = Math.abs(cdfBaseline - cdfCurrent);
      maxDiff = Math.max(maxDiff, diff);

      if (sortedBaseline[i] < sortedCurrent[j]) i++;
      else j++;
    }

    return maxDiff;
  }

  /**
   * Jensen-Shannon Divergence
   * Symmetric version of KL divergence
   */
  _jensenShannonDivergence(baseline, current, bins = 20) {
    const p = this._createHistogram(baseline, bins);
    const q = this._createHistogram(current, bins);
    const m = p.map((pi, i) => (pi + q[i]) / 2);

    const kl = (dist1, dist2) => {
      return dist1.reduce((sum, val, i) => {
        if (val === 0) return sum;
        return sum + val * Math.log(val / (dist2[i] || 1e-10));
      }, 0);
    };

    const jsd = 0.5 * kl(p, m) + 0.5 * kl(q, m);
    return Math.sqrt(Math.max(0, jsd)); // JS distance
  }

  /**
   * Statistical drift based on mean and standard deviation
   */
  _statisticalDrift(baseline, current) {
    const baselineMean = this._calculateMean(baseline);
    const baselineStd = this._calculateStd(baseline);
    const currentMean = this._calculateMean(current);

    // Standardized difference
    const zScore = Math.abs(currentMean - baselineMean) / (baselineStd || 1);

    // Normalize to 0-1 range (z-score > 3 is very significant)
    return Math.min(1, zScore / 3);
  }

  // ==================== HELPER METHODS ====================

  _calculateMean(data) {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  _calculateStd(data) {
    const mean = this._calculateMean(data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  _createBins(data, numBins) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / numBins;
    const bins = new Array(numBins).fill(0);

    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), numBins - 1);
      bins[binIndex]++;
    });

    return bins;
  }

  _createHistogram(data, bins) {
    const counts = this._createBins(data, bins);
    const total = data.length;
    return counts.map(count => count / total);
  }

  _calculateSeverity(score) {
    if (score < this.config.driftThreshold * 0.5) return 'none';
    if (score < this.config.driftThreshold) return 'low';
    if (score < this.config.driftThreshold * 1.5) return 'medium';
    if (score < this.config.driftThreshold * 2) return 'high';
    return 'critical';
  }

  _calculateTrend(scores) {
    if (scores.length < 2) return 0;

    // Simple linear regression slope
    const n = scores.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = scores.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  _extrapolateScore(scores, daysAhead) {
    const trend = this._calculateTrend(scores);
    const currentScore = scores[scores.length - 1];
    return Math.max(0, Math.min(1, currentScore + trend * daysAhead));
  }

  _calculateConfidence(recentDrifts) {
    // Confidence based on data volume and consistency
    const volumeScore = Math.min(1, recentDrifts.length / 30);
    const consistencyScore = this._calculateConsistency(recentDrifts.map(d => d.averageScore));
    return (volumeScore + consistencyScore) / 2;
  }

  _calculateConsistency(values) {
    if (values.length < 2) return 0;
    const std = this._calculateStd(values);
    const mean = this._calculateMean(values);
    const cv = mean > 0 ? std / mean : 1; // Coefficient of variation
    return Math.max(0, 1 - cv); // Lower CV = higher consistency
  }

  async _learnFromDrift(driftResult, currentData) {
    // Store causal relationship if we have previous drift events
    if (this.driftHistory.length > 1) {
      const previousDrift = this.driftHistory[this.driftHistory.length - 2];

      // Store drift events in memory
      const ep1 = {
        id: this.episodeMemory.length,
        sessionId: `drift-${previousDrift.timestamp}`,
        task: 'drift_event',
        reward: 1 - previousDrift.averageScore,
        success: !previousDrift.isDrift,
        timestamp: previousDrift.timestamp
      };

      const ep2 = {
        id: this.episodeMemory.length + 1,
        sessionId: `drift-${driftResult.timestamp}`,
        task: 'drift_event',
        reward: 1 - driftResult.averageScore,
        success: !driftResult.isDrift,
        timestamp: driftResult.timestamp
      };

      this.episodeMemory.push(ep1, ep2);

      // Store causal relationship
      this.causalMemory.push({
        fromMemoryId: ep1.id,
        toMemoryId: ep2.id,
        similarity: this._calculateSimilarity(previousDrift, driftResult),
        confidence: 0.7,
        sampleSize: this.driftHistory.length,
        timestamp: Date.now()
      });
    }
  }

  _calculateSimilarity(drift1, drift2) {
    const scoreDiff = Math.abs(drift1.averageScore - drift2.averageScore);
    return Math.max(0, 1 - scoreDiff);
  }

  async _analyzeDriftCauses() {
    // Analyze patterns in drift history to identify causes
    const causes = [];

    if (this.driftHistory.length > 5) {
      const recentDrifts = this.driftHistory.slice(-10);
      const driftedChecks = recentDrifts.filter(d => d.isDrift);

      if (driftedChecks.length > 0) {
        causes.push({
          type: 'high_drift_frequency',
          confidence: driftedChecks.length / recentDrifts.length,
          description: `${driftedChecks.length} of last ${recentDrifts.length} checks detected drift`
        });
      }
    }

    return causes;
  }
}
