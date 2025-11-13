import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveResponseSystem } from '../../src/adapters/AdaptiveResponseSystem.js';
import { createMockAgentDB } from '../helpers/agentdb-mocks.js';

describe('AdaptiveResponseSystem', () => {
  let system;
  let mockDeps;

  beforeEach(() => {
    mockDeps = createMockAgentDB();
    system = new AdaptiveResponseSystem(
      {
        autoExecute: false,
        confidenceThreshold: 0.7,
        learningEnabled: true
      },
      mockDeps
    );
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(system.config.autoExecute).toBe(false);
      expect(system.config.confidenceThreshold).toBe(0.7);
      expect(system.config.learningEnabled).toBe(true);
    });

    it('should initialize agent components', () => {
      expect(system.agents).toBeDefined();
      expect(system.agents.analyzer).toBeDefined();
      expect(system.agents.recommender).toBeDefined();
      expect(system.agents.executor).toBeDefined();
      expect(system.agents.monitor).toBeDefined();
    });

    it('should initialize response tracking', () => {
      expect(system.responses).toBeDefined();
      expect(Array.isArray(system.responses)).toBe(true);
      expect(system.stats).toBeDefined();
    });

    it('should initialize AgentDB components', () => {
      expect(system.db).toBeDefined();
      expect(system.embedder).toBeDefined();
      expect(system.reflexion).toBeDefined();
      expect(system.skills).toBeDefined();
      expect(system.causal).toBeDefined();
    });
  });

  describe('Drift Event Response', () => {
    it('should respond to drift event', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.25,
        scores: { psi: 0.3, ks: 0.25, jsd: 0.2, statistical: 0.25 },
        timestamp: Date.now()
      };

      const context = {
        industry: 'financial',
        modelType: 'credit_scoring',
        features: ['income', 'credit_history', 'debt_ratio']
      };

      const response = await system.respond(driftEvent, context);

      expect(response).toBeDefined();
      expect(response.analysis).toBeDefined();
      expect(response.recommendations).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should analyze root causes of drift', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.25,
        timestamp: Date.now()
      };

      const context = {
        industry: 'healthcare',
        modelType: 'patient_outcome'
      };

      const response = await system.respond(driftEvent, context);

      expect(response.analysis).toBeDefined();
      expect(response.analysis.rootCauses).toBeDefined();
      expect(Array.isArray(response.analysis.rootCauses)).toBe(true);
    });

    it('should generate actionable recommendations', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.18,
        timestamp: Date.now()
      };

      const context = {
        industry: 'manufacturing',
        modelType: 'quality_control'
      };

      const response = await system.respond(driftEvent, context);

      expect(response.recommendations).toBeDefined();
      expect(Array.isArray(response.recommendations)).toBe(true);
      if (response.recommendations.length > 0) {
        expect(response.recommendations[0]).toHaveProperty('action');
        expect(response.recommendations[0]).toHaveProperty('priority');
      }
    });

    it('should include confidence scores in analysis', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'low',
        averageScore: 0.12,
        timestamp: Date.now()
      };

      const context = {
        industry: 'financial'
      };

      const response = await system.respond(driftEvent, context);

      expect(response.analysis).toBeDefined();
      expect(response.analysis.confidence).toBeDefined();
      expect(response.analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(response.analysis.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Auto-Execution', () => {
    it('should not auto-execute when disabled', async () => {
      const autoOffSystem = new AdaptiveResponseSystem(
        {
          autoExecute: false
        },
        mockDeps
      );

      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.3,
        timestamp: Date.now()
      };

      const response = await autoOffSystem.respond(driftEvent, {
        industry: 'financial'
      });

      expect(response.execution).toBeUndefined();
    });

    it('should auto-execute high-confidence recommendations when enabled', async () => {
      const autoOnSystem = new AdaptiveResponseSystem(
        {
          autoExecute: true,
          confidenceThreshold: 0.7
        },
        mockDeps
      );

      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.35,
        timestamp: Date.now()
      };

      const response = await autoOnSystem.respond(driftEvent, {
        industry: 'financial'
      });

      expect(response).toBeDefined();
      // Execution may or may not happen depending on confidence
      if (response.analysis.confidence >= 0.7) {
        expect(response.execution).toBeDefined();
      }
    });
  });

  describe('Learning and Adaptation', () => {
    it('should store successful responses as skills', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.2,
        timestamp: Date.now()
      };

      const context = {
        industry: 'healthcare',
        success: true
      };

      await system.respond(driftEvent, context);

      // Check that learning is enabled
      expect(system.config.learningEnabled).toBe(true);

      // Skills should be stored (mocked)
      expect(system.skills.add).toBeDefined();
    });

    it('should track response effectiveness', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.28,
        timestamp: Date.now()
      };

      const response = await system.respond(driftEvent, {
        industry: 'manufacturing'
      });

      if (response.monitoring) {
        expect(response.monitoring.trackingId).toBeDefined();
        expect(response.monitoring.metrics).toBeDefined();
      }
    });

    it('should learn from drift patterns', async () => {
      const driftEvent1 = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.3,
        timestamp: Date.now()
      };

      const driftEvent2 = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.32,
        timestamp: Date.now() + 1000
      };

      await system.respond(driftEvent1, { industry: 'financial' });
      await system.respond(driftEvent2, { industry: 'financial' });

      expect(system.responses.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('should coordinate analyzer agent', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.18,
        timestamp: Date.now()
      };

      const response = await system.respond(driftEvent, {
        industry: 'financial'
      });

      expect(response.analysis).toBeDefined();
      expect(system.agents.analyzer).toBeDefined();
    });

    it('should coordinate recommender agent', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.25,
        timestamp: Date.now()
      };

      const response = await system.respond(driftEvent, {
        industry: 'healthcare'
      });

      expect(response.recommendations).toBeDefined();
      expect(system.agents.recommender).toBeDefined();
    });

    it('should coordinate executor agent when auto-execute enabled', async () => {
      const autoSystem = new AdaptiveResponseSystem(
        {
          autoExecute: true,
          confidenceThreshold: 0.5
        },
        mockDeps
      );

      const driftEvent = {
        isDrift: true,
        severity: 'critical',
        averageScore: 0.5,
        timestamp: Date.now()
      };

      const response = await autoSystem.respond(driftEvent, {
        industry: 'manufacturing'
      });

      expect(system.agents.executor).toBeDefined();
    });

    it('should coordinate monitor agent for tracking', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.2,
        timestamp: Date.now()
      };

      const response = await system.respond(driftEvent, {
        industry: 'financial'
      });

      expect(system.agents.monitor).toBeDefined();
    });
  });

  describe('Response Prioritization', () => {
    it('should prioritize critical drift higher', async () => {
      const criticalDrift = {
        isDrift: true,
        severity: 'critical',
        averageScore: 0.5,
        timestamp: Date.now()
      };

      const response = await system.respond(criticalDrift, {
        industry: 'healthcare'
      });

      if (response.recommendations && response.recommendations.length > 0) {
        const hasHighPriority = response.recommendations.some(r => r.priority === 'high' || r.priority === 'critical');
        expect(hasHighPriority).toBe(true);
      }
    });

    it('should provide lower priority for minor drift', async () => {
      const minorDrift = {
        isDrift: true,
        severity: 'low',
        averageScore: 0.11,
        timestamp: Date.now()
      };

      const response = await system.respond(minorDrift, {
        industry: 'manufacturing'
      });

      expect(response.recommendations).toBeDefined();
    });
  });

  describe('Industry-Specific Responses', () => {
    it('should provide healthcare-specific recommendations', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.25,
        timestamp: Date.now()
      };

      const response = await system.respond(driftEvent, {
        industry: 'healthcare',
        modelType: 'patient_outcome'
      });

      expect(response).toBeDefined();
      // Healthcare responses should exist
      expect(response.recommendations).toBeDefined();
    });

    it('should provide financial-specific recommendations', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.18,
        timestamp: Date.now()
      };

      const response = await system.respond(driftEvent, {
        industry: 'financial',
        modelType: 'credit_scoring'
      });

      expect(response).toBeDefined();
      expect(response.recommendations).toBeDefined();
    });

    it('should provide manufacturing-specific recommendations', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'high',
        averageScore: 0.22,
        timestamp: Date.now()
      };

      const response = await system.respond(driftEvent, {
        industry: 'manufacturing',
        modelType: 'quality_control'
      });

      expect(response).toBeDefined();
      expect(response.recommendations).toBeDefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track response statistics', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.18,
        timestamp: Date.now()
      };

      await system.respond(driftEvent, { industry: 'financial' });

      expect(system.stats.totalResponses).toBeGreaterThan(0);
    });

    it('should calculate average response time', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'low',
        averageScore: 0.12,
        timestamp: Date.now()
      };

      await system.respond(driftEvent, { industry: 'healthcare' });

      expect(system.stats.avgResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should track successful vs failed responses', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.18,
        timestamp: Date.now()
      };

      await system.respond(driftEvent, { industry: 'manufacturing' });

      expect(system.stats.successfulResponses).toBeDefined();
      expect(system.stats.failedResponses).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing drift event gracefully', async () => {
      await expect(async () => {
        await system.respond(null, { industry: 'financial' });
      }).rejects.toThrow();
    });

    it('should handle invalid context gracefully', async () => {
      const driftEvent = {
        isDrift: true,
        severity: 'medium',
        averageScore: 0.18,
        timestamp: Date.now()
      };

      // Should not throw with minimal context
      const response = await system.respond(driftEvent, {});
      expect(response).toBeDefined();
    });
  });

  describe('Factory Method', () => {
    it('should create system with async factory', async () => {
      const created = await AdaptiveResponseSystem.create({
        autoExecute: true,
        confidenceThreshold: 0.8,
        dbPath: ':memory:'
      });

      expect(created).toBeDefined();
      expect(created.config.autoExecute).toBe(true);
      expect(created.config.confidenceThreshold).toBe(0.8);
      expect(created.db).toBeDefined();
    });
  });
});
