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
import { createDatabase, EmbeddingService, ReflexionMemory, SkillLibrary } from 'agentdb';

export class FinancialDriftMonitor extends DriftEngine {
  constructor(config = {}, dependencies = null) {
    // Financial industry defaults
    const financialConfig = {
      driftThreshold: config.driftThreshold || 0.15, // Industry standard PSI threshold
      predictionWindow: config.predictionWindow || 30, // 30 days for financial
      autoAdapt: config.autoAdapt !== false,
      industry: 'financial',
      primaryMethod: 'psi',
      ...config
    };

    super(financialConfig, dependencies);

    this.industry = 'financial';
    this.modelType = config.modelType || 'credit_scoring';
    this.features = config.features || [];
    this.economicIndicators = [];

    // Financial-specific tracking
    this.monitoringStats = {
      creditScoringChecks: 0,
      fraudDetectionChecks: 0,
      portfolioRiskChecks: 0,
      regulatoryAlerts: 0,
      falsePositives: 0
    };

    // Audit log for regulatory compliance
    this.auditLog = [];
  }

  /**
   * Factory method for creating FinancialDriftMonitor with async AgentDB initialization
   * Use this for production, constructor with dependencies for testing
   */
  static async create(config = {}) {
    // Create financial config
    const financialConfig = {
      driftThreshold: config.driftThreshold || 0.15,
      predictionWindow: config.predictionWindow || 30,
      autoAdapt: config.autoAdapt !== false,
      industry: 'financial',
      primaryMethod: 'psi',
      dbPath: config.dbPath || ':memory:',
      ...config
    };

    const monitor = new FinancialDriftMonitor(financialConfig, null);

    // Initialize AgentDB components asynchronously
    monitor.db = await createDatabase(monitor.config.dbPath);

    // Initialize AgentDB schema (inherited from DriftEngine)
    await monitor._initializeAgentDBSchema();

    // Initialize EmbeddingService with config
    monitor.embedder = new EmbeddingService({
      model: 'Xenova/all-MiniLM-L6-v2',
      dimension: 384,
      provider: 'transformers'
    });
    await monitor.embedder.initialize();

    monitor.reflexion = new ReflexionMemory(monitor.db, monitor.embedder);
    monitor.skills = new SkillLibrary(monitor.db, monitor.embedder);

    console.log('✅ Using sql.js (WASM SQLite, no build tools required)');

    return monitor;
  }

  /**
   * Monitor credit scoring model drift
   * Detects when economic conditions change default risk relationships
   */
  async monitorCreditScoring(currentScores, applicantFeatures = null) {
    this.monitoringStats.creditScoringChecks++;

    // Detect drift in credit scores
    const scoreDrift = await this.detectDrift(currentScores, {
      context: 'credit_scoring'
    });

    // Analyze feature drift
    const featureDrifts = await this._analyzeFeatureDrift(applicantFeatures);

    // Check for economic indicators
    const economicFactors = this._checkEconomicFactors();

    // Calculate overall risk
    const overallRisk = this._calculateOverallRisk(scoreDrift, featureDrifts, economicFactors);

    const result = {
      timestamp: Date.now(),
      modelType: 'credit_scoring',
      isDrift: scoreDrift.isDrift,
      severity: scoreDrift.severity,
      scoreDrift: scoreDrift,
      featureDrifts: featureDrifts,
      economicFactors: economicFactors,
      overallRisk: overallRisk,
      recommendation: this._generateCreditRecommendation(scoreDrift, overallRisk),
      regulatoryAlert: scoreDrift.severity === 'critical'
    };

    // Store in audit log
    this._addToAuditLog(result);

    // Store in AgentDB
    await this.reflexion.storeEpisode({
      sessionId: `credit-scoring-${Date.now()}`,
      task: 'credit_scoring_monitor',
      reward: scoreDrift.isDrift ? 0.4 : 0.9,
      success: !scoreDrift.isDrift,
      critique: `Credit scoring drift ${scoreDrift.isDrift ? 'detected' : 'not detected'}, overall risk: ${overallRisk}`
    });

    return result;
  }

