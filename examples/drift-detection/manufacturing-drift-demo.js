#!/usr/bin/env node
/**
 * Manufacturing Data Drift Detection Demo
 *
 * Demonstrates production-critical drift detection:
 * - Quality control drift from supplier changes
 * - Predictive maintenance sensor drift
 * - Process optimization drift
 * - Supply chain quality variations
 */

import { ManufacturingDriftMonitor } from '../../src/use-cases/ManufacturingDriftMonitor.js';
import { AdaptiveResponseSystem } from '../../src/adapters/AdaptiveResponseSystem.js';

async function runManufacturingDriftDemo() {
  console.log('\n🏭 MANUFACTURING DATA DRIFT DETECTION DEMO');
  console.log('=' .repeat(70));
  console.log('Simulating production-critical drift scenarios\n');

  const monitor = new ManufacturingDriftMonitor({
    driftThreshold: 0.12,
    predictionWindow: 7,
    autoAdapt: true,
    productionLine: 'Assembly_Line_1'
  });

  const adaptiveSystem = new AdaptiveResponseSystem({
    autoExecute: true,
    confidenceThreshold: 0.7
  });

  // ===== Scenario 1: Quality Control Drift - Supplier Change =====
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 1: Quality Control Drift - New Raw Material Supplier');
  console.log('='.repeat(70));

  // Baseline quality (original supplier)
  const baselineQuality = generateNormalDistribution(1000, 98.5, 0.8);
  await monitor.setBaseline(baselineQuality, {
    period: 'Q1 2024',
    supplier: 'Supplier_A',
    rawMaterial: 'steel_grade_304',
    targetQuality: 98.5
  });

  // Current quality (new supplier with different characteristics)
  const currentQuality = generateNormalDistribution(1000, 97.2, 1.5); // Lower mean, higher variance

  const productionParams = {
    temperature: generateNormalDistribution(1000, 425, 8), // Slightly different
    pressure: generateNormalDistribution(1000, 15.2, 0.5),
    speed: generateNormalDistribution(1000, 12.5, 0.3),
    material_thickness: generateNormalDistribution(1000, 2.1, 0.15),
    supplier: 'Supplier_B' // New supplier
  };

  const qualityResult = await monitor.monitorQualityControl(currentQuality, productionParams);

  if (qualityResult.qualityDrift.isDrift) {
    console.log('\n🤖 Activating Adaptive Response System...');
    const response = await adaptiveSystem.respond(qualityResult.qualityDrift, {
      modelType: 'quality_control',
      productionLine: 'Assembly_Line_1',
      supplierChange: true
    });

    console.log('\n📋 Response Actions:');
    response.recommendations?.actions.forEach((action, i) => {
      console.log(`   ${i + 1}. [${action.priority.toUpperCase()}] ${action.description}`);
    });
  }

  // Predict future quality issues
  const qualityPrediction = await monitor.predictDrift(7);
  console.log(`\n🔮 Quality Prediction (7 days): ${qualityPrediction.prediction}`);
  console.log(`   Recommendation: ${qualityPrediction.recommendation}`);

  // ===== Scenario 2: Predictive Maintenance - Equipment Degradation =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 2: Predictive Maintenance - Equipment Sensor Drift');
  console.log('='.repeat(70));

  // Baseline sensor readings (healthy equipment)
  const baselineSensors = generateNormalDistribution(800, 75, 3);
  await monitor.setBaseline(baselineSensors, {
    equipment: 'Turbine_A',
    sensorType: 'vibration',
    installDate: '2023-01-15',
    lastMaintenance: '2024-01-01'
  });

  // Current sensor readings (equipment degrading)
  const currentSensors = generateNormalDistribution(800, 82, 5.5); // Higher mean and variance

  const equipmentData = {
    operatingHours: 8760, // 1 year
    temperature: generateNormalDistribution(800, 185, 12),
    pressure: generateNormalDistribution(800, 42, 3),
    rpm: generateNormalDistribution(800, 3600, 45),
    lastAnomaly: '2024-02-15'
  };

  const maintenanceResult = await monitor.monitorPredictiveMaintenance(currentSensors, equipmentData);

  if (maintenanceResult.maintenanceUrgency === 'high' || maintenanceResult.maintenanceUrgency === 'critical') {
    console.log('\n⚠️  MAINTENANCE ALERT TRIGGERED');
    console.log(`   Urgency: ${maintenanceResult.maintenanceUrgency.toUpperCase()}`);
    console.log(`   Degradation Rate: ${maintenanceResult.degradationPattern.rate.toFixed(2)}% per day`);

    if (maintenanceResult.failureMode.detected) {
      console.log(`   Failure Mode: ${maintenanceResult.failureMode.mode}`);
      console.log(`   Confidence: ${(maintenanceResult.failureMode.confidence * 100).toFixed(1)}%`);
    }
  }

  // ===== Scenario 3: Process Optimization Drift =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 3: Process Optimization - Efficiency Monitoring');
  console.log('='.repeat(70));

  const baselineEfficiency = generateBetaDistribution(600, 15, 2);
  await monitor.setBaseline(baselineEfficiency, {
    process: 'assembly',
    targetEfficiency: 0.92,
    shift: 'day'
  });

  // Efficiency drift (process improvement)
  const currentEfficiency = generateBetaDistribution(600, 18, 1.5); // Improved!

  const processParams = {
    temperature: generateNormalDistribution(600, 215, 5),
    humidity: generateNormalDistribution(600, 45, 8),
    line_speed: generateNormalDistribution(600, 14.2, 0.4),
    worker_count: generateNormalDistribution(600, 12, 1)
  };

  const efficiencyResult = await monitor.monitorProcessOptimization(currentEfficiency, processParams);

  if (efficiencyResult.throughputImpact.percentChange > 5) {
    console.log('\n✅ POSITIVE DRIFT: Efficiency improvement detected!');
    console.log(`   Throughput Impact: +${efficiencyResult.throughputImpact.percentChange.toFixed(2)}%`);
    console.log('   Recommendation: Document and replicate across other lines');
  }

  // ===== Scenario 4: Supply Chain Quality Monitoring =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 4: Supply Chain Quality - Component Variation');
  console.log('='.repeat(70));

  const baselineComponents = generateBetaDistribution(500, 12, 1);
  await monitor.setBaseline(baselineComponents, {
    component: 'circuit_board',
    suppliers: ['Supplier_X', 'Supplier_Y'],
    specification: 'IPC-A-610'
  });

  // Component quality variation
  const currentComponents = generateBetaDistribution(500, 10, 2.5);

  const supplierData = {
    supplier_x_quality: 0.96,
    supplier_y_quality: 0.89, // Lower
    delivery_times: generateNormalDistribution(500, 5, 2),
    defect_rates: generateBetaDistribution(500, 1, 25)
  };

  const supplyChainResult = await monitor.monitorSupplyChain(currentComponents, supplierData);

  // ===== Summary =====
  console.log('\n\n' + '='.repeat(70));
  console.log('DEMO SUMMARY');
  console.log('='.repeat(70));

  const stats = monitor.getStats();
  const adaptiveStats = adaptiveSystem.getStats();

  console.log('\n📊 Detection Statistics:');
  console.log(`   Total Checks: ${stats.totalChecks}`);
  console.log(`   Drifts Detected: ${stats.driftsDetected}`);
  console.log(`   Production Alerts: ${stats.alerts?.length || 0}`);
  console.log(`   Adaptive Actions: ${stats.adaptations}`);

  console.log('\n🤖 Adaptive Response Statistics:');
  console.log(`   Total Responses: ${adaptiveStats.totalResponses}`);
  console.log(`   Success Rate: ${adaptiveStats.successRate}`);

  console.log('\n✅ Demo Complete!');
  console.log('\nKey Takeaways:');
  console.log('  • Detected quality drift from new supplier');
  console.log('  • Predicted equipment failure 7 days in advance');
  console.log('  • Identified process improvements (+efficiency drift)');
  console.log('  • Monitored supply chain component quality');
  console.log('  • Automated production alerts and responses');
  console.log('  • Prevented costly downtime through predictive monitoring\n');
}

// Helper functions
function generateNormalDistribution(n, mean, stdDev) {
  const values = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    values.push(mean + z0 * stdDev);
  }
  return values;
}

function generateBetaDistribution(n, alpha, beta) {
  const values = [];
  for (let i = 0; i < n; i++) {
    const x = gammaRandom(alpha);
    const y = gammaRandom(beta);
    values.push(x / (x + y));
  }
  return values;
}

function gammaRandom(alpha) {
  if (alpha < 1) {
    return gammaRandom(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
  }

  const d = alpha - 1/3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x, v;
    do {
      x = gaussianRandom();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function gaussianRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

runManufacturingDriftDemo().catch(console.error);
