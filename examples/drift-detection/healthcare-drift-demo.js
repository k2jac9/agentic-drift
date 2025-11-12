#!/usr/bin/env node
/**
 * Healthcare Data Drift Detection Demo
 *
 * Demonstrates patient safety-critical drift detection:
 * - Patient outcome prediction drift
 * - Diagnostic system performance across populations
 * - Treatment recommendation drift
 * - Disease prevalence shifts
 */

import { HealthcareDriftMonitor } from '../../src/use-cases/HealthcareDriftMonitor.js';
import { AdaptiveResponseSystem } from '../../src/adapters/AdaptiveResponseSystem.js';

async function runHealthcareDriftDemo() {
  console.log('\n🏥 HEALTHCARE DATA DRIFT DETECTION DEMO');
  console.log('=' .repeat(70));
  console.log('Simulating patient safety-critical drift scenarios\n');

  const monitor = new HealthcareDriftMonitor({
    driftThreshold: 0.08, // Lower threshold for healthcare
    predictionWindow: 14,
    autoAdapt: true
  });

  const adaptiveSystem = new AdaptiveResponseSystem({
    autoExecute: false, // Manual approval for healthcare
    confidenceThreshold: 0.8
  });

  // ===== Scenario 1: Patient Outcome Drift =====
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 1: Patient Outcome Prediction Drift - Population Change');
  console.log('='.repeat(70));

  // Baseline patient outcomes (original population)
  const baselineOutcomes = generateBetaDistribution(800, 8, 2); // Good outcomes
  await monitor.setBaseline(baselineOutcomes, {
    period: 'Jan-Mar 2024',
    population: 'original_cohort',
    avgAge: 52,
    conditions: ['diabetes', 'hypertension']
  });

  // Current outcomes (different demographics/lifestyle)
  const currentOutcomes = generateBetaDistribution(800, 7, 3); // Slightly worse

  const patientFeatures = {
    age: generateNormalDistribution(800, 58, 12), // Older population
    bmi: generateNormalDistribution(800, 28.5, 5.2), // Higher BMI
    blood_pressure: generateNormalDistribution(800, 132, 18),
    cholesterol: generateNormalDistribution(800, 210, 35)
  };

  const outcomeResult = await monitor.monitorPatientOutcomes(currentOutcomes, patientFeatures);

  if (outcomeResult.patientSafetyRisk !== 'none') {
    console.log('\n🤖 Adaptive Response System Analysis:');
    const response = await adaptiveSystem.respond(outcomeResult.outcomeDrift, {
      modelType: 'patient_outcome',
      safetyLevel: 'critical',
      populationType: 'chronic_disease'
    });

    console.log('\n⚕️  Clinical Review Required:');
    console.log('   Manual approval needed for healthcare interventions');
    console.log(`   Confidence: ${((response.recommendations?.confidence || 0) * 100).toFixed(1)}%`);
    console.log(`   Recommendations: ${response.recommendations?.actions.length || 0} actions proposed`);
  }

  // ===== Scenario 2: Diagnostic System Drift =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 2: Diagnostic System - Population Fairness Check');
  console.log('='.repeat(70));

  const baselineDiagnostics = generateBetaDistribution(1000, 9, 1);
  await monitor.setBaseline(baselineDiagnostics, {
    period: 'Q1 2024',
    system: 'imaging_classifier',
    accuracy: 0.94
  });

  // Simulate performance variation across demographics
  const currentDiagnostics = [
    ...generateBetaDistribution(250, 9.5, 1), // Group 1: Better
    ...generateBetaDistribution(300, 9, 1),   // Group 2: Baseline
    ...generateBetaDistribution(250, 8, 1.5), // Group 3: Worse
    ...generateBetaDistribution(200, 7.5, 2)  // Group 4: Significantly worse
  ];

  const patientDemographics = {
    ageGroups: ['18-30', '31-50', '51-70', '70+'],
    ethnicities: ['group_a', 'group_b', 'group_c', 'group_d']
  };

  const diagnosticResult = await monitor.monitorDiagnosticSystem(currentDiagnostics, patientDemographics);

  if (diagnosticResult.fairnessMetrics.disparityScore > 0.15) {
    console.log('\n⚠️  BIAS ALERT: Significant performance disparity detected');
    console.log('   This requires immediate clinical review and model audit');
  }

  // ===== Scenario 3: Treatment Recommendations =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 3: Treatment Recommendation System Drift');
  console.log('='.repeat(70));

  const baselineTreatments = generateBetaDistribution(600, 8, 2);
  await monitor.setBaseline(baselineTreatments);

  // New medical guidelines affect recommendations
  const currentTreatments = generateBetaDistribution(600, 7.5, 2.5);

  const treatmentData = {
    protocols: ['protocol_a', 'protocol_b', 'protocol_c'],
    medications: ['med_1', 'med_2', 'med_3'],
    outcomes: generateNormalDistribution(600, 0.85, 0.12)
  };

  await monitor.monitorTreatmentRecommendations(currentTreatments, treatmentData);

  // ===== Scenario 4: Disease Prevalence Monitoring =====
  console.log('\n\n' + '='.repeat(70));
  console.log('SCENARIO 4: Disease Prevalence - Epidemiological Shift');
  console.log('='.repeat(70));

  const baselinePrevalence = generateBetaDistribution(400, 1.5, 20); // Low prevalence
  await monitor.setBaseline(baselinePrevalence, {
    disease: 'respiratory_infection',
    season: 'spring',
    region: 'northeast'
  });

  // Sudden increase in prevalence (outbreak scenario)
  const currentPrevalence = generateBetaDistribution(400, 2.5, 15); // Higher prevalence

  const populationData = {
    totalPopulation: 500000,
    region: 'northeast',
    vaccinationRate: 0.72
  };

  const prevalenceResult = await monitor.monitorDiseasePrevalence(currentPrevalence, populationData);

  if (prevalenceResult.publicHealthImpact === 'high') {
    console.log('\n🚨 PUBLIC HEALTH ALERT');
    console.log('   Significant increase in disease prevalence detected');
    console.log('   Public health authorities should be notified');
  }

  // ===== Summary =====
  console.log('\n\n' + '='.repeat(70));
  console.log('DEMO SUMMARY');
  console.log('='.repeat(70));

  const stats = monitor.getStats();
  const adaptiveStats = adaptiveSystem.getStats();

  console.log('\n📊 Detection Statistics:');
  console.log(`   Total Checks: ${stats.totalChecks}`);
  console.log(`   Drifts Detected: ${stats.driftsDetected}`);
  console.log(`   Safety Alerts: ${stats.alerts?.length || 0}`);
  console.log(`   Adaptations Triggered: ${stats.adaptations}`);

  console.log('\n✅ Demo Complete!');
  console.log('\nKey Takeaways:');
  console.log('  • Lower drift threshold (0.08) for patient safety');
  console.log('  • Detected population shifts affecting patient outcomes');
  console.log('  • Identified diagnostic system bias across demographics');
  console.log('  • Monitored treatment recommendation changes');
  console.log('  • Tracked disease prevalence for public health');
  console.log('  • Manual approval required for critical interventions\n');
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

runHealthcareDriftDemo().catch(console.error);
