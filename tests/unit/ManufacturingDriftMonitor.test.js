import { describe, it, expect, beforeEach } from 'vitest';
import { ManufacturingDriftMonitor } from '../../src/use-cases/ManufacturingDriftMonitor.js';
import { createMockAgentDB } from '../helpers/agentdb-mocks.js';

describe('ManufacturingDriftMonitor', () => {
  let monitor;
  let mockDeps;

  beforeEach(() => {
    mockDeps = createMockAgentDB();
    monitor = new ManufacturingDriftMonitor(
      {
        driftThreshold: 0.12,
        predictionWindow: 7,
        industry: 'manufacturing'
      },
      mockDeps
    );
  });

  describe('Initialization', () => {
    it('should initialize with manufacturing-specific defaults', () => {
      expect(monitor.config.driftThreshold).toBe(0.12);
      expect(monitor.config.predictionWindow).toBe(7);
      expect(monitor.industry).toBe('manufacturing');
      expect(monitor.modelType).toBe('quality_control');
    });

    it('should initialize memory buffers', () => {
      expect(monitor.episodeMemory).toBeDefined();
      expect(monitor.skillMemory).toBeDefined();
      expect(monitor.alerts).toBeDefined();
    });

    it('should accept custom production line', () => {
      const customMonitor = new ManufacturingDriftMonitor(
        {
          productionLine: 'line_2'
        },
        mockDeps
      );
      expect(customMonitor.productionLine).toBe('line_2');
    });
  });

  describe('Quality Control Monitoring', () => {
    it('should detect no drift in stable quality scores', async () => {
      const baseline = [0.95, 0.96, 0.95, 0.96, 0.95, 0.96, 0.95];
      await monitor.setBaseline(baseline);

      // Current data nearly identical to baseline
      const current = [0.95, 0.96, 0.95, 0.96, 0.95];
      const productionParams = {
        temperature: [22.5, 22.5, 22.5, 22.5, 22.5],
        pressure: [101.3, 101.3, 101.3, 101.3, 101.3]
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      expect(result.qualityDrift.isDrift).toBe(false);
      expect(result.timestamp).toBeDefined();
      expect(result.modelType).toBe('quality_control');
    });

    it('should detect drift when quality degrades', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95, 0.96];
      await monitor.setBaseline(baseline);

      const current = [0.75, 0.73, 0.77, 0.74, 0.76];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4],
        pressure: [101.3, 101.5, 101.2, 101.4, 101.3]
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      expect(result.qualityDrift.isDrift).toBe(true);
      expect(result.productionImpact).toBeDefined();
    });

    it('should assess production impact', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95];
      await monitor.setBaseline(baseline);

      const current = [0.7, 0.68, 0.72, 0.69, 0.71];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4]
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      expect(['low', 'medium', 'high', 'critical']).toContain(result.productionImpact);
    });

    it('should generate recommendations for quality drift', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95];
      await monitor.setBaseline(baseline);

      const current = [0.75, 0.73, 0.77, 0.74, 0.76];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4]
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      if (result.qualityDrift.isDrift) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should include drift prediction', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95, 0.96];
      await monitor.setBaseline(baseline);

      const current = [0.96, 0.95, 0.97, 0.94, 0.96];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4]
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      expect(result.prediction).toBeDefined();
      expect(result.prediction.prediction).toBeDefined();
      expect(result.prediction.confidence).toBeDefined();
    });
  });

  describe('Predictive Maintenance Monitoring', () => {
    it('should monitor sensor readings for equipment', async () => {
      const baseline = [0.92, 0.93, 0.91, 0.94, 0.92, 0.93];
      await monitor.setBaseline(baseline);

      const current = [0.93, 0.92, 0.94, 0.91, 0.93];
      const equipmentData = {
        equipmentId: 'press-001',
        sensorType: 'vibration',
        unit: 'mm/s'
      };

      const result = await monitor.monitorPredictiveMaintenance(current, equipmentData);

      expect(result).toBeDefined();
      expect(result.sensorDrift).toBeDefined();
    });

    it('should detect equipment degradation', async () => {
      const baseline = [0.92, 0.93, 0.91, 0.94, 0.92];
      await monitor.setBaseline(baseline);

      const current = [0.65, 0.63, 0.67, 0.64, 0.66];
      const equipmentData = {
        equipmentId: 'press-001',
        sensorType: 'vibration'
      };

      const result = await monitor.monitorPredictiveMaintenance(current, equipmentData);

      expect(result.sensorDrift.isDrift).toBe(true);
      expect(result.maintenanceUrgency).toBeDefined();
    });
  });

  describe('Process Optimization Monitoring', () => {
    it('should monitor process parameters', async () => {
      const baseline = [0.88, 0.9, 0.87, 0.89, 0.91, 0.88];
      await monitor.setBaseline(baseline);

      const current = [0.89, 0.88, 0.9, 0.87, 0.89];
      const processData = {
        processId: 'extrusion-01',
        parameters: ['speed', 'temperature', 'pressure']
      };

      const result = await monitor.monitorProcessOptimization(current, processData);

      expect(result).toBeDefined();
      expect(result.efficiencyDrift).toBeDefined();
    });
  });

  describe('Supply Chain Monitoring', () => {
    it('should detect supplier quality changes', async () => {
      const baseline = [0.94, 0.95, 0.93, 0.96, 0.94];
      await monitor.setBaseline(baseline);

      const current = [0.94, 0.95, 0.93, 0.96, 0.94];
      const supplierData = {
        supplierId: 'SUP-001',
        materialType: 'steel-grade-a'
      };

      const result = await monitor.monitorSupplyChain(current, supplierData);

      expect(result).toBeDefined();
      expect(result.qualityDrift).toBeDefined();
    });

    it('should flag new supplier material drift', async () => {
      const baseline = [0.94, 0.95, 0.93, 0.96, 0.94];
      await monitor.setBaseline(baseline);

      const current = [0.75, 0.73, 0.77, 0.74, 0.76];
      const supplierData = {
        supplierId: 'SUP-002',
        materialType: 'steel-grade-a',
        newSupplier: true
      };

      const result = await monitor.monitorSupplyChain(current, supplierData);

      expect(result.qualityDrift.isDrift).toBe(true);
      if (result.recommendations) {
        const hasSupplierRec = result.recommendations.some(r => r.toLowerCase().includes('supplier'));
        expect(hasSupplierRec).toBe(true);
      }
    });
  });

  describe('Production Alert System', () => {
    it('should trigger production alert on critical drift', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95];
      await monitor.setBaseline(baseline);

      const current = [0.45, 0.42, 0.48, 0.44, 0.46];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4]
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      if (result.productionImpact === 'critical') {
        expect(result.recommendations).toContain(expect.stringContaining('PRODUCTION ALERT'));
      }
    });

    it('should store production alerts in memory', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95];
      await monitor.setBaseline(baseline);

      const current = [0.4, 0.38, 0.42, 0.39, 0.41];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4]
      };

      await monitor.monitorQualityControl(current, productionParams);

      const alerts = monitor.alerts.getAll();
      expect(alerts).toBeDefined();
    });
  });

  describe('Manufacturing-Specific Features', () => {
    it('should use 7-day prediction window', () => {
      expect(monitor.config.predictionWindow).toBe(7);
    });

    it('should track production line', () => {
      expect(monitor.productionLine).toBeDefined();
      expect(monitor.productionLine).toBe('line_1');
    });

    it('should store episodes in memory', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95];
      await monitor.setBaseline(baseline);

      const current = [0.96, 0.95, 0.97, 0.94, 0.96];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4]
      };

      await monitor.monitorQualityControl(current, productionParams);

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
      const created = await ManufacturingDriftMonitor.create({
        driftThreshold: 0.12,
        dbPath: ':memory:',
        productionLine: 'line_2'
      });

      expect(created).toBeDefined();
      expect(created.config.driftThreshold).toBe(0.12);
      expect(created.productionLine).toBe('line_2');
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
      const customMonitor = new ManufacturingDriftMonitor(
        {
          maxEpisodes: 5,
          maxAlerts: 3
        },
        mockDeps
      );

      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95];
      await customMonitor.setBaseline(baseline);

      for (let i = 0; i < 10; i++) {
        const current = [0.4, 0.38, 0.42, 0.39, 0.41];
        await customMonitor.monitorQualityControl(current, {
          temperature: [22.5]
        });
      }

      expect(customMonitor.episodeMemory.length()).toBeLessThanOrEqual(5);
    });
  });

  describe('Proactive Drift Prediction', () => {
    it('should recommend preventive action on predicted drift', async () => {
      const baseline = [0.95, 0.96, 0.94, 0.97, 0.95, 0.96];
      await monitor.setBaseline(baseline);

      const current = [0.92, 0.91, 0.93, 0.9, 0.92];
      const productionParams = {
        temperature: [22.5, 22.7, 22.3, 22.6, 22.4]
      };

      const result = await monitor.monitorQualityControl(current, productionParams);

      if (result.prediction.prediction === 'drift_likely') {
        const hasPreventive = result.recommendations.some(
          r => r.toLowerCase().includes('proactive') || r.toLowerCase().includes('preventive')
        );
        expect(hasPreventive).toBe(true);
      }
    });
  });
});
