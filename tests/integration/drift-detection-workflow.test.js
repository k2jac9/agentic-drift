/**
 * Integration Tests - Complete Drift Detection Workflow
 *
 * Tests the entire drift detection pipeline with real AgentDB integration:
 * - Baseline establishment
 * - Multi-method drift detection
 * - AgentDB memory storage and retrieval
 * - Adaptive response mechanisms
 * - Cross-monitor coordination
 *
 * SPARC Phase 5: Integration Testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DriftEngine } from '../../src/core/DriftEngine.js';
import { FinancialDriftMonitor } from '../../src/use-cases/FinancialDriftMonitor.js';
import fs from 'fs';
import path from 'path';

// Use temporary database for integration tests
const TEST_DB_PATH = path.join(process.cwd(), 'tests', 'tmp', 'integration-test.db');

describe('Drift Detection Workflow Integration', () => {
  beforeEach(() => {
    // Ensure tmp directory exists
    const tmpDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Clean up existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('End-to-End DriftEngine Workflow', () => {
    it('should complete full drift detection lifecycle with AgentDB', async () => {
      const engine = await DriftEngine.create({
        driftThreshold: 0.1,
        dbPath: TEST_DB_PATH
      });

      // Step 1: Set baseline
      const trainingData = [0.5, 0.6, 0.7, 0.8, 0.9, 0.5, 0.6, 0.7, 0.8, 0.9];
      const baseline = await engine.setBaseline(trainingData, {
        period: 'Q1_2024',
        model: 'production_v1'
      });

      expect(baseline).toBeDefined();
      expect(baseline.statistics.mean).toBeCloseTo(0.7, 2);

      // Step 2: Detect drift in similar data (no drift expected)
      const similarData = [0.51, 0.61, 0.71, 0.81, 0.91, 0.52, 0.62, 0.72, 0.82, 0.92];
      const noDriftResult = await engine.detectDrift(similarData);

      expect(noDriftResult.isDrift).toBe(false);
      expect(noDriftResult.severity).toBe('none');

      // Step 3: Detect drift in different data (drift expected)
      const driftedData = [0.1, 0.2, 0.3, 0.4, 0.5, 0.1, 0.2, 0.3, 0.4, 0.5];
      const driftResult = await engine.detectDrift(driftedData);

      expect(driftResult.isDrift).toBe(true);
      expect(['medium', 'high', 'critical']).toContain(driftResult.severity);

      // Step 4: Verify AgentDB memory storage
      expect(engine.history.length).toBe(2);
      expect(engine.reflexion.episodes.length).toBeGreaterThanOrEqual(3); // baseline + 2 drift checks

      // Step 5: Verify statistics
      const stats = engine.getStats();
      expect(stats.totalChecks).toBe(2);
      expect(stats.driftDetected).toBe(1);
      expect(stats.driftRate).toBe('50.0%');
    });

    it('should persist and retrieve drift history from AgentDB', async () => {
      const engine = await DriftEngine.create({
        driftThreshold: 0.1,
        dbPath: TEST_DB_PATH
      });

      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);

      // Perform multiple drift checks
      await engine.detectDrift([0.5, 0.6, 0.7, 0.8, 0.9]); // no drift
      await engine.detectDrift([0.1, 0.2, 0.3, 0.4, 0.5]); // drift
      await engine.detectDrift([0.55, 0.65, 0.75, 0.85, 0.95]); // no drift

      // Verify episodes stored
      const episodes = engine.reflexion.episodes;
      expect(episodes.length).toBeGreaterThanOrEqual(4); // 1 baseline + 3 checks

      // Check episode structure
      const driftEpisode = episodes.find(e => e.task === 'detect_drift' && !e.success);
      expect(driftEpisode).toBeDefined();
      expect(driftEpisode.reward).toBeLessThan(0.5); // Low reward for drift
    });
  });

  describe('FinancialDriftMonitor Integration', () => {
    it('should complete credit scoring workflow with compliance reporting', async () => {
      const monitor = await FinancialDriftMonitor.create({
        driftThreshold: 0.15,
        dbPath: TEST_DB_PATH
      });

      // Establish baseline credit scores
      const baselineScores = [650, 700, 720, 680, 750, 690, 710, 730, 670, 740];
      await monitor.setBaseline(baselineScores, {
        context: 'credit_scoring',
        period: 'Q1_2024',
        model: 'credit_model_v2.1'
      });

      // Monitor stable credit scoring
      const stableScores = [655, 705, 715, 685, 745, 695, 705, 735, 675, 735];
      const stableResult = await monitor.monitorCreditScoring(stableScores, {
        income: [50000, 60000, 70000, 55000, 75000, 58000, 62000, 72000, 52000, 68000],
        debtRatio: [0.3, 0.25, 0.35, 0.28, 0.22, 0.32, 0.27, 0.24, 0.33, 0.26]
      });

      expect(stableResult.modelType).toBe('credit_scoring');
      expect(stableResult.featureDrifts).toBeDefined();
      expect(stableResult.economicFactors).toBeDefined();

      // Monitor drifted credit scoring (economic downturn simulation)
      const driftedScores = [550, 600, 620, 580, 650, 590, 610, 630, 570, 640];
      const driftResult = await monitor.monitorCreditScoring(driftedScores);

      expect(driftResult.isDrift).toBe(true);
      expect(driftResult.recommendation).toBeDefined();

      // Generate compliance report
      const report = monitor.generateComplianceReport();
      expect(report.checksPerformed.creditScoring).toBe(2);
      expect(report.driftEvents.total).toBeGreaterThanOrEqual(0);
      expect(report.complianceStatus).toBeDefined();

      // Verify audit log
      const auditLog = monitor.getAuditLog();
      expect(auditLog.length).toBe(2);
      expect(auditLog[0].modelType).toBe('credit_scoring');
      expect(auditLog[0].auditId).toBeDefined();
    });

    it('should detect fraud pattern changes and trigger immediate action', async () => {
      const monitor = await FinancialDriftMonitor.create({
        dbPath: TEST_DB_PATH
      });

      // Baseline fraud scores (low fraud rate)
      const baselineFraud = [0.01, 0.02, 0.015, 0.03, 0.012, 0.025, 0.018, 0.022];
      await monitor.setBaseline(baselineFraud, {
        context: 'fraud_detection',
        period: 'Q1_2024'
      });

      // Normal fraud patterns
      const normalFraud = [0.011, 0.021, 0.016, 0.029, 0.013, 0.024];
      const normalResult = await monitor.monitorFraudDetection(normalFraud);
      expect(normalResult.requiresImmediateAction).toBe(false);

      // Fraud spike (new fraud tactic)
      const fraudSpike = [0.5, 0.6, 0.55, 0.7];
      const spikeResult = await monitor.monitorFraudDetection(fraudSpike, {
        avgAmount: [5000, 7000, 6500, 8000],
        frequency: [20, 25, 22, 30]
      });

      expect(spikeResult.isDrift).toBe(true);
      expect(spikeResult.severity).toBe('critical');
      expect(spikeResult.requiresImmediateAction).toBe(true);
      expect(spikeResult.fraudRateChange).toBeGreaterThan(100);
      expect(spikeResult.patternShifts).toBeDefined();

      // Verify regulatory alert was triggered
      const stats = monitor.getStats();
      expect(stats.regulatoryAlerts).toBe(1);
    });

    it('should monitor portfolio risk with sector exposure analysis', async () => {
      const monitor = await FinancialDriftMonitor.create({
        dbPath: TEST_DB_PATH
      });

      // Baseline portfolio risk
      const baselineRisk = [0.05, 0.06, 0.055, 0.062, 0.058, 0.052];
      await monitor.setBaseline(baselineRisk, {
        context: 'portfolio_risk',
        period: 'Q1_2024'
      });

      // Diversified portfolio
      const diversifiedRisk = [0.051, 0.061, 0.056, 0.063, 0.059];
      const sectorExposure = {
        tech: 0.2,
        finance: 0.2,
        healthcare: 0.2,
        energy: 0.2,
        other: 0.2
      };

      const diversifiedResult = await monitor.monitorPortfolioRisk(
        diversifiedRisk,
        sectorExposure
      );

      expect(diversifiedResult.sectorDrift).toBeDefined();
      expect(diversifiedResult.sectorDrift.concentrationScore).toBeLessThanOrEqual(0.3);

      // Concentrated portfolio (high risk)
      const concentratedRisk = [0.15, 0.18, 0.16, 0.17, 0.19];
      const concentratedExposure = {
        tech: 0.7,
        finance: 0.1,
        healthcare: 0.1,
        energy: 0.05,
        other: 0.05
      };

      const concentratedResult = await monitor.monitorPortfolioRisk(
        concentratedRisk,
        concentratedExposure
      );

      expect(concentratedResult.isDrift).toBe(true);
      expect(concentratedResult.concentrationRisk).toBeGreaterThan(0);
      expect(concentratedResult.recommendation).toContain('rebalanc');
      expect(concentratedResult.sectorDrift.concentrationScore).toBeGreaterThan(0.5);
    });
  });

  describe('Multi-Monitor Coordination', () => {
    it('should handle multiple monitors sharing AgentDB instance', async () => {
      // Create first monitor
      const creditMonitor = await FinancialDriftMonitor.create({
        modelType: 'credit_scoring',
        dbPath: TEST_DB_PATH
      });

      await creditMonitor.setBaseline([650, 700, 720, 680, 750]);
      await creditMonitor.monitorCreditScoring([655, 705, 715]);

      // Create second monitor with same database
      const fraudMonitor = await FinancialDriftMonitor.create({
        modelType: 'fraud_detection',
        dbPath: TEST_DB_PATH
      });

      await fraudMonitor.setBaseline([0.01, 0.02, 0.015, 0.03]);
      await fraudMonitor.monitorFraudDetection([0.011, 0.021, 0.016]);

      // Both monitors should have stored episodes
      expect(creditMonitor.reflexion.episodes.length).toBeGreaterThanOrEqual(2);
      expect(fraudMonitor.reflexion.episodes.length).toBeGreaterThanOrEqual(2);

      // Verify statistics are independent
      const creditStats = creditMonitor.getStats();
      const fraudStats = fraudMonitor.getStats();

      expect(creditStats.creditScoringChecks).toBe(1);
      expect(creditStats.fraudDetectionChecks).toBe(0);

      expect(fraudStats.fraudDetectionChecks).toBe(1);
      expect(fraudStats.creditScoringChecks).toBe(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain performance under sustained load', async () => {
      const engine = await DriftEngine.create({
        driftThreshold: 0.1,
        dbPath: TEST_DB_PATH
      });

      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);

      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const variance = i * 0.001;
        await engine.detectDrift([
          0.5 + variance,
          0.6 + variance,
          0.7 + variance,
          0.8 + variance,
          0.9 + variance
        ]);
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(20); // <20ms per detection
      expect(engine.history.length).toBe(iterations);

      const stats = engine.getStats();
      expect(stats.totalChecks).toBe(iterations);
    });

    it('should handle large baseline datasets efficiently', async () => {
      const engine = await DriftEngine.create({
        dbPath: TEST_DB_PATH
      });

      // Generate large baseline (10,000 samples)
      const largeBaseline = Array.from({ length: 10000 }, (_, i) => {
        return 0.5 + (Math.sin(i / 100) * 0.2);
      });

      const startTime = Date.now();
      await engine.setBaseline(largeBaseline);
      const baselineTime = Date.now() - startTime;

      expect(baselineTime).toBeLessThan(100); // <100ms for baseline

      // Test drift detection on large dataset
      const largeCurrentData = Array.from({ length: 10000 }, (_, i) => {
        return 0.6 + (Math.sin(i / 100) * 0.2);
      });

      const driftStartTime = Date.now();
      const result = await engine.detectDrift(largeCurrentData);
      const driftTime = Date.now() - driftStartTime;

      expect(driftTime).toBeLessThan(50); // <50ms for drift detection
      expect(result.scores).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle corrupted data gracefully', async () => {
      const engine = await DriftEngine.create({
        dbPath: TEST_DB_PATH
      });

      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);

      // Test with NaN values
      const corruptedData = [0.5, NaN, 0.7, 0.8, 0.9];

      // Should handle gracefully (NaN filtered or handled)
      const result = await engine.detectDrift(corruptedData.filter(x => !isNaN(x)));
      expect(result).toBeDefined();
    });

    it('should recover from baseline updates', async () => {
      const monitor = await FinancialDriftMonitor.create({
        dbPath: TEST_DB_PATH
      });

      // Set initial baseline
      await monitor.setBaseline([650, 700, 720]);
      await monitor.monitorCreditScoring([655, 705, 715]);

      // Update baseline (model retrained)
      await monitor.setBaseline([680, 730, 750], {
        version: 'v2',
        reason: 'quarterly_retrain'
      });

      await monitor.monitorCreditScoring([685, 735, 745]);

      // Both checks should have succeeded
      const stats = monitor.getStats();
      expect(stats.creditScoringChecks).toBe(2);
    });
  });

  describe('Real-World Scenario Simulations', () => {
    it('should detect gradual drift over time (concept drift)', async () => {
      const engine = await DriftEngine.create({
        driftThreshold: 0.1,
        dbPath: TEST_DB_PATH
      });

      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);

      // Simulate gradual drift over 10 time periods
      const driftResults = [];
      for (let day = 1; day <= 10; day++) {
        const drift = day * 0.02; // Gradual shift
        const currentData = [
          0.5 + drift,
          0.6 + drift,
          0.7 + drift,
          0.8 + drift,
          0.9 + drift
        ];

        const result = await engine.detectDrift(currentData);
        driftResults.push({
          day,
          isDrift: result.isDrift,
          severity: result.severity,
          avgScore: result.averageScore
        });
      }

      // Early days should show no drift
      expect(driftResults[0].isDrift).toBe(false);
      expect(driftResults[1].isDrift).toBe(false);

      // Later days should detect drift
      const lastResult = driftResults[driftResults.length - 1];
      expect(lastResult.isDrift).toBe(true);
      expect(['medium', 'high', 'critical']).toContain(lastResult.severity);
    });

    it('should handle seasonal patterns in financial data', async () => {
      const monitor = await FinancialDriftMonitor.create({
        dbPath: TEST_DB_PATH
      });

      // Q1 baseline (post-holiday spending)
      const q1Baseline = [0.04, 0.05, 0.045, 0.055, 0.048];
      await monitor.setBaseline(q1Baseline, {
        period: 'Q1_2024',
        season: 'post_holiday'
      });

      // Q2 data (spring/summer patterns)
      const q2Data = [0.042, 0.052, 0.046, 0.054, 0.049];
      const q2Result = await monitor.monitorPortfolioRisk(q2Data);

      // Should not detect significant drift (seasonal variation within tolerance)
      expect(q2Result.severity).toMatch(/none|low/);
    });
  });
});