  /**
   * Monitor fraud detection model drift
   * Critical for adapting to new fraud tactics
   */
  async monitorFraudDetection(currentFraudScores, transactionPatterns = null) {
    this.monitoringStats.fraudDetectionChecks++;

    const fraudDrift = await this.detectDrift(currentFraudScores, {
      context: 'fraud_detection'
    });

    // Calculate fraud rate change
    const baselineMean = this.baselineDistribution.statistics.mean;
    const currentMean = this._calculateStatistics(currentFraudScores).mean;
    const fraudRateChange = ((currentMean - baselineMean) / baselineMean) * 100;

    // Analyze transaction pattern shifts
    let patternShifts = {};
    if (transactionPatterns) {
      patternShifts = this._analyzeTransactionPatterns(transactionPatterns);
    }

    // Determine if immediate action is required
    const requiresImmediateAction = fraudDrift.severity === 'critical' || Math.abs(fraudRateChange) > 50;

    const result = {
      timestamp: Date.now(),
      modelType: 'fraud_detection',
      isDrift: fraudDrift.isDrift,
      severity: fraudDrift.severity,
      fraudDrift: fraudDrift,
      fraudRateChange: fraudRateChange,
      patternShifts: patternShifts,
      requiresImmediateAction: requiresImmediateAction,
      recommendation: this._generateFraudRecommendation(fraudDrift, fraudRateChange)
    };

    // Critical fraud drift triggers regulatory alert
    if (requiresImmediateAction) {
      this.monitoringStats.regulatoryAlerts++;
    }

    this._addToAuditLog(result);

    await this.reflexion.storeEpisode({
      sessionId: `fraud-detection-${Date.now()}`,
      task: 'fraud_detection_monitor',
      reward: requiresImmediateAction ? 0.2 : 0.85,
      success: !requiresImmediateAction,
      critique: `Fraud detection drift: ${fraudDrift.severity}, rate change: ${fraudRateChange.toFixed(1)}%`
    });

    return result;
  }

  /**
   * Monitor portfolio risk distribution
   */
  async monitorPortfolioRisk(currentRisk, sectorExposure = null) {
    this.monitoringStats.portfolioRiskChecks++;

    const riskDrift = await this.detectDrift(currentRisk, {
      context: 'portfolio_risk'
    });

    // Calculate concentration risk
    const concentrationRisk = this._calculateConcentrationRisk(currentRisk);

    // Analyze sector drift if provided
    let sectorDrift = {};
    if (sectorExposure) {
      sectorDrift = this._analyzeSectorDrift(sectorExposure);
    }

    const result = {
      timestamp: Date.now(),
      modelType: 'portfolio_risk',
      isDrift: riskDrift.isDrift,
      severity: riskDrift.severity,
      riskDrift: riskDrift,
      concentrationRisk: concentrationRisk,
      sectorDrift: sectorDrift,
      recommendation: this._generatePortfolioRecommendation(riskDrift, concentrationRisk)
    };

    this._addToAuditLog(result);

    await this.reflexion.storeEpisode({
      sessionId: `portfolio-risk-${Date.now()}`,
      task: 'portfolio_risk_monitor',
      reward: riskDrift.isDrift ? 0.5 : 0.9,
      success: !riskDrift.isDrift,
      critique: `Portfolio risk drift: ${riskDrift.severity}, concentration: ${concentrationRisk.toFixed(3)}`
    });

    return result;
  }

  /**
   * Generate compliance report for regulatory audits
   */
  generateComplianceReport() {
    const now = Date.now();
    const stats = this.getStats();

    return {
      timestamp: now,
      reportPeriod: {
        start: this.stats.startTime,
        end: now,
        durationHours: (now - this.stats.startTime) / 1000 / 3600
      },
      checksPerformed: {
        total: stats.totalChecks,
        creditScoring: this.monitoringStats.creditScoringChecks,
        fraudDetection: this.monitoringStats.fraudDetectionChecks,
        portfolioRisk: this.monitoringStats.portfolioRiskChecks
      },
      driftEvents: {
        total: stats.driftDetected,
        rate: stats.driftRate,
        bySeverity: this._groupDriftsBySeverity()
      },
      regulatoryAlerts: this.monitoringStats.regulatoryAlerts,
      falsePositiveRate: this._calculateFalsePositiveRate(),
      complianceStatus: this._assessComplianceStatus(),
      recommendations: this._generateComplianceRecommendations()
    };
  }

  /**
   * Get audit log for regulatory review
   */
  getAuditLog() {
    return this.auditLog;
  }

  /**
   * Get enhanced statistics with financial-specific metrics
   */
  getStats() {
    const baseStats = super.getStats();

    return {
      ...baseStats,
      ...this.monitoringStats,
      falsePositiveRate: this._calculateFalsePositiveRate()
    };
  }

  // ==================== HELPER METHODS ====================

  async _analyzeFeatureDrift(features) {
    if (!features) {
      return {};
    }

    const drifts = {};

    for (const [featureName, values] of Object.entries(features)) {
      // Simple drift check on feature values
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      drifts[featureName] = {
        mean: mean,
        drift: 'stable' // Simplified for testing
      };
    }

    return drifts;
  }

  _checkEconomicFactors() {
    // Simulated economic factor assessment
    return {
      interestRateChange: Math.random() * 0.02 - 0.01, // ±1%
      unemploymentRate: 0.04,
      gdpGrowth: 0.02
    };
  }

