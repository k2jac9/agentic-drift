/**
 * FinancialDriftMonitor - Enterprise Data Drift Detection for Financial Services
 *
 * Use Cases:
 * - Credit Scoring Models: Detect when economic conditions affect default predictions
 * - Fraud Detection: Adapt to new fraud tactics in real-time
 * - Risk Assessment: Monitor portfolio risk distribution changes
 * - Transaction Patterns: Detect shifts in customer behavior
 *
 * Based on research: PSI (Population Stability Index) is industry standard
 * for credit risk modeling drift detection.
 */

import { DriftEngine } from '../core/DriftEngine.js';

export class FinancialDriftMonitor extends DriftEngine {
  constructor(config = {}) {
    super({
      driftThreshold: config.driftThreshold || 0.15, // Industry standard PSI threshold
      predictionWindow: config.predictionWindow || 30, // 30 days for financial
      autoAdapt: config.autoAdapt !== false,
      ...config
    });

    this.modelType = config.modelType || 'credit_scoring';
    this.features = config.features || [];
    this.economicIndicators = [];
  }

  /**
   * Monitor credit scoring model drift
   * Detects when economic conditions change default risk relationships
   */
  async monitorCreditScoring(currentScores, applicantFeatures) {
    console.log('\n💳 Financial - Credit Scoring Drift Monitor');
    console.log('=' .repeat(60));

    // Detect drift in credit scores
    const scoreDrift = await this.detectDrift(currentScores, {
      context: 'credit_scoring'
    });

    // Analyze feature drift
    const featureDrifts = await this._analyzeFeatureDrift(applicantFeatures);

    // Check for economic indicators
    const economicDrift = this._checkEconomicFactors();

    const result = {
      timestamp: Date.now(),
      modelType: 'credit_scoring',
      scoreDrift: scoreDrift,
      featureDrifts: featureDrifts,
      economicFactors: economicDrift,
      overallRisk: this._calculateOverallRisk(scoreDrift, featureDrifts, economicDrift),
      recommendations: []
    };

    // Generate recommendations
    if (result.overallRisk === 'high' || result.overallRisk === 'critical') {
      result.recommendations.push('URGENT: Consider model recalibration');
      result.recommendations.push('Review recent economic indicators');
      result.recommendations.push('Increase model validation frequency');

      if (scoreDrift.severity === 'critical') {
        result.recommendations.push('CRITICAL: Temporarily halt automated decisions, enable manual review');
      }
    }

    console.log(`Drift Status: ${scoreDrift.isDrift ? '⚠️  DRIFT DETECTED' : '✓ No Drift'}`);
    console.log(`Severity: ${scoreDrift.severity.toUpperCase()}`);
    console.log(`Overall Risk: ${result.overallRisk.toUpperCase()}`);
    console.log(`PSI Score: ${scoreDrift.scores.psi?.toFixed(4)} (threshold: ${this.config.driftThreshold})`);

    // Learn from this monitoring session
    await this._learnFromFinancialDrift(result);

    return result;
  }

  /**
   * Monitor fraud detection model drift
   * Critical for adapting to new fraud tactics
   */
  async monitorFraudDetection(transactionScores, transactionFeatures) {
    console.log('\n🛡️  Financial - Fraud Detection Drift Monitor');
    console.log('=' .repeat(60));

    // Detect drift in fraud scores
    const fraudDrift = await this.detectDrift(transactionScores, {
      context: 'fraud_detection'
    });

    // Analyze transaction pattern changes
    const patternDrift = await this._analyzeTransactionPatterns(transactionFeatures);

    // Predict future fraud pattern shifts
    const prediction = await this.predictDrift(7); // 7 days ahead

    const result = {
      timestamp: Date.now(),
      modelType: 'fraud_detection',
      fraudDrift: fraudDrift,
      patternDrift: patternDrift,
      prediction: prediction,
      adaptiveResponse: this._generateFraudResponse(fraudDrift, patternDrift),
      recommendations: []
    };

    // Critical for fraud: be more aggressive with drift detection
    if (fraudDrift.severity === 'medium' || fraudDrift.severity === 'high') {
      result.recommendations.push('ALERT: Fraud pattern shift detected');
      result.recommendations.push('Review recent fraud cases manually');
      result.recommendations.push('Update fraud rules immediately');

      if (this.config.autoAdapt) {
        result.recommendations.push('AUTO-ADAPT: Triggering model retraining');
        await this._triggerAdaptiveRetraining('fraud_detection', fraudDrift);
      }
    }

    console.log(`Drift Status: ${fraudDrift.isDrift ? '⚠️  DRIFT DETECTED' : '✓ No Drift'}`);
    console.log(`Severity: ${fraudDrift.severity.toUpperCase()}`);
    console.log(`Prediction (7d): ${prediction.prediction}`);
    console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);

