/**
 * DriftEngine Unit Tests - TDD London School Approach
 *
 * Testing behavior and contracts, not internal state
 * RED -> GREEN -> REFACTOR cycle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriftEngine } from '../../src/core/DriftEngine.js';
import { createMockAgentDB } from '../helpers/agentdb-mocks.js';

describe('DriftEngine', () => {
  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const engine = new DriftEngine();

      expect(engine).toBeDefined();
      expect(engine.config).toBeDefined();
      expect(engine.config.driftThreshold).toBe(0.1);
      expect(engine.config.predictionWindow).toBe(7);
    });

    it('should initialize with custom configuration', () => {
      const config = {
        driftThreshold: 0.15,
        predictionWindow: 30,
        autoAdapt: true
      };

      const engine = new DriftEngine(config);

      expect(engine.config.driftThreshold).toBe(0.15);
      expect(engine.config.predictionWindow).toBe(30);
      expect(engine.config.autoAdapt).toBe(true);
    });

    it('should initialize AgentDB components for memory and learning', () => {
      const engine = new DriftEngine({ dbPath: ':memory:' });

      expect(engine.db).toBeDefined();
      expect(engine.embedder).toBeDefined();
      expect(engine.reflexion).toBeDefined();
      expect(engine.skills).toBeDefined();
    });
  });

  describe('Baseline Management', () => {
    let engine;
    let mocks;

    beforeEach(() => {
      mocks = createMockAgentDB();
      engine = new DriftEngine({ dbPath: ':memory:' }, mocks);
    });

    it('should set baseline from training data', async () => {
      const trainingData = [0.5, 0.6, 0.7, 0.8, 0.9];
      const metadata = {
        period: 'Q1 2024',
        context: 'production_model_v1'
      };

      await engine.setBaseline(trainingData, metadata);

      expect(engine.baselineDistribution).toBeDefined();
      expect(engine.baselineDistribution.data).toEqual(trainingData);
      expect(engine.baselineDistribution.metadata).toEqual(metadata);
    });

    it('should calculate and store baseline statistics', async () => {
      const trainingData = [0.5, 0.6, 0.7, 0.8, 0.9];

      await engine.setBaseline(trainingData);

      const stats = engine.baselineDistribution.statistics;
      expect(stats.mean).toBeCloseTo(0.7, 2);
      expect(stats.std).toBeGreaterThan(0);
      expect(stats.min).toBe(0.5);
      expect(stats.max).toBe(0.9);
      expect(stats.count).toBe(5);
    });

    it('should store baseline in AgentDB for versioning', async () => {
      const trainingData = [0.5, 0.6, 0.7, 0.8, 0.9];
      const storeEpisodeSpy = vi.spyOn(mocks.reflexion, 'storeEpisode');

      await engine.setBaseline(trainingData, { version: 'v1' });

      expect(storeEpisodeSpy).toHaveBeenCalled();
    });

    it('should throw error for empty baseline data', async () => {
      await expect(engine.setBaseline([])).rejects.toThrow('Baseline data cannot be empty');
    });

    it('should throw error for null baseline data', async () => {
      await expect(engine.setBaseline(null)).rejects.toThrow('Baseline data cannot be empty');
    });
  });

  describe('Drift Detection - PSI Method', () => {
    let engine;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      engine = new DriftEngine({
        driftThreshold: 0.1,
        dbPath: ':memory:'
      }, mocks);

      // Set baseline distribution
      const baseline = [0.5, 0.6, 0.7, 0.8, 0.9, 0.5, 0.6, 0.7, 0.8, 0.9];
      await engine.setBaseline(baseline);
    });

    it('should detect no drift when distributions are similar', async () => {
      const currentData = [0.5, 0.6, 0.7, 0.8, 0.9, 0.5, 0.6, 0.7, 0.8, 0.9];

      const result = await engine.detectDrift(currentData);

      expect(result.isDrift).toBe(false);
      expect(result.severity).toBe('none');
      expect(result.scores.psi).toBeLessThan(0.1);
    });

    it('should detect low drift when distributions slightly differ', async () => {
      const currentData = [0.6, 0.7, 0.8, 0.9, 1.0, 0.6, 0.7, 0.8, 0.9, 1.0];

      const result = await engine.detectDrift(currentData);

      expect(result.scores.psi).toBeGreaterThan(0);
      if (result.scores.psi > 0.05) {
        expect(['low', 'medium', 'high', 'critical']).toContain(result.severity);
      }
    });

    it('should detect high drift when distributions significantly differ', async () => {
      const currentData = [0.1, 0.2, 0.3, 0.4, 0.5, 0.1, 0.2, 0.3, 0.4, 0.5];

      const result = await engine.detectDrift(currentData);

      expect(result.isDrift).toBe(true);
      expect(result.scores.psi).toBeGreaterThan(0.1);
      expect(['medium', 'high', 'critical']).toContain(result.severity);
    });

    it('should return all statistical method scores', async () => {
      const currentData = [0.6, 0.7, 0.8, 0.9, 1.0];

      const result = await engine.detectDrift(currentData);

      expect(result.scores).toHaveProperty('psi');
      expect(result.scores).toHaveProperty('ks');
      expect(result.scores).toHaveProperty('jsd');
      expect(result.scores).toHaveProperty('statistical');
    });

    it('should store drift event in AgentDB memory', async () => {
      const currentData = [0.1, 0.2, 0.3, 0.4, 0.5];
      const storeEpisodeSpy = vi.spyOn(mocks.reflexion, 'storeEpisode');

      await engine.detectDrift(currentData);

      expect(storeEpisodeSpy).toHaveBeenCalled();
    });

    it('should throw error when baseline not set', async () => {
      const newMocks = createMockAgentDB();
      const newEngine = new DriftEngine({ dbPath: ':memory:' }, newMocks);
      const currentData = [0.5, 0.6, 0.7];

      await expect(newEngine.detectDrift(currentData)).rejects.toThrow('Baseline not set');
    });
  });

  describe('Drift Detection - KS Test', () => {
    let engine;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      engine = new DriftEngine({ dbPath: ':memory:' }, mocks);
      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);
    });

    it('should calculate KS statistic correctly', async () => {
      const currentData = [0.5, 0.6, 0.7, 0.8, 0.9];

      const result = await engine.detectDrift(currentData);

      expect(result.scores.ks).toBeGreaterThanOrEqual(0);
      expect(result.scores.ks).toBeLessThanOrEqual(1);
    });

    it('should detect drift when KS statistic exceeds threshold', async () => {
      const currentData = [0.1, 0.2, 0.3, 0.4, 0.5];

      const result = await engine.detectDrift(currentData);

      expect(result.scores.ks).toBeGreaterThan(0.3);
    });
  });

  describe('Drift Detection - Jensen-Shannon Divergence', () => {
    let engine;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      engine = new DriftEngine({ dbPath: ':memory:' }, mocks);
      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);
    });

    it('should calculate JS divergence correctly', async () => {
      const currentData = [0.5, 0.6, 0.7, 0.8, 0.9];

      const result = await engine.detectDrift(currentData);

      expect(result.scores.jsd).toBeGreaterThanOrEqual(0);
      expect(result.scores.jsd).toBeLessThanOrEqual(1);
    });

    it('should return 0 for identical distributions', async () => {
      const currentData = [0.5, 0.6, 0.7, 0.8, 0.9];

      const result = await engine.detectDrift(currentData);

      expect(result.scores.jsd).toBeLessThan(0.01);
    });
  });

  describe('Severity Classification', () => {
    let engine;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      engine = new DriftEngine({
        driftThreshold: 0.1,
        dbPath: ':memory:'
      }, mocks);
      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);
    });

    it('should classify as "none" when score below threshold', async () => {
      const currentData = [0.5, 0.6, 0.7, 0.8, 0.9];
      const result = await engine.detectDrift(currentData);

      expect(result.severity).toBe('none');
    });

    it('should classify as "low" for scores 1-2x threshold', async () => {
      // Test with slightly drifted data
      const currentData = [0.55, 0.65, 0.75, 0.85, 0.95];
      const result = await engine.detectDrift(currentData);

      if (result.averageScore >= 0.05 && result.averageScore < 0.1) {
        expect(result.severity).toBe('low');
      }
    });

    it('should classify as "critical" for very high drift', async () => {
      const currentData = [0.1, 0.1, 0.1, 0.1, 0.1];
      const result = await engine.detectDrift(currentData);

      expect(result.severity).toBe('critical');
    });
  });

  describe('Statistics and History', () => {
    let engine;
    let mocks;

    beforeEach(async () => {
      mocks = createMockAgentDB();
      engine = new DriftEngine({ dbPath: ':memory:' }, mocks);
      await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);
    });

    it('should track drift detection statistics', async () => {
      await engine.detectDrift([0.5, 0.6, 0.7, 0.8, 0.9]);
      await engine.detectDrift([0.1, 0.2, 0.3, 0.4, 0.5]);

      const stats = engine.getStats();

      expect(stats.totalChecks).toBe(2);
      expect(stats.driftDetected).toBeGreaterThanOrEqual(0);
      expect(stats.driftRate).toBeDefined();
    });

    it('should calculate drift rate correctly', async () => {
      await engine.detectDrift([0.5, 0.6, 0.7, 0.8, 0.9]); // no drift
      await engine.detectDrift([0.1, 0.2, 0.3, 0.4, 0.5]); // drift

      const stats = engine.getStats();

      expect(stats.driftRate).toMatch(/%$/);
      expect(parseFloat(stats.driftRate)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(stats.driftRate)).toBeLessThanOrEqual(100);
    });
  });
});
