/**
 * ManufacturingDriftMonitor - Enterprise Data Drift Detection for Manufacturing
 *
 * Use Cases:
 * - Quality Control: Detect when raw material changes affect product quality
 * - Predictive Maintenance: Monitor equipment sensor drift
 * - Process Optimization: Track production parameter changes
 * - Supply Chain: Detect supplier quality variations
 *
 * Research shows: Drift may be associated with new raw material suppliers,
 * requiring production batches to be singled out when new materials are used.
 */

import { DriftEngine } from '../core/DriftEngine.js';

export class ManufacturingDriftMonitor extends DriftEngine {
  constructor(config = {}) {
    super({
      driftThreshold: config.driftThreshold || 0.12,
      predictionWindow: config.predictionWindow || 7, // 7 days for manufacturing
      autoAdapt: config.autoAdapt !== false,
      ...config
    });

    this.modelType = config.modelType || 'quality_control';
    this.productionLine = config.productionLine || 'line_1';
  }

  /**
   * Monitor quality control model drift
   * Critical for maintaining product standards
   */
  async monitorQualityControl(qualityScores, productionParams) {
    console.log('\n🏭 Manufacturing - Quality Control Drift Monitor');
    console.log('=' .repeat(60));

    // Detect drift in quality scores
    const qualityDrift = await this.detectDrift(qualityScores, {
      context: 'quality_control'
    });

    // Analyze production parameter drift
    const parameterDrift = await this._analyzeProductionParameters(productionParams);

    // Check for supplier changes
    const supplierDrift = this._detectSupplierChanges(productionParams);

    // Predict future quality issues
    const prediction = await this.predictDrift(7); // 7 days ahead

    const result = {
      timestamp: Date.now(),
      modelType: 'quality_control',
      productionLine: this.productionLine,
      qualityDrift: qualityDrift,
      parameterDrift: parameterDrift,
      supplierDrift: supplierDrift,
      prediction: prediction,
      productionImpact: this._assessProductionImpact(qualityDrift, parameterDrift, supplierDrift),
      recommendations: []
    };

    // Generate actionable recommendations
    if (result.productionImpact === 'high' || result.productionImpact === 'critical') {
      result.recommendations.push('🚨 PRODUCTION ALERT: Quality drift detected');
      result.recommendations.push('Inspect recent production batches');
      result.recommendations.push('Review raw material quality');

      if (supplierDrift.newSupplier) {
        result.recommendations.push(`New supplier detected: ${supplierDrift.supplierInfo.name}`);
        result.recommendations.push('Implement enhanced quality checks for new supplier batches');
      }

      if (qualityDrift.severity === 'critical') {
        result.recommendations.push('CRITICAL: Consider halting production line for inspection');
        await this._triggerProductionAlert(result);
      }
    } else if (prediction.prediction === 'drift_likely') {
      result.recommendations.push('Proactive alert: Drift predicted in next 7 days');
      result.recommendations.push('Schedule preventive maintenance');
      result.recommendations.push('Increase quality inspection frequency');
    }

    console.log(`Drift Status: ${qualityDrift.isDrift ? '⚠️  DRIFT DETECTED' : '✓ No Drift'}`);
    console.log(`Severity: ${qualityDrift.severity.toUpperCase()}`);
    console.log(`Production Impact: ${result.productionImpact.toUpperCase()}`);
    console.log(`Prediction (7d): ${prediction.prediction} (${(prediction.confidence * 100).toFixed(1)}% confidence)`);

    // Learn from manufacturing drift
    await this._learnFromManufacturingDrift(result);

    return result;
  }

  /**
   * Monitor predictive maintenance models
   * Prevent equipment failures before they occur
   */
  async monitorPredictiveMaintenance(sensorReadings, equipmentData) {
    console.log('\n⚙️  Manufacturing - Predictive Maintenance Drift Monitor');
    console.log('=' .repeat(60));

    const sensorDrift = await this.detectDrift(sensorReadings);

    // Analyze equipment degradation patterns
    const degradationPattern = this._analyzeEquipmentDegradation(sensorReadings);

    // Detect anomalous failure modes
    const failureMode = this._detectFailureMode(sensorReadings, equipmentData);

    const result = {
      timestamp: Date.now(),
      modelType: 'predictive_maintenance',
      sensorDrift: sensorDrift,
      degradationPattern: degradationPattern,
      failureMode: failureMode,
      maintenanceUrgency: this._assessMaintenanceUrgency(sensorDrift, degradationPattern),
      recommendations: []
    };

    if (result.maintenanceUrgency === 'high' || result.maintenanceUrgency === 'critical') {
      result.recommendations.push('⚠️  MAINTENANCE ALERT: Equipment anomaly detected');
      result.recommendations.push('Schedule immediate inspection');
      result.recommendations.push('Prepare replacement parts');

      if (failureMode.detected) {
        result.recommendations.push(`Specific failure mode detected: ${failureMode.mode}`);
        result.recommendations.push('Review maintenance history for similar patterns');
      }
    }

    console.log(`Drift Status: ${sensorDrift.isDrift ? '⚠️  DRIFT DETECTED' : '✓ No Drift'}`);
    console.log(`Maintenance Urgency: ${result.maintenanceUrgency.toUpperCase()}`);
    console.log(`Degradation Rate: ${degradationPattern.rate.toFixed(2)}% per day`);

    return result;
  }

