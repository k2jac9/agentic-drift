/**
 * BaseMonitor - Abstract base class for domain-specific drift monitors
 *
 * Eliminates code duplication across FinancialDriftMonitor,
 * HealthcareDriftMonitor, and ManufacturingDriftMonitor
 *
 * Provides:
 * - Shared statistical methods
 * - Common memory management (episodeMemory, skillMemory, alerts)
 * - Circular buffers for bounded memory growth
 * - Consistent factory pattern for async initialization
 * - Logging infrastructure
 */

import { DriftEngine } from '../core/DriftEngine.js';
import { createDatabase, EmbeddingService, ReflexionMemory, SkillLibrary } from 'agentdb';
import { StatisticsUtil } from '../utils/StatisticsUtil.js';
import { CircularBuffer } from '../utils/CircularBuffer.js';
import { createDomainLogger } from '../utils/logger.js';

export class BaseMonitor extends DriftEngine {
  /**
   * @param {Object} config - Configuration options
   * @param {Object} dependencies - Injected dependencies for testing
   */
  constructor(config = {}, dependencies = null) {
    super(config, dependencies);

    this.industry = config.industry || 'general';
    this.modelType = config.modelType || 'unknown';

    // Initialize circular buffers for bounded memory
    const maxAuditLogs = config.maxAuditLogs || 1000;
    const maxAlerts = config.maxAlerts || 500;
    const maxEpisodes = config.maxEpisodes || 1000;
    const maxSkills = config.maxSkills || 500;

    this.auditLog = new CircularBuffer(maxAuditLogs);
    this.alerts = new CircularBuffer(maxAlerts);
    this.episodeMemory = new CircularBuffer(maxEpisodes);
    this.skillMemory = new CircularBuffer(maxSkills);

    // Domain-specific logger
    this.logger = createDomainLogger(this.industry);

    // Monitoring statistics
    this.monitoringStats = {
      totalChecks: 0,
      driftDetections: 0,
      adaptations: 0,
      alertsTriggered: 0
    };
  }

  /**
   * Factory method for creating monitors with async AgentDB initialization
   * Subclasses should override this method
   *
   * @param {Object} config - Configuration
   * @returns {Promise<BaseMonitor>} Initialized monitor
   */
  static async create(config = {}) {
    throw new Error('Subclass must implement static create() factory method');
  }

  /**
   * Initialize AgentDB components
   * Called by subclass factory methods
   *
   * @param {BaseMonitor} monitor - Monitor instance
   * @returns {Promise<BaseMonitor>} Initialized monitor
   */
  static async initializeAgentDB(monitor) {
    // Initialize AgentDB components asynchronously
    monitor.db = await createDatabase(monitor.config.dbPath || ':memory:');

    // Initialize AgentDB schema (inherited from DriftEngine)
    await monitor._initializeAgentDBSchema();

    // Initialize EmbeddingService with config
    monitor.embedder = new EmbeddingService({
      model: 'Xenova/all-MiniLM-L6-v2',
      dimension: 384,
      provider: 'transformers'
    });
    await monitor.embedder.initialize();

    monitor.reflexion = new ReflexionMemory(monitor.db, monitor.embedder);
    monitor.skills = new SkillLibrary(monitor.db, monitor.embedder);

    monitor.logger.info({ industry: monitor.industry }, 'Monitor initialized with AgentDB');

    return monitor;
  }

  /**
   * Calculate mean using shared utility
   *
   * @param {number[]} data - Data array
   * @returns {number} Mean value
   */
  _calculateMean(data) {
    return StatisticsUtil.calculateMean(data);
  }

  /**
   * Calculate standard deviation using shared utility
   *
   * @param {number[]} data - Data array
   * @returns {number} Standard deviation
   */
  _calculateStd(data) {
    return StatisticsUtil.calculateStd(data);
  }

  /**
   * Calculate statistics (mean, std, variance) in single pass
   *
   * @param {number[]} data - Data array
   * @returns {{mean: number, variance: number, std: number, count: number}}
   */
  _calculateStats(data) {
    return StatisticsUtil.calculateStats(data);
  }

  /**
   * Calculate trend from time series data
   *
   * @param {number[]} data - Data array
   * @param {number[]} timestamps - Optional timestamps
   * @returns {number} Trend slope
   */
  _calculateTrend(data, timestamps = null) {
    return StatisticsUtil.calculateTrend(data, timestamps);
  }

  /**
   * Assess impact severity using shared utility
   *
   * @param {Object} drift - Drift result
   * @param {string} severity - Severity level
   * @returns {string} Impact level
   */
  _assessImpact(drift, severity) {
    return StatisticsUtil.assessImpact(drift, severity, {
      industry: this.industry
    });
  }

  /**
   * Store audit log entry
   *
   * @param {Object} entry - Log entry
   */
  _logAudit(entry) {
    const logEntry = {
      timestamp: Date.now(),
      industry: this.industry,
      modelType: this.modelType,
      ...entry
    };

    this.auditLog.push(logEntry);
    this.logger.info(logEntry, 'Audit event');
  }

  /**
   * Trigger alert
   *
   * @param {Object} alert - Alert details
   */
  _triggerAlert(alert) {
    const alertEntry = {
      timestamp: Date.now(),
      industry: this.industry,
      modelType: this.modelType,
      ...alert
    };

    this.alerts.push(alertEntry);
    this.monitoringStats.alertsTriggered++;

    this.logger.warn(alertEntry, 'Alert triggered');
  }

  /**
   * Store episode in memory
   *
   * @param {Object} episode - Episode details
   */
  _storeEpisode(episode) {
    this.episodeMemory.push({
      timestamp: Date.now(),
      industry: this.industry,
      ...episode
    });
  }

  /**
   * Store skill in memory
   *
   * @param {Object} skill - Skill details
   */
  _storeSkill(skill) {
    this.skillMemory.push({
      timestamp: Date.now(),
      industry: this.industry,
      ...skill
    });
  }

  /**
   * Get monitoring statistics
   *
   * @returns {Object} Statistics
   */
  getMonitoringStats() {
    return {
      ...this.monitoringStats,
      memoryUsage: {
        auditLog: this.auditLog.getStats(),
        alerts: this.alerts.getStats(),
        episodes: this.episodeMemory.getStats(),
        skills: this.skillMemory.getStats()
      }
    };
  }

  /**
   * Get recent alerts
   *
   * @param {number} count - Number of alerts to retrieve
   * @returns {Array} Recent alerts
   */
  getRecentAlerts(count = 10) {
    return this.alerts.getRecent(count);
  }

  /**
   * Get audit log
   *
   * @param {number} count - Number of entries to retrieve
   * @returns {Array} Audit log entries
   */
  getAuditLog(count = 100) {
    return this.auditLog.getRecent(count);
  }

  /**
   * Clear all memory buffers
   * Useful for testing or manual reset
   */
  clearMemory() {
    this.auditLog.clear();
    this.alerts.clear();
    this.episodeMemory.clear();
    this.skillMemory.clear();

    this.logger.info('Memory buffers cleared');
  }
}
