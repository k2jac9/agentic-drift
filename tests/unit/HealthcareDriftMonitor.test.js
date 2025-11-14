import { describe, it, expect, beforeEach } from 'vitest';
import { HealthcareDriftMonitor } from '../../src/use-cases/HealthcareDriftMonitor.js';
import { createMockAgentDB } from '../helpers/agentdb-mocks.js';

describe('HealthcareDriftMonitor', () => {
  let monitor;
  let mockDeps;

  beforeEach(() => {
    mockDeps = createMockAgentDB();
    monitor = new HealthcareDriftMonitor(
      {
        driftThreshold: 0.08,
        predictionWindow: 14,
        industry: 'healthcare'
      },
      mockDeps
    );
  });

  describe('Initialization', () => {
    it('should initialize with healthcare-specific defaults', () => {
      expect(monitor.config.driftThreshold).toBe(0.08);
      expect(monitor.config.predictionWindow).toBe(14);
      expect(monitor.industry).toBe('healthcare');
      expect(monitor.modelType).toBe('patient_outcome');
    });

    it('should initialize memory buffers', () => {
      expect(monitor.episodeMemory).toBeDefined();
      expect(monitor.skillMemory).toBeDefined();
      expect(monitor.alerts).toBeDefined();
    });

    it('should accept custom model type', () => {
      const customMonitor = new HealthcareDriftMonitor(
        {
          modelType: 'diagnostic_system'
        },
        mockDeps
      );
      expect(customMonitor.modelType).toBe('diagnostic_system');
    });
  });

  describe('Patient Outcome Monitoring', () => {
    it('should detect no drift in stable patient outcomes', async () => {
      const baseline = [0.75, 0.76, 0.77, 0.76, 0.75, 0.76, 0.77, 0.76];
      await monitor.setBaseline(baseline);

      // Current data very similar to baseline (within 1-2% variation)
      const current = [0.75, 0.76, 0.77, 0.76, 0.75, 0.76, 0.77, 0.75];
      const patientFeatures = {
        age: [45, 46, 47, 46, 45, 46, 47, 46],
        bmi: [24.5, 24.6, 24.7, 24.6, 24.5, 24.6, 24.7, 24.5]
      };

      const result = await monitor.monitorPatientOutcomes(current, patientFeatures);

      expect(result.outcomeDrift.isDrift).toBe(false);
      expect(result.timestamp).toBeDefined();
      expect(result.modelType).toBe('patient_outcome');
    });

    it('should detect drift when patient outcomes shift', async () => {
      const baseline = [0.75, 0.78, 0.76, 0.77, 0.79, 0.74, 0.75, 0.76];
      await monitor.setBaseline(baseline);

      const current = [0.55, 0.52, 0.58, 0.54, 0.56, 0.53, 0.55, 0.57];
      const patientFeatures = {
        age: [45, 48, 42, 50, 46, 47, 44, 49],
        bmi: [24.5, 25.0, 23.8, 26.1, 24.9, 25.2, 24.1, 25.5]
      };

      const result = await monitor.monitorPatientOutcomes(current, patientFeatures);

      expect(result.outcomeDrift.isDrift).toBe(true);
      expect(result.patientSafetyRisk).toBeDefined();
    });

    it('should assess patient safety risk', async () => {
      const baseline = [0.75, 0.78, 0.76, 0.77, 0.79];
      await monitor.setBaseline(baseline);

      const current = [0.5, 0.48, 0.52, 0.49, 0.51];
      const patientFeatures = {
        age: [45, 48, 42, 50, 46]
      };

      const result = await monitor.monitorPatientOutcomes(current, patientFeatures);

      expect(['low', 'medium', 'high', 'critical']).toContain(result.patientSafetyRisk);
    });

    it('should generate recommendations for detected drift', async () => {
      const baseline = [0.75, 0.78, 0.76, 0.77, 0.79];
      await monitor.setBaseline(baseline);

      const current = [0.55, 0.52, 0.58, 0.54, 0.56];
      const patientFeatures = {
        age: [45, 48, 42, 50, 46]
      };

      const result = await monitor.monitorPatientOutcomes(current, patientFeatures);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      if (result.outcomeDrift.isDrift) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should include drift prediction', async () => {
      const baseline = [0.75, 0.78, 0.76, 0.77, 0.79, 0.74, 0.75, 0.76];
      await monitor.setBaseline(baseline);

      const current = [0.76, 0.77, 0.75, 0.78, 0.76];
      const patientFeatures = {
        age: [45, 48, 42, 50, 46]
      };

      const result = await monitor.monitorPatientOutcomes(current, patientFeatures);

      expect(result.prediction).toBeDefined();
      expect(result.prediction.prediction).toBeDefined();
      expect(result.prediction.confidence).toBeDefined();
    });
  });

  describe('Diagnostic System Monitoring', () => {
    it('should monitor diagnostic system performance', async () => {
      const baseline = [0.92, 0.94, 0.93, 0.91, 0.95, 0.92, 0.93];
      await monitor.setBaseline(baseline);

      const current = [0.93, 0.92, 0.94, 0.91, 0.93];
      const demographics = {
        population: 'general',
        ageGroups: ['18-30', '31-50', '51-70', '71+']
      };

      const result = await monitor.monitorDiagnosticSystem(current, demographics);

      expect(result).toBeDefined();
      expect(result.diagnosticDrift).toBeDefined();
    });

    it('should detect no drift in stable diagnostics', async () => {
      const baseline = [0.92, 0.93, 0.92, 0.93, 0.92];
      await monitor.setBaseline(baseline);

      // Current data nearly identical to baseline
      const current = [0.92, 0.93, 0.92, 0.93, 0.92];
      const demographics = { population: 'general' };

      const result = await monitor.monitorDiagnosticSystem(current, demographics);

      expect(result.diagnosticDrift.isDrift).toBe(false);
    });

    it('should detect drift in diagnostic accuracy', async () => {
      const baseline = [0.92, 0.94, 0.93, 0.91, 0.95];
      await monitor.setBaseline(baseline);

      const current = [0.75, 0.73, 0.77, 0.74, 0.76];
      const demographics = { population: 'elderly' };

      const result = await monitor.monitorDiagnosticSystem(current, demographics);

      expect(result.diagnosticDrift.isDrift).toBe(true);
    });
  });

  describe('Treatment Recommendation Monitoring', () => {
    it('should monitor treatment recommendation drift', async () => {
      const baseline = [0.88, 0.9, 0.87, 0.89, 0.91, 0.88];
      await monitor.setBaseline(baseline);

      const current = [0.89, 0.88, 0.9, 0.87, 0.89];
      const treatmentData = {
        effectivenessScores: current,
        protocols: ['protocol_a', 'protocol_b']
      };

      const result = await monitor.monitorTreatmentRecommendations(current, treatmentData);

      expect(result).toBeDefined();
      expect(result.treatmentDrift).toBeDefined();
    });
  });

  describe('Disease Prevalence Monitoring', () => {
    it('should monitor disease prevalence changes', async () => {
      const baseline = [0.05, 0.06, 0.05, 0.04, 0.06, 0.05];
      await monitor.setBaseline(baseline);

      const current = [0.05, 0.06, 0.05, 0.06, 0.05];
      const epidemiology = {
        diseaseType: 'respiratory',
        region: 'northeast'
      };

      const result = await monitor.monitorDiseasePrevalence(current, epidemiology);

      expect(result).toBeDefined();
      expect(result.prevalenceDrift).toBeDefined();
    });

    it('should detect epidemiological shifts', async () => {
      const baseline = [0.05, 0.06, 0.05, 0.04, 0.06];
      await monitor.setBaseline(baseline);

      const current = [0.15, 0.16, 0.14, 0.17, 0.15];
      const epidemiology = {
        diseaseType: 'infectious',
        region: 'urban'
      };

      const result = await monitor.monitorDiseasePrevalence(current, epidemiology);

      expect(result.prevalenceDrift.isDrift).toBe(true);
      expect(result.epidemiologicalShift).toBeDefined();
    });
  });

  describe('Patient Safety Protocol', () => {
    it('should trigger safety protocol on critical drift', async () => {
      const baseline = [0.85, 0.87, 0.86, 0.88, 0.85];
      await monitor.setBaseline(baseline);

      const current = [0.45, 0.42, 0.48, 0.44, 0.46];
      const patientFeatures = { age: [50, 55, 52, 58, 54] };

      const result = await monitor.monitorPatientOutcomes(current, patientFeatures);

      if (result.patientSafetyRisk === 'critical') {
        expect(result.recommendations).toContain(expect.stringContaining('PATIENT SAFETY'));
      }
    });

    it('should store safety alerts in memory', async () => {
      const baseline = [0.85, 0.87, 0.86, 0.88, 0.85];
      await monitor.setBaseline(baseline);

      const current = [0.4, 0.38, 0.42, 0.39, 0.41];
      const patientFeatures = { age: [50, 55, 52, 58, 54] };

      await monitor.monitorPatientOutcomes(current, patientFeatures);

      const alerts = monitor.alerts.getAll();
      expect(alerts).toBeDefined();
    });
  });

  describe('Healthcare-Specific Features', () => {
    it('should use lower drift threshold for healthcare', () => {
      expect(monitor.config.driftThreshold).toBe(0.08);
      expect(monitor.config.driftThreshold).toBeLessThan(0.15);
    });

    it('should use 14-day prediction window', () => {
      expect(monitor.config.predictionWindow).toBe(14);
    });

    it('should store episodes in memory', async () => {
      const baseline = [0.75, 0.78, 0.76, 0.77, 0.79];
      await monitor.setBaseline(baseline);

      const current = [0.76, 0.77, 0.75, 0.78, 0.76];
      const patientFeatures = { age: [45, 48, 42, 50, 46] };

      await monitor.monitorPatientOutcomes(current, patientFeatures);

      const episodes = monitor.episodeMemory.getAll();
      expect(episodes).toBeDefined();
    });

    it('should track monitoring statistics', () => {
      const stats = monitor.getMonitoringStats();

      expect(stats).toBeDefined();
      expect(stats.memoryUsage).toBeDefined();
      expect(stats.memoryUsage.alerts).toBeDefined();
      expect(stats.memoryUsage.episodes).toBeDefined();
    });
  });

  describe('Factory Method', () => {
    it('should create monitor with async factory', async () => {
      const created = await HealthcareDriftMonitor.create({
        driftThreshold: 0.08,
        dbPath: ':memory:'
      });

      expect(created).toBeDefined();
      expect(created.config.driftThreshold).toBe(0.08);
      expect(created.db).toBeDefined();
      expect(created.embedder).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should use circular buffers for bounded memory', () => {
      expect(monitor.episodeMemory.isFull).toBeDefined();
      expect(monitor.skillMemory.isFull).toBeDefined();
      expect(monitor.alerts.isFull).toBeDefined();
    });

    it('should not exceed configured buffer sizes', async () => {
      const customMonitor = new HealthcareDriftMonitor(
        {
          maxEpisodes: 5,
          maxAlerts: 3
        },
        mockDeps
      );

      const baseline = [0.75, 0.78, 0.76, 0.77, 0.79];
      await customMonitor.setBaseline(baseline);

      for (let i = 0; i < 10; i++) {
        const current = [0.5, 0.48, 0.52, 0.49, 0.51];
        await customMonitor.monitorPatientOutcomes(current, { age: [50] });
      }

      expect(customMonitor.episodeMemory.length()).toBeLessThanOrEqual(5);
    });
  });
});