  /**
   * Monitor process optimization models
   */
  async monitorProcessOptimization(efficiencyScores, processParams) {
    console.log('\n📊 Manufacturing - Process Optimization Drift Monitor');
    console.log('=' .repeat(60));

    const efficiencyDrift = await this.detectDrift(efficiencyScores);

    // Analyze process parameter stability
    const parameterStability = this._analyzeParameterStability(processParams);

    // Calculate throughput impact
    const throughputImpact = this._calculateThroughputImpact(efficiencyDrift);

    const result = {
      timestamp: Date.now(),
      modelType: 'process_optimization',
      efficiencyDrift: efficiencyDrift,
      parameterStability: parameterStability,
      throughputImpact: throughputImpact,
      recommendations: []
    };

    if (throughputImpact.percentChange < -5) {
      result.recommendations.push('Efficiency decline detected');
      result.recommendations.push('Review recent process changes');
      result.recommendations.push('Consider process parameter recalibration');
    } else if (throughputImpact.percentChange > 5) {
      result.recommendations.push('Efficiency improvement detected');
      result.recommendations.push('Document successful process changes');
      result.recommendations.push('Consider applying changes to other production lines');
    }

    console.log(`Drift Status: ${efficiencyDrift.isDrift ? '⚠️  DRIFT DETECTED' : '✓ No Drift'}`);
    console.log(`Throughput Impact: ${throughputImpact.percentChange.toFixed(2)}%`);

    return result;
  }

  /**
   * Monitor supply chain quality variations
   */
  async monitorSupplyChain(componentQuality, supplierData) {
    console.log('\n📦 Manufacturing - Supply Chain Drift Monitor');
    console.log('=' .repeat(60));

    const qualityDrift = await this.detectDrift(componentQuality);

    // Analyze supplier performance trends
    const supplierPerformance = this._analyzeSupplierPerformance(supplierData);

    // Detect supply chain disruptions
    const disruptions = this._detectSupplyChainDisruptions();

    const result = {
      timestamp: Date.now(),
      modelType: 'supply_chain',
      qualityDrift: qualityDrift,
      supplierPerformance: supplierPerformance,
      disruptions: disruptions,
      recommendations: []
    };

    if (qualityDrift.severity === 'high' || qualityDrift.severity === 'critical') {
      result.recommendations.push('Component quality variation detected');
      result.recommendations.push('Engage with suppliers for quality assurance');
      result.recommendations.push('Consider alternative suppliers');
    }

    console.log(`Drift Status: ${qualityDrift.isDrift ? '⚠️  DRIFT DETECTED' : '✓ No Drift'}`);
    console.log(`Supplier Performance: ${supplierPerformance.avgScore.toFixed(2)}/10`);

    return result;
  }

  // ==================== HELPER METHODS ====================

  async _analyzeProductionParameters(params) {
    const drifts = [];

    const criticalParams = ['temperature', 'pressure', 'speed', 'material_thickness'];

    for (const param of criticalParams) {
      if (params[param]) {
        const drift = await this.detectDrift(params[param]);
        drifts.push({
          parameter: param,
          drift: drift.isDrift,
          score: drift.averageScore,
          severity: drift.severity
        });
      }
    }

    return drifts;
  }

  _detectSupplierChanges(productionParams) {
    // In production, integrate with supply chain management system
    // For demo, simulate supplier change detection
    return {
      newSupplier: false,
      supplierInfo: null,
      lastChange: null
    };
  }

  _assessProductionImpact(qualityDrift, parameterDrift, supplierDrift) {
    let impactScore = 0;

    // Quality drift is primary indicator
    if (qualityDrift.severity === 'critical') impactScore += 4;
    else if (qualityDrift.severity === 'high') impactScore += 3;
    else if (qualityDrift.severity === 'medium') impactScore += 2;
    else if (qualityDrift.severity === 'low') impactScore += 1;

    // Parameter drift adds to impact
    const criticalParams = parameterDrift.filter(p => p.severity === 'high' || p.severity === 'critical').length;
    impactScore += criticalParams * 0.5;

    // Supplier change adds uncertainty
    if (supplierDrift.newSupplier) impactScore += 1;

    if (impactScore >= 3.5) return 'critical';
    if (impactScore >= 2.5) return 'high';
    if (impactScore >= 1.5) return 'medium';
    if (impactScore >= 0.5) return 'low';
    return 'none';
  }

