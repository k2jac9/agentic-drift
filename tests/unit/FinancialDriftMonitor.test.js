/**
 * FinancialDriftMonitor Unit Tests - TDD London School
 *
 * Financial services drift monitoring with industry-specific thresholds
 * PSI threshold: 0.15 (industry standard for credit risk)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FinancialDriftMonitor } from '../../src/use-cases/FinancialDriftMonitor.js';
import { createMockAgentDB } from '../helpers/agentdb-mocks.js';

describe('FinancialDriftMonitor', () => {
  describe('Initialization', () => {
    it('should initialize with financial industry threshold (0.15)', () => {
      const mocks = createMockAgentDB();
      const monitor = new FinancialDriftMonitor({}, mocks);

      expect(monitor).toBeDefined();
      expect(monitor.config.driftThreshold).toBe(0.15);
      expect(monitor.config.industry).toBe('financial');
    });

    it('should initialize AgentDB components', () => {
      const mocks = createMockAgentDB();
      const monitor = new FinancialDriftMonitor({}, mocks);

      expect(monitor.db).toBeDefined();
      expect(monitor.reflexion).toBeDefined();
      expect(monitor.skills).toBeDefined();
    });

    it('should support custom threshold override', () => {
      const mocks = createMockAgentDB();
      const monitor = new FinancialDriftMonitor({ driftThreshold: 0.2 }, mocks);

      expect(monitor.config.driftThreshold).toBe(0.2);
    });
  });

  describe('Credit Scoring Drift Detection', () => {
    let monitor;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      monitor = new FinancialDriftMonitor({}, mocks);

      // Set baseline credit score distribution
      const baselineScores = [650, 700, 720, 680, 750, 690, 710, 730, 670, 740];
      await monitor.setBaseline(baselineScores, { context: 'credit_scoring', period: 'Q1_2024' });
    });

    it('should detect no drift in stable credit scoring', async () => {
      const currentScores = [655, 705, 715, 685, 745, 695, 705, 735, 675, 735];

      const result = await monitor.monitorCreditScoring(currentScores);

      expect(result.isDrift).toBe(false);
      expect(result.modelType).toBe('credit_scoring');
      expect(result.scoreDrift).toBeDefined();
    });

    it('should detect drift when credit scores shift significantly', async () => {
      const currentScores = [550, 600, 620, 580, 650, 590, 610, 630, 570, 640];

      const result = await monitor.monitorCreditScoring(currentScores);

      expect(result.isDrift).toBe(true);
      expect(result.severity).toMatch(/medium|high|critical/);
      expect(result.recommendation).toBeDefined();
    });

    it('should analyze feature drift for credit applications', async () => {
      const currentScores = [650, 700, 720];
      const applicantFeatures = {
        income: [50000, 60000, 70000],
        debtRatio: [0.3, 0.25, 0.35],
        creditHistory: [5, 7, 10]
      };

      const result = await monitor.monitorCreditScoring(currentScores, applicantFeatures);

      expect(result.featureDrifts).toBeDefined();
      expect(result.featureDrifts.income).toBeDefined();
      expect(result.featureDrifts.debtRatio).toBeDefined();
    });

    it('should assess economic factor impact on credit models', async () => {
      const currentScores = [650, 700, 720];

      const result = await monitor.monitorCreditScoring(currentScores);

      expect(result.economicFactors).toBeDefined();
      expect(result.economicFactors.interestRateChange).toBeDefined();
    });

    it('should calculate overall credit risk from multiple signals', async () => {
      const currentScores = [550, 600, 620];

      const result = await monitor.monitorCreditScoring(currentScores);

      expect(result.overallRisk).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(result.overallRisk);
    });

    it('should store credit drift events in AgentDB', async () => {
      const currentScores = [650, 700, 720];
      const storeEpisodeSpy = vi.spyOn(mocks.reflexion, 'storeEpisode');

      await monitor.monitorCreditScoring(currentScores);

      expect(storeEpisodeSpy).toHaveBeenCalled();
    });
  });

  describe('Fraud Detection Drift', () => {
    let monitor;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      monitor = new FinancialDriftMonitor({}, mocks);

      const baselineFraudScores = [0.01, 0.02, 0.015, 0.03, 0.012, 0.025, 0.018, 0.022];
      await monitor.setBaseline(baselineFraudScores, { context: 'fraud_detection' });
    });

    it('should detect no drift in normal fraud patterns', async () => {
      const currentFraudScores = [0.011, 0.021, 0.016, 0.029, 0.013, 0.024];

      const result = await monitor.monitorFraudDetection(currentFraudScores);

      expect(result.isDrift).toBe(false);
      expect(result.modelType).toBe('fraud_detection');
    });

    it('should detect drift when fraud patterns change', async () => {
      const currentFraudScores = [0.15, 0.18, 0.12, 0.20, 0.16, 0.14];

      const result = await monitor.monitorFraudDetection(currentFraudScores);

      expect(result.isDrift).toBe(true);
      expect(result.fraudRateChange).toBeDefined();
    });

    it('should analyze transaction pattern shifts', async () => {
      const currentFraudScores = [0.01, 0.02, 0.015];
      const transactionPatterns = {
        avgAmount: [100, 150, 200],
        frequency: [5, 7, 10],
        locations: ['US', 'US', 'CA']
      };

      const result = await monitor.monitorFraudDetection(currentFraudScores, transactionPatterns);

      expect(result.patternShifts).toBeDefined();
    });

    it('should flag critical drift for immediate investigation', async () => {
      const currentFraudScores = [0.5, 0.6, 0.55, 0.7];

      const result = await monitor.monitorFraudDetection(currentFraudScores);

      expect(result.severity).toBe('critical');
      expect(result.requiresImmediateAction).toBe(true);
    });
  });

  describe('Portfolio Risk Monitoring', () => {
    let monitor;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      monitor = new FinancialDriftMonitor({}, mocks);

      const baselineRisk = [0.05, 0.06, 0.055, 0.062, 0.058, 0.052];
      await monitor.setBaseline(baselineRisk, { context: 'portfolio_risk' });
    });

    it('should monitor portfolio risk distribution drift', async () => {
      const currentRisk = [0.051, 0.061, 0.056, 0.063, 0.059];

      const result = await monitor.monitorPortfolioRisk(currentRisk);

      expect(result.isDrift).toBe(false);
      expect(result.modelType).toBe('portfolio_risk');
    });

    it('should detect concentration risk increases', async () => {
      const currentRisk = [0.15, 0.18, 0.16, 0.17, 0.19];

      const result = await monitor.monitorPortfolioRisk(currentRisk);

      expect(result.isDrift).toBe(true);
      expect(result.concentrationRisk).toBeDefined();
      expect(result.concentrationRisk).toBeGreaterThan(0);
    });

    it('should analyze sector correlation drift', async () => {
      const currentRisk = [0.05, 0.06, 0.055];
      const sectorExposure = {
        tech: 0.3,
        finance: 0.25,
        healthcare: 0.2,
        energy: 0.15,
        other: 0.1
      };

      const result = await monitor.monitorPortfolioRisk(currentRisk, sectorExposure);

      expect(result.sectorDrift).toBeDefined();
    });

    it('should recommend rebalancing on high risk drift', async () => {
      const currentRisk = [0.15, 0.18, 0.16];

      const result = await monitor.monitorPortfolioRisk(currentRisk);

      expect(result.recommendation).toContain('rebalanc');
    });
  });

  describe('Regulatory Compliance', () => {
    let monitor;
    let mocks;

    beforeEach(() => {
      mocks = createMockAgentDB();
      monitor = new FinancialDriftMonitor({}, mocks);
    });

    it('should flag drift exceeding regulatory thresholds', async () => {
      const baselineScores = [650, 700, 720];
      await monitor.setBaseline(baselineScores);

      const currentScores = [400, 450, 420];
      const result = await monitor.monitorCreditScoring(currentScores);

      expect(result.regulatoryAlert).toBeDefined();
      if (result.isDrift && result.severity === 'critical') {
        expect(result.regulatoryAlert).toBe(true);
      }
    });

    it('should track model performance metrics for auditing', async () => {
      const baselineScores = [650, 700, 720];
      await monitor.setBaseline(baselineScores);

      const currentScores = [655, 705, 715];
      await monitor.monitorCreditScoring(currentScores);

      const auditLog = monitor.getAuditLog();

      expect(auditLog).toBeDefined();
      expect(auditLog.length).toBeGreaterThan(0);
    });

    it('should generate compliance reports', () => {
      const report = monitor.generateComplianceReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.checksPerformed).toBeDefined();
      expect(report.driftEvents).toBeDefined();
    });
  });

  describe('Statistical Methods', () => {
    let monitor;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      monitor = new FinancialDriftMonitor({}, mocks);
      await monitor.setBaseline([650, 700, 720, 680, 750]);
    });

    it('should use PSI as primary method for financial data', async () => {
      const result = await monitor.detectDrift([655, 705, 715, 685, 745]);

      expect(result.scores.psi).toBeDefined();
      expect(result.primaryMethod).toBe('psi');
    });

    it('should apply financial-specific PSI thresholds', async () => {
      const result = await monitor.detectDrift([655, 705, 715]);

      // Financial threshold is 0.15 vs general 0.1
      if (result.scores.psi > 0.12 && result.scores.psi < 0.15) {
        expect(result.isDrift).toBe(false); // Within financial tolerance
      }
    });
  });

  describe('Performance and Statistics', () => {
    let monitor;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      monitor = new FinancialDriftMonitor({}, mocks);
      await monitor.setBaseline([650, 700, 720]);
    });

    it('should track monitoring statistics', async () => {
      await monitor.monitorCreditScoring([655, 705, 715]);
      await monitor.monitorFraudDetection([0.01, 0.02]);

      const stats = monitor.getStats();

      expect(stats.totalChecks).toBeGreaterThanOrEqual(2);
      expect(stats.creditScoringChecks).toBeDefined();
      expect(stats.fraudDetectionChecks).toBeDefined();
    });

    it('should calculate false positive rate', async () => {
      await monitor.monitorCreditScoring([655, 705, 715]);

      const stats = monitor.getStats();

      expect(stats.falsePositiveRate).toBeDefined();
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await monitor.detectDrift([650 + i, 700 + i, 720 + i]);
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / 100;

      expect(avgTime).toBeLessThan(10); // <10ms per check
    });
  });
});