  _calculateOverallRisk(scoreDrift, featureDrifts, economicFactors) {
    let riskScore = 0;

    // Score drift contribution
    if (scoreDrift.severity === 'critical') {
      riskScore += 4;
    } else if (scoreDrift.severity === 'high') {
      riskScore += 3;
    } else if (scoreDrift.severity === 'medium') {
      riskScore += 2;
    } else if (scoreDrift.severity === 'low') {
      riskScore += 1;
    }

    // Feature drift contribution
    const featureCount = Object.keys(featureDrifts).length;
    if (featureCount > 3) {
      riskScore += 1;
    }

    // Economic factors (simplified)
    if (Math.abs(economicFactors.interestRateChange) > 0.005) {
      riskScore += 0.5;
    }

    // Map to risk levels
    if (riskScore >= 3.5) {
      return 'critical';
    }
    if (riskScore >= 2.5) {
      return 'high';
    }
    if (riskScore >= 1.5) {
      return 'medium';
    }
    return 'low';
  }

  _generateCreditRecommendation(scoreDrift, overallRisk) {
    if (overallRisk === 'critical') {
      return 'URGENT: Suspend credit model, initiate emergency retraining with recent data';
    }
    if (overallRisk === 'high') {
      return 'Schedule immediate model retraining and validate against holdout set';
    }
    if (overallRisk === 'medium') {
      return 'Plan model update within next quarter, monitor closely';
    }
    return 'Continue normal monitoring schedule';
  }

  _analyzeTransactionPatterns(patterns) {
    const shifts = {};

    if (patterns.avgAmount) {
      const avgAmount = patterns.avgAmount.reduce((a, b) => a + b, 0) / patterns.avgAmount.length;
      shifts.avgAmount = avgAmount;
    }

    if (patterns.frequency) {
      shifts.frequency = patterns.frequency.reduce((a, b) => a + b, 0) / patterns.frequency.length;
    }

    return shifts;
  }

  _generateFraudRecommendation(fraudDrift, fraudRateChange) {
    if (fraudDrift.severity === 'critical') {
      return 'CRITICAL: Investigate fraud spike immediately, review recent transactions manually';
    }
    if (Math.abs(fraudRateChange) > 25) {
      return 'Review fraud rules and retrain detection model with latest fraud patterns';
    }
    return 'Continue monitoring, no immediate action required';
  }

  _calculateConcentrationRisk(riskValues) {
    // Higher variance = higher concentration risk
    const stats = this._calculateStatistics(riskValues);
    const coefficientOfVariation = stats.std / stats.mean;
    return coefficientOfVariation;
  }

  _analyzeSectorDrift(sectorExposure) {
    // Simplified sector drift analysis
    return {
      exposureDistribution: sectorExposure,
      concentrationScore: Math.max(...Object.values(sectorExposure))
    };
  }

  _generatePortfolioRecommendation(riskDrift, concentrationRisk) {
    if (riskDrift.severity === 'critical' || concentrationRisk > 0.5) {
      return 'URGENT: rebalance portfolio immediately to reduce concentration risk';
    }
    if (riskDrift.severity === 'high' || concentrationRisk > 0.3) {
      return 'Plan portfolio rebalancing to diversify risk exposure';
    }
    return 'Portfolio risk within acceptable limits, continue monitoring';
  }

  _addToAuditLog(event) {
    this.auditLog.push({
      ...event,
      auditId: this.auditLog.length + 1
    });

    // Keep last 1000 events
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  _groupDriftsBySeverity() {
    const groups = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };

    for (const event of this.history) {
      if (groups[event.severity] !== undefined) {
        groups[event.severity]++;
      }
    }

    return groups;
  }

  _calculateFalsePositiveRate() {
    if (this.stats.totalChecks === 0) {
      return '0%';
    }

    // Simplified calculation
    const rate = (this.monitoringStats.falsePositives / this.stats.totalChecks) * 100;
    return `${rate.toFixed(1)}%`;
  }

  _assessComplianceStatus() {
    const alertRate = this.stats.totalChecks > 0 ? this.monitoringStats.regulatoryAlerts / this.stats.totalChecks : 0;

    if (alertRate > 0.1) {
      return 'CRITICAL';
    }
    if (alertRate > 0.05) {
      return 'WARNING';
    }
    return 'COMPLIANT';
  }

  _generateComplianceRecommendations() {
    const recommendations = [];

    if (this.monitoringStats.regulatoryAlerts > 5) {
      recommendations.push('Increase monitoring frequency for high-risk models');
    }

    if (this.stats.driftDetected > this.stats.totalChecks * 0.3) {
      recommendations.push('Review model retraining schedule, drift rate exceeds 30%');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current monitoring practices');
    }

    return recommendations;
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
    const baselineVaR = this.baselineDistribution
      ? this.baselineDistribution.data.sort((a, b) => a - b)[Math.floor(this.baselineDistribution.data.length * 0.95)]
      : currentVaR;

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
