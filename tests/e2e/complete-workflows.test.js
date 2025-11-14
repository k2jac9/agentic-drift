import { describe, it, expect, beforeEach } from 'vitest';
import { HealthcareDriftMonitor } from '../../src/use-cases/HealthcareDriftMonitor.js';
import { ManufacturingDriftMonitor } from '../../src/use-cases/ManufacturingDriftMonitor.js';
import { FinancialDriftMonitor } from '../../src/use-cases/FinancialDriftMonitor.js';
import { AdaptiveResponseSystem } from '../../src/adapters/AdaptiveResponseSystem.js';
import { createMockAgentDB } from '../helpers/agentdb-mocks.js';

describe('Complete End-to-End Workflows', () => {
  describe('Healthcare Patient Safety Workflow', () => {
    it('should complete full healthcare monitoring workflow', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new HealthcareDriftMonitor(
        {
          driftThreshold: 0.08,
          predictionWindow: 14
        },
        mockDeps
      );

      // Step 1: Set baseline from historical patient data
      const historicalOutcomes = [0.85, 0.87, 0.86, 0.88, 0.85, 0.87, 0.86, 0.88];
      await monitor.setBaseline(historicalOutcomes);

      // Step 2: Monitor current patient outcomes
      const currentOutcomes = [0.84, 0.86, 0.85, 0.87, 0.85];
      const patientFeatures = {
        age: [52, 48, 55, 50, 53],
        bmi: [25.5, 24.2, 26.8, 25.0, 25.7],
        conditions: ['diabetes', 'hypertension', 'none', 'diabetes', 'hypertension']
      };

      const result = await monitor.monitorPatientOutcomes(currentOutcomes, patientFeatures);

      // Step 3: Verify monitoring results
      expect(result.outcomeDrift).toBeDefined();
      expect(result.demographicDrift).toBeDefined();
      expect(result.clinicalDrift).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.patientSafetyRisk).toBeDefined();

      // Step 4: Verify appropriate actions taken
      if (result.patientSafetyRisk === 'high' || result.patientSafetyRisk === 'critical') {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }

      // Step 5: Verify memory persistence
      const alerts = monitor.alerts.getAll();
      expect(alerts).toBeDefined();
    });

    it('should integrate with adaptive response system', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new HealthcareDriftMonitor(
        {
          driftThreshold: 0.08
        },
        mockDeps
      );

      const responseSystem = new AdaptiveResponseSystem(
        {
          autoExecute: false,
          confidenceThreshold: 0.7
        },
        mockDeps
      );

      // Detect drift
      const baseline = [0.85, 0.87, 0.86, 0.88, 0.85];
      await monitor.setBaseline(baseline);

      const current = [0.65, 0.63, 0.67, 0.64, 0.66];
      const patientFeatures = { age: [50, 55, 52, 58, 54] };

      const driftResult = await monitor.monitorPatientOutcomes(current, patientFeatures);

      // Generate adaptive response
      if (driftResult.outcomeDrift.isDrift) {
        const response = await responseSystem.respond(driftResult.outcomeDrift, {
          industry: 'healthcare',
          modelType: 'patient_outcome',
          patientSafetyRisk: driftResult.patientSafetyRisk
        });

        expect(response.analysis).toBeDefined();
        expect(response.recommendations).toBeDefined();
      }
    });
  });

  describe('Manufacturing Quality Control Workflow', () => {
    it('should complete full manufacturing monitoring workflow', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new ManufacturingDriftMonitor(
        {
          driftThreshold: 0.12,
          predictionWindow: 7,
          productionLine: 'line_1'
        },
        mockDeps
      );

      // Step 1: Set baseline from historical quality data
      const historicalQuality = [0.96, 0.97, 0.95, 0.98, 0.96, 0.97, 0.95];
      await monitor.setBaseline(historicalQuality);

      // Step 2: Monitor current quality with production parameters
      const currentQuality = [0.94, 0.95, 0.93, 0.96, 0.94];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4],
        pressure: [101.3, 101.5, 101.2, 101.4, 101.3],
        speed: [45.2, 45.5, 45.1, 45.4, 45.3],
        supplierId: 'SUP-001',
        batchId: 'BATCH-20231115'
      };

      const result = await monitor.monitorQualityControl(currentQuality, productionParams);

      // Step 3: Verify monitoring results
      expect(result.qualityDrift).toBeDefined();
      expect(result.parameterDrift).toBeDefined();
      expect(result.supplierDrift).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.productionImpact).toBeDefined();

      // Step 4: Verify production tracking
      expect(result.productionLine).toBe('line_1');
      expect(result.modelType).toBe('quality_control');

      // Step 5: Verify recommendations if drift detected
      if (result.qualityDrift.isDrift) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should detect new supplier material drift', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new ManufacturingDriftMonitor(
        {
          driftThreshold: 0.12
        },
        mockDeps
      );

      // Baseline with original supplier
      const baseline = [0.96, 0.97, 0.95, 0.98, 0.96];
      await monitor.setBaseline(baseline);

      // New supplier shows quality degradation
      const current = [0.82, 0.8, 0.84, 0.81, 0.83];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4],
        supplierId: 'SUP-002',
        newSupplier: true
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      expect(result.qualityDrift.isDrift).toBe(true);
      expect(result.productionImpact).toBeDefined();

      if (result.recommendations) {
        const hasSupplierAlert = result.recommendations.some(r => r.toLowerCase().includes('supplier'));
        expect(hasSupplierAlert).toBe(true);
      }
    });

    it('should trigger predictive maintenance workflow', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new ManufacturingDriftMonitor(
        {
          driftThreshold: 0.12
        },
        mockDeps
      );

      const baseline = [0.92, 0.93, 0.91, 0.94, 0.92];
      await monitor.setBaseline(baseline);

      // Gradual equipment degradation
      const current = [0.88, 0.87, 0.89, 0.86, 0.88];
      const equipmentData = {
        equipmentId: 'PRESS-001',
        sensorType: 'vibration',
        vibrationLevel: [2.5, 2.7, 2.8, 3.0, 3.2]
      };

      const result = await monitor.monitorPredictiveMaintenance(current, equipmentData);

      expect(result.sensorDrift).toBeDefined();
      if (result.sensorDrift.isDrift) {
        expect(result.maintenanceUrgency).toBeDefined();
      }
    });
  });

  describe('Cross-Industry Multi-Monitor Workflow', () => {
    it('should coordinate multiple monitors across industries', async () => {
      const mockDeps = createMockAgentDB();

      // Initialize monitors for different industries
      const healthcare = new HealthcareDriftMonitor(
        {
          driftThreshold: 0.08
        },
        mockDeps
      );

      const manufacturing = new ManufacturingDriftMonitor(
        {
          driftThreshold: 0.12
        },
        mockDeps
      );

      const financial = new FinancialDriftMonitor(
        {
          driftThreshold: 0.15
        },
        mockDeps
      );

      // Set baselines
      await healthcare.setBaseline([0.85, 0.87, 0.86, 0.88, 0.85]);
      await manufacturing.setBaseline([0.96, 0.97, 0.95, 0.98, 0.96]);
      await financial.setBaseline([705, 710, 700, 715, 708]);

      // Monitor all industries concurrently
      const [healthcareResult, manufacturingResult, financialResult] = await Promise.all([
        healthcare.monitorPatientOutcomes([0.84, 0.86, 0.85], { age: [50, 55, 52] }),
        manufacturing.monitorQualityControl([0.95, 0.96, 0.94], { temperature: [22.5] }),
        financial.monitorCreditScoring([708, 712, 705], { income: [50000, 55000, 52000] })
      ]);

      // Verify all monitors functioning
      expect(healthcareResult).toBeDefined();
      expect(manufacturingResult).toBeDefined();
      expect(financialResult).toBeDefined();

      // Verify industry-specific settings
      expect(healthcare.industry).toBe('healthcare');
      expect(manufacturing.industry).toBe('manufacturing');
      expect(financial.industry).toBe('financial');
    });

    it('should share AgentDB instance across monitors', async () => {
      const mockDeps = createMockAgentDB();

      const monitor1 = new HealthcareDriftMonitor(
        {
          driftThreshold: 0.08
        },
        mockDeps
      );

      const monitor2 = new ManufacturingDriftMonitor(
        {
          driftThreshold: 0.12
        },
        mockDeps
      );

      // Both should use same AgentDB instance (mocked)
      expect(monitor1.db).toBe(monitor2.db);
      expect(monitor1.embedder).toBe(monitor2.embedder);
    });
  });

  describe('Complete Adaptive Response Workflow', () => {
    it('should execute full drift-detection-to-response workflow', async () => {
      const mockDeps = createMockAgentDB();

      // Step 1: Initialize monitor and response system
      const monitor = new FinancialDriftMonitor(
        {
          driftThreshold: 0.15
        },
        mockDeps
      );

      const responseSystem = new AdaptiveResponseSystem(
        {
          autoExecute: false,
          confidenceThreshold: 0.7,
          learningEnabled: true
        },
        mockDeps
      );

      // Step 2: Set baseline and detect drift
      const baseline = [705, 710, 700, 715, 708, 703, 712];
      await monitor.setBaseline(baseline);

      const current = [650, 645, 655, 648, 652];
      const result = await monitor.monitorCreditScoring(current);

      // Step 3: Generate adaptive response
      if (result.isDrift) {
        const response = await responseSystem.respond(result.scoreDrift, {
          industry: 'financial',
          modelType: 'credit_scoring',
          economicFactors: result.economicFactors
        });

        // Step 4: Verify complete response workflow
        expect(response.analysis).toBeDefined();
        expect(response.analysis.rootCauses).toBeDefined();
        expect(response.analysis.confidence).toBeDefined();

        expect(response.recommendations).toBeDefined();
        expect(response.recommendations.actions).toBeDefined();
        expect(Array.isArray(response.recommendations.actions)).toBe(true);

        // Step 5: Verify learning occurred
        if (responseSystem.config.learningEnabled) {
          expect(responseSystem.responses.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle continuous monitoring with memory management', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new HealthcareDriftMonitor(
        {
          driftThreshold: 0.08,
          maxEpisodes: 10,
          maxAlerts: 5
        },
        mockDeps
      );

      const baseline = [0.85, 0.87, 0.86, 0.88, 0.85];
      await monitor.setBaseline(baseline);

      // Simulate continuous monitoring (20 iterations)
      for (let i = 0; i < 20; i++) {
        const current = [0.84 + Math.random() * 0.06, 0.85 + Math.random() * 0.06, 0.86 + Math.random() * 0.06];
        const patientFeatures = { age: [50, 55, 52] };

        await monitor.monitorPatientOutcomes(current, patientFeatures);
      }

      // Verify memory doesn't grow unbounded
      const stats = monitor.getMonitoringStats();
      expect(stats.memoryUsage.episodes.size).toBeLessThanOrEqual(10);
      expect(stats.memoryUsage.alerts.size).toBeLessThanOrEqual(5);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency monitoring', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new ManufacturingDriftMonitor(
        {
          driftThreshold: 0.12
        },
        mockDeps
      );

      const baseline = [0.96, 0.97, 0.95, 0.98, 0.96, 0.97];
      await monitor.setBaseline(baseline);

      const startTime = Date.now();

      // Perform 50 drift checks
      const checks = [];
      for (let i = 0; i < 50; i++) {
        const current = [0.95 + Math.random() * 0.04, 0.94 + Math.random() * 0.04, 0.96 + Math.random() * 0.04];
        checks.push(monitor.monitorQualityControl(current, { temperature: [22.5] }));
      }

      await Promise.all(checks);

      const duration = Date.now() - startTime;

      // Should complete 50 checks reasonably quickly
      expect(duration).toBeLessThan(5000); // Less than 5 seconds

      // Verify stats
      const stats = monitor.getStats();
      expect(stats.totalChecks).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from baseline updates during monitoring', async () => {
      const mockDeps = createMockAgentDB();
      const monitor = new FinancialDriftMonitor(
        {
          driftThreshold: 0.15
        },
        mockDeps
      );

      // Initial baseline
      const baseline1 = [705, 710, 700, 715, 708];
      await monitor.setBaseline(baseline1);

      // Perform some monitoring
      const result1 = await monitor.monitorCreditScoring([708, 712, 705]);
      expect(result1).toBeDefined();

      // Update baseline (e.g., due to economic shift)
      const baseline2 = [650, 655, 645, 660, 653];
      await monitor.setBaseline(baseline2);

      // Continue monitoring with new baseline
      const result2 = await monitor.monitorCreditScoring([652, 658, 650]);
      expect(result2).toBeDefined();

      // Should use new baseline
      expect(monitor.baselineDistribution.data).toEqual(baseline2);
    });

    it('should handle concurrent monitoring across monitors', async () => {
      const mockDeps = createMockAgentDB();

      const monitors = [
        new HealthcareDriftMonitor({ driftThreshold: 0.08 }, mockDeps),
        new ManufacturingDriftMonitor({ driftThreshold: 0.12 }, mockDeps),
        new FinancialDriftMonitor({ driftThreshold: 0.15 }, mockDeps)
      ];

      // Set baselines concurrently
      await Promise.all([
        monitors[0].setBaseline([0.85, 0.87, 0.86, 0.88, 0.85]),
        monitors[1].setBaseline([0.96, 0.97, 0.95, 0.98, 0.96]),
        monitors[2].setBaseline([705, 710, 700, 715, 708])
      ]);

      // Monitor concurrently
      const results = await Promise.all([
        monitors[0].monitorPatientOutcomes([0.84, 0.86, 0.85], { age: [50] }),
        monitors[1].monitorQualityControl([0.95, 0.96, 0.94], { temp: [22.5] }),
        monitors[2].monitorCreditScoring([708, 712, 705])
      ]);

      // All should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});