  _analyzeEquipmentDegradation(sensorReadings) {
    // Analyze degradation trend from sensor data
    const trend = this._calculateTrend(sensorReadings);

    return {
      rate: trend * 100, // Convert to percentage
      pattern: trend > 0.01 ? 'accelerating' : trend < -0.01 ? 'improving' : 'stable',
      estimatedLifespan: trend > 0 ? Math.floor(100 / (trend * 100)) : Infinity
    };
  }

  _detectFailureMode(sensorReadings, equipmentData) {
    // In production, use ML to detect specific failure modes
    // For demo, simulate failure mode detection
    const avgReading = this._calculateMean(sensorReadings);
    const baseline = this.baselineDistribution ? this.baselineDistribution.mean : avgReading;

    const deviation = Math.abs(avgReading - baseline) / baseline;

    if (deviation > 0.3) {
      return {
        detected: true,
        mode: 'bearing_wear',
        confidence: Math.min(0.95, deviation)
      };
    }

    return {
      detected: false,
      mode: null,
      confidence: 0
    };
  }

  _assessMaintenanceUrgency(sensorDrift, degradationPattern) {
    let urgency = 0;

    if (sensorDrift.severity === 'critical') urgency += 4;
    else if (sensorDrift.severity === 'high') urgency += 3;
    else if (sensorDrift.severity === 'medium') urgency += 2;
    else if (sensorDrift.severity === 'low') urgency += 1;

    if (degradationPattern.pattern === 'accelerating') urgency += 1;

    if (urgency >= 3.5) return 'critical';
    if (urgency >= 2.5) return 'high';
    if (urgency >= 1.5) return 'medium';
    if (urgency >= 0.5) return 'low';
    return 'none';
  }

  _analyzeParameterStability(processParams) {
    // Analyze stability of process parameters
    const stability = {
      stable: 0,
      unstable: 0,
      critical: 0
    };

    for (const [param, values] of Object.entries(processParams)) {
      if (Array.isArray(values)) {
        const std = this._calculateStd(values);
        const mean = this._calculateMean(values);
        const cv = mean > 0 ? std / mean : 0; // Coefficient of variation

        if (cv < 0.05) stability.stable++;
        else if (cv < 0.15) stability.unstable++;
        else stability.critical++;
      }
    }

    return stability;
  }

  _calculateThroughputImpact(efficiencyDrift) {
    const baseline = this.baselineDistribution ? this.baselineDistribution.mean : 1;
    const current = efficiencyDrift.scores.statistical || 0;

    return {
      percentChange: ((baseline - current) / baseline) * 100,
      baseline: baseline,
      current: current
    };
  }

  _analyzeSupplierPerformance(supplierData) {
    // Analyze supplier quality trends
    return {
      avgScore: 8.5, // Out of 10
      trend: 'stable',
      onTimeDelivery: 0.95
    };
  }

  _detectSupplyChainDisruptions() {
    // In production, integrate with supply chain monitoring
    return {
      detected: false,
      type: null,
      severity: 'none'
    };
  }

  async _triggerProductionAlert(result) {
    console.log('\n🚨 PRODUCTION ALERT TRIGGERED');
    console.log('Notifying production manager...');

    this.stats.adaptations++;
    this.episodeMemory.push({
      sessionId: `production-alert-${Date.now()}`,
      task: 'production_response',
      reward: 0.9,
      success: true,
      critique: `Production alert triggered due to ${result.qualityDrift.severity} quality drift`
    });

    this.alerts.push({
      type: 'production_quality',
      severity: 'critical',
      timestamp: Date.now(),
      message: 'Critical quality drift detected',
      result: result
    });
  }

  async _learnFromManufacturingDrift(result) {
    // Store manufacturing-specific drift patterns
    this.skillMemory.push({
      name: `manufacturing_drift_${result.modelType}_${Date.now()}`,
      description: `Manufacturing drift in ${result.modelType} with ${result.productionImpact} production impact`,
      signature: {
        inputs: { modelType: 'string', parameters: 'object' },
        outputs: { impact: 'string', recommendations: 'array' }
      },
      successRate: result.qualityDrift.isDrift ? 0.7 : 0.93,
      uses: 1,
      avgReward: result.qualityDrift.isDrift ? 0.65 : 0.9,
      avgLatencyMs: 0
    });
  }
}