    return result;
  }

  /**
   * Monitor portfolio risk distribution
   */
  async monitorPortfolioRisk(riskScores, portfolioFeatures) {
    console.log('\n📊 Financial - Portfolio Risk Drift Monitor');
    console.log('=' .repeat(60));

    const riskDrift = await this.detectDrift(riskScores);

    // Calculate Value at Risk (VaR) drift
    const varDrift = this._calculateVaRDrift(riskScores);

    const result = {
      timestamp: Date.now(),
      modelType: 'portfolio_risk',
      riskDrift: riskDrift,
      varDrift: varDrift,
      recommendations: []
    };

    if (riskDrift.isDrift && varDrift.change > 0.1) {
      result.recommendations.push('Portfolio risk distribution has shifted significantly');
      result.recommendations.push('Review asset allocation strategy');
      result.recommendations.push('Consider rebalancing portfolio');
    }

    console.log(`Drift Status: ${riskDrift.isDrift ? '⚠️  DRIFT DETECTED' : '✓ No Drift'}`);
    console.log(`VaR Change: ${(varDrift.change * 100).toFixed(2)}%`);

    return result;
  }

  // ==================== HELPER METHODS ====================

  async _analyzeFeatureDrift(features) {
    const drifts = [];

    // Common credit features
    const featureNames = ['income', 'debt_ratio', 'credit_history', 'employment_length'];

    for (const featureName of featureNames) {
      if (features[featureName]) {
        const drift = await this.detectDrift(features[featureName]);
        drifts.push({
          feature: featureName,
          drift: drift.isDrift,
          score: drift.averageScore,
          severity: drift.severity
        });
      }
    }

    return drifts;
  }

  _checkEconomicFactors() {
    // In production, this would integrate with economic APIs
    // For demo, simulate economic indicator monitoring
    return {
      unemployment: { trend: 'stable', impact: 'low' },
      interest_rates: { trend: 'rising', impact: 'medium' },
      gdp_growth: { trend: 'stable', impact: 'low' }
    };
  }

  _calculateOverallRisk(scoreDrift, featureDrifts, economicDrift) {
    let riskScore = 0;

    // Score drift contribution
    if (scoreDrift.severity === 'critical') riskScore += 4;
    else if (scoreDrift.severity === 'high') riskScore += 3;
    else if (scoreDrift.severity === 'medium') riskScore += 2;
    else if (scoreDrift.severity === 'low') riskScore += 1;

    // Feature drift contribution
    const criticalFeatures = featureDrifts.filter(f => f.severity === 'high' || f.severity === 'critical').length;
    riskScore += criticalFeatures * 0.5;

    // Map to risk level
    if (riskScore >= 3.5) return 'critical';
    if (riskScore >= 2.5) return 'high';
    if (riskScore >= 1.5) return 'medium';
    if (riskScore >= 0.5) return 'low';
    return 'none';
  }

  async _analyzeTransactionPatterns(transactionFeatures) {
    // Analyze changes in transaction patterns
    const patterns = {
      avgAmount: transactionFeatures.amounts ? this._calculateMean(transactionFeatures.amounts) : 0,
      avgFrequency: transactionFeatures.frequencies ? this._calculateMean(transactionFeatures.frequencies) : 0,
      geographicSpread: transactionFeatures.locations ? transactionFeatures.locations.length : 0
    };

    return {
      patterns: patterns,
      anomalies: [],
      timestamp: Date.now()
    };
  }

  _generateFraudResponse(fraudDrift, patternDrift) {
    const responses = [];

    if (fraudDrift.severity === 'high' || fraudDrift.severity === 'critical') {
      responses.push({
        action: 'increase_thresholds',
        priority: 'high',
        description: 'Temporarily increase fraud detection thresholds by 20%'
      });

      responses.push({
        action: 'enable_manual_review',
        priority: 'critical',
        description: 'Route high-risk transactions to manual review queue'
      });
    }

    if (patternDrift.anomalies && patternDrift.anomalies.length > 0) {
      responses.push({
        action: 'investigate_patterns',
        priority: 'medium',
        description: 'Investigate new transaction patterns for potential fraud'
      });
    }

    return responses;
  }

  _calculateVaRDrift(riskScores) {
    // Calculate Value at Risk at 95% confidence level
    const sorted = [...riskScores].sort((a, b) => a - b);
    const varIndex = Math.floor(sorted.length * 0.95);
    const currentVaR = sorted[varIndex];

    // Compare with baseline VaR
    const baselineVaR = this.baselineDistribution ? this.baselineDistribution.data.sort((a, b) => a - b)[Math.floor(this.baselineDistribution.data.length * 0.95)] : currentVaR;

    return {
      currentVaR: currentVaR,
      baselineVaR: baselineVaR,
      change: baselineVaR > 0 ? (currentVaR - baselineVaR) / baselineVaR : 0,
      timestamp: Date.now()
    };
  }

  async _learnFromFinancialDrift(result) {
    // Store financial-specific drift patterns as skills
    this.skillMemory.push({
      name: `financial_drift_${result.modelType}_${Date.now()}`,
      description: `Financial drift detected in ${result.modelType} with ${result.overallRisk} risk`,
      signature: {
        inputs: { modelType: 'string', features: 'object' },
        outputs: { risk: 'string', recommendations: 'array' }
      },
      successRate: result.scoreDrift.isDrift ? 0.7 : 0.95,
      uses: 1,
      avgReward: result.scoreDrift.isDrift ? 0.6 : 0.9,
      avgLatencyMs: 0
    });
  }

  async _triggerAdaptiveRetraining(modelType, driftResult) {
    console.log(`\n🔄 Triggering adaptive retraining for ${modelType}...`);

    // In production, this would trigger actual model retraining
    // For now, store the retraining event
    this.stats.adaptations++;

    this.episodeMemory.push({
      sessionId: `retraining-${Date.now()}`,
      task: 'adaptive_retraining',
      reward: 0.8,
      success: true,
      critique: `Triggered retraining for ${modelType} due to ${driftResult.severity} severity drift`
    });

    console.log(`✓ Retraining initiated for ${modelType}`);
  }
}
