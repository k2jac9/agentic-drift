#!/usr/bin/env node
/**
 * Financial Data Drift Detection Demo
 *
 * Demonstrates enterprise-grade drift detection for financial services:
 * - Credit scoring model drift
 * - Fraud detection pattern shifts
 * - Portfolio risk distribution changes
 */

import { FinancialDriftMonitor } from '../../src/use-cases/FinancialDriftMonitor.js';
import { AdaptiveResponseSystem } from '../../src/adapters/AdaptiveResponseSystem.js';

async function runFinancialDriftDemo() {
  console.log('\n💰 FINANCIAL DATA DRIFT DETECTION DEMO');
  console.log('=' .repeat(70));
  console.log('Simulating real-world financial services drift scenarios\n');

  // Initialize financial drift monitor
  const monitor = new FinancialDriftMonitor({
    driftThreshold: 0.15,
    predictionWindow: 30,
    autoAdapt: true
  });

  // Initialize adaptive response system
  const adaptiveSystem = new AdaptiveResponseSystem({
    autoExecute: true,
    confidenceThreshold: 0.7
  });

  // ===== Scenario 1: Credit Scoring Drift =====
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 1: Credit Scoring Model Drift During Economic Downturn');
  console.log('='.repeat(70));

  // Baseline credit scores (normal economy)
  const baselineCreditScores = generateNormalDistribution(1000, 700, 50);
  await monitor.setBaseline(baselineCreditScores, {
    period: 'Q1 2024',
    economy: 'stable',
    avgIncome: 75000
  });

  // Current credit scores (economic downturn - shift downward)
  const currentCreditScores = generateNormalDistribution(1000, 665, 55); // Lower mean, higher variance

  // Simulate feature data
  const applicantFeatures = {
    income: generateNormalDistribution(1000, 68000, 18000), // Lower income
    debt_ratio: generateNormalDistribution(1000, 0.42, 0.12), // Higher debt ratio
    credit_history: generateNormalDistribution(1000, 8.5, 2.5),
    employment_length: generateNormalDistribution(1000, 5.2, 3.1)
  };

  // Monitor credit scoring drift
  const creditResult = await monitor.monitorCreditScoring(currentCreditScores, applicantFeatures);

  // Generate adaptive response
  if (creditResult.scoreDrift.isDrift) {
    console.log('\n🤖 Activating Adaptive Response System...');
    const response = await adaptiveSystem.respond(creditResult.scoreDrift, {
      modelType: 'credit_scoring',
      businessImpact: 'high'
    });

    console.log('\n📋 Response Summary:');
    console.log(`   Actions Recommended: ${response.recommendations?.actions.length || 0}`);
    console.log(`   Actions Executed: ${response.execution?.completedActions || 0}`);
    console.log(`   Response Confidence: ${((response.recommendations?.confidence || 0) * 100).toFixed(1)}%`);
  }

  // Predict future drift
  console.log('\n🔮 Predicting Future Drift...');
  const prediction = await monitor.predictDrift(30);
  console.log(`Prediction (30 days): ${prediction.prediction}`);
  console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
  console.log(`Recommendation: ${prediction.recommendation}`);

  // ===== Scenario 2: Fraud Detection Drift =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 2: Fraud Detection - New Fraud Tactics Emerging');
  console.log('='.repeat(70));

  // Baseline fraud scores
  const baselineFraudScores = generateBetaDistribution(1000, 2, 10); // Most legitimate
  await monitor.setBaseline(baselineFraudScores, {
    period: 'January 2024',
    fraudRate: 0.02,
    avgTransactionSize: 85
  });

  // Current fraud scores (new fraud patterns)
  const currentFraudScores = generateBetaDistribution(1000, 3, 8); // More fraud signals

  const transactionFeatures = {
    amounts: generateLogNormalDistribution(1000, 100, 2),
    frequencies: generatePoissonDistribution(1000, 5),
    locations: Array.from({ length: 1000 }, () => Math.floor(Math.random() * 50))
  };

  const fraudResult = await monitor.monitorFraudDetection(currentFraudScores, transactionFeatures);

  if (fraudResult.fraudDrift.isDrift) {
    console.log('\n🤖 Activating Adaptive Response System...');
    const response = await adaptiveSystem.respond(fraudResult.fraudDrift, {
      modelType: 'fraud_detection',
      businessImpact: 'critical'
    });
  }

  // ===== Scenario 3: Portfolio Risk Drift =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 3: Portfolio Risk Distribution Shift');
  console.log('='.repeat(70));

  const baselineRiskScores = generateNormalDistribution(500, 0.15, 0.05);
  await monitor.setBaseline(baselineRiskScores, {
    period: 'Q1 2024',
    marketCondition: 'stable'
  });

  const currentRiskScores = generateNormalDistribution(500, 0.22, 0.08); // Higher risk

  const portfolioFeatures = {
    allocation: { stocks: 0.6, bonds: 0.3, cash: 0.1 },
    sectors: ['tech', 'finance', 'healthcare', 'energy']
  };

  const riskResult = await monitor.monitorPortfolioRisk(currentRiskScores, portfolioFeatures);

  // ===== Summary =====
  console.log('\n\n' + '='.repeat(70));
  console.log('DEMO SUMMARY');
  console.log('='.repeat(70));

  const stats = monitor.getStats();
  const adaptiveStats = adaptiveSystem.getStats();

  console.log('\n📊 Detection Statistics:');
  console.log(`   Total Checks: ${stats.totalChecks}`);
  console.log(`   Drifts Detected: ${stats.driftsDetected}`);
  console.log(`   Drift Rate: ${stats.driftRate}`);
  console.log(`   Predictions Made: ${stats.driftsPredicted}`);

  console.log('\n🤖 Adaptive Response Statistics:');
  console.log(`   Total Responses: ${adaptiveStats.totalResponses}`);
  console.log(`   Success Rate: ${adaptiveStats.successRate}`);
  console.log(`   Avg Response Time: ${adaptiveStats.avgResponseTime.toFixed(0)}ms`);

  console.log('\n✅ Demo Complete!');
  console.log('\nKey Takeaways:');
  console.log('  • Detected credit scoring drift due to economic changes');
  console.log('  • Identified new fraud patterns and triggered adaptive response');
  console.log('  • Monitored portfolio risk distribution shifts');
  console.log('  • Predicted future drift with 30-day forecasting');
  console.log('  • Automated responses executed successfully\n');
}

// ===== HELPER FUNCTIONS =====

function generateNormalDistribution(n, mean, stdDev) {
  const values = [];
  for (let i = 0; i < n; i++) {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    values.push(mean + z0 * stdDev);
  }
  return values;
}

function generateBetaDistribution(n, alpha, beta) {
  // Approximation using gamma distribution
  const values = [];
  for (let i = 0; i < n; i++) {
    const x = gammaRandom(alpha);
    const y = gammaRandom(beta);
    values.push(x / (x + y));
  }
  return values;
}

function gammaRandom(alpha) {
  // Marsaglia and Tsang method
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

function generateLogNormalDistribution(n, median, spread) {
  return generateNormalDistribution(n, 0, 1).map(x =>
    median * Math.exp(spread * x)
  );
}

function generatePoissonDistribution(n, lambda) {
  const values = [];
  for (let i = 0; i < n; i++) {
    let l = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > l);
    values.push(k - 1);
  }
  return values;
}

// Run the demo
runFinancialDriftDemo().catch(console.error);
