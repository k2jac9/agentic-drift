# Agentic-Drift Usage Guide
**Complete Guide to Using Agentic-Drift for Drift Detection & AI Agent Coordination**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Drift Detection](#basic-drift-detection)
3. [Industry-Specific Monitors](#industry-specific-monitors)
4. [Multi-Agent Coordination](#multi-agent-coordination)
5. [Advanced Features](#advanced-features)
6. [Production Deployment](#production-deployment)
7. [Integration Patterns](#integration-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agentic-drift.git
cd agentic-drift

# Install dependencies
npm install

# Optional: Set up environment variables
cp .env.example .env
# Edit .env and add your API keys (optional)
```

### 30-Second Example

```javascript
import { DriftEngine } from './src/core/DriftEngine.js';

// Create engine
const engine = await DriftEngine.create();

// Set baseline (training data)
await engine.setBaseline([0.5, 0.6, 0.7, 0.8, 0.9]);

// Detect drift in new data
const result = await engine.detectDrift([0.55, 0.65, 0.75, 0.85, 0.95]);

console.log('Drift detected:', result.isDrift);
console.log('Severity:', result.severity);
console.log('Average score:', result.averageScore);
```

**Output**:
```
Drift detected: false
Severity: low
Average score: 0.042
```

---

## Basic Drift Detection

### Use Case 1: Simple Drift Detection

**Scenario**: You have a baseline dataset and want to check if new data has drifted.

```javascript
import { DriftEngine } from './src/core/DriftEngine.js';

async function basicDriftDetection() {
  // Initialize engine
  const engine = await DriftEngine.create({
    driftThreshold: 0.1,  // PSI threshold (0.1 = 10% drift)
    primaryMethod: 'psi'   // Use Population Stability Index
  });

  // Set baseline from historical data
  const historicalData = [
    650, 680, 720, 710, 690, 700, 725, 705, 715, 695
  ]; // Credit scores from last month

  await engine.setBaseline(historicalData, {
    version: 'v1.0',
    description: 'Baseline credit scores - October 2025',
    source: 'production'
  });

  // Check new data for drift
  const newData = [
    550, 580, 600, 590, 610, 605, 595, 585, 575, 560
  ]; // Concerning drop in scores!

  const result = await engine.detectDrift(newData);

  // Interpret results
  if (result.isDrift) {
    console.log(`⚠️  DRIFT DETECTED! Severity: ${result.severity}`);
    console.log(`📊 Scores:`, result.scores);
    console.log(`🎯 Primary method: ${result.primaryMethod}`);

    // Get recommendations
    if (result.severity === 'high' || result.severity === 'critical') {
      console.log('🚨 URGENT: Immediate action required!');
      console.log('Recommended actions:');
      console.log('1. Review recent model changes');
      console.log('2. Check data pipeline for issues');
      console.log('3. Consider retraining model');
    }
  } else {
    console.log('✅ No drift detected. System is stable.');
  }

  // Get statistics
  const stats = engine.getStatistics();
  console.log(`\n📈 Statistics:`, {
    totalChecks: stats.totalChecks,
    driftDetected: stats.driftDetected,
    driftRate: stats.driftRate
  });
}

basicDriftDetection();
```

### Use Case 2: Monitoring Streaming Data

**Scenario**: Real-time monitoring with adaptive sampling (skips unchanged data).

```javascript
import { DriftEngine } from './src/core/DriftEngine.js';

async function streamingMonitor() {
  const engine = await DriftEngine.create({
    adaptiveSampling: true,  // ⚡ Skip similar data (95%+ efficiency)
    memoization: true,       // Cache results for identical data
    driftThreshold: 0.08     // More sensitive (8% threshold)
  });

  // Set baseline
  await engine.setBaseline(getProductionData());

  // Simulate streaming data every 5 seconds
  setInterval(async () => {
    const currentData = await fetchLatestData();

    const result = await engine.detectDrift(currentData, {
      adaptiveSampling: true  // Enable adaptive sampling
    });

    if (result.skipped) {
      console.log('⚡ Check skipped (data unchanged, <5% difference)');
      return;
    }

    if (result.isDrift) {
      await sendAlert({
        severity: result.severity,
        score: result.averageScore,
        timestamp: new Date(result.timestamp)
      });
    }

    console.log(`✓ Check completed in ${Date.now() - result.timestamp}ms`);
  }, 5000);
}

streamingMonitor();
```

### Use Case 3: Multi-Method Ensemble

**Scenario**: Use all 4 drift detection methods for robust detection.

```javascript
async function ensembleDetection() {
  const engine = await DriftEngine.create({
    primaryMethod: 'ensemble'  // Use all methods
  });

  await engine.setBaseline(baselineData);

  const result = await engine.detectDrift(currentData);

  console.log('📊 All Method Scores:');
  console.log(`  PSI: ${result.scores.psi.toFixed(3)}`);
  console.log(`  KS:  ${result.scores.ks.toFixed(3)}`);
  console.log(`  JSD: ${result.scores.jsd.toFixed(3)}`);
  console.log(`  Stat: ${result.scores.statistical.toFixed(3)}`);
  console.log(`\n🎯 Ensemble Average: ${result.averageScore.toFixed(3)}`);

  // Majority voting
  const driftMethods = Object.entries(result.scores)
    .filter(([_, score]) => score > 0.1)
    .map(([method]) => method);

  if (driftMethods.length >= 2) {
    console.log(`⚠️  ${driftMethods.length}/4 methods detected drift`);
    console.log(`Methods: ${driftMethods.join(', ')}`);
  }
}
```

---

## Industry-Specific Monitors

### Use Case 4: Financial Services (Credit Scoring)

**Scenario**: Monitor credit score distributions with Basel II/III compliance.

```javascript
import { FinancialDriftMonitor } from './src/use-cases/FinancialDriftMonitor.js';

async function creditScoringMonitor() {
  // Initialize with Basel II/III compliant settings
  const monitor = await FinancialDriftMonitor.create({
    driftThreshold: 0.15,  // Basel standard PSI threshold
    primaryMethod: 'psi'   // Required for regulatory compliance
  });

  // Set baseline from approved loan applications
  const approvedLoans = await fetchApprovedLoans('2024-Q4');
  const creditScores = approvedLoans.map(loan => loan.creditScore);

  await monitor.setBaseline(creditScores, {
    version: '2024-Q4',
    description: 'Approved loan credit scores - Q4 2024',
    source: 'production',
    tags: { regulatory: 'Basel-III', region: 'US' }
  });

  // Monitor current applications
  const currentApplications = await fetchCurrentApplications();
  const currentScores = currentApplications.map(app => app.creditScore);

  const result = await monitor.monitorCreditScoring(currentScores);

  // Handle results
  if (result.isDrift) {
    console.log(`\n🚨 CREDIT SCORE DRIFT DETECTED`);
    console.log(`Severity: ${result.severity}`);
    console.log(`PSI Score: ${result.scores.psi.toFixed(4)}`);

    // Regulatory actions
    if (result.scores.psi > 0.25) {
      console.log('\n⚠️  REGULATORY ALERT: PSI > 0.25');
      console.log('Required actions:');
      console.log('1. Document drift in risk report');
      console.log('2. Notify credit risk committee');
      console.log('3. Assess model recalibration need');
      console.log('4. Update Basel III disclosures');
    }

    // Generate compliance report
    const complianceReport = await monitor.generateComplianceReport();
    await saveReport(complianceReport, 'credit-drift-compliance.json');
  }

  // Check feature drift (detailed analysis)
  const featureDrift = await monitor.analyzeFeatureDrift({
    income: currentApplications.map(a => a.income),
    debtToIncome: currentApplications.map(a => a.dti),
    loanAmount: currentApplications.map(a => a.amount)
  });

  console.log('\n📊 Feature Drift Analysis:');
  featureDrift.forEach(feature => {
    console.log(`  ${feature.name}: ${feature.isDrift ? '⚠️  DRIFT' : '✓ Stable'}`);
  });
}

creditScoringMonitor();
```

### Use Case 5: Fraud Detection

**Scenario**: Detect changes in fraud patterns with real-time alerts.

```javascript
async function fraudDetectionMonitor() {
  const monitor = await FinancialDriftMonitor.create({
    driftThreshold: 0.12,  // More sensitive for fraud
    adaptiveSampling: false // Don't skip checks for fraud!
  });

  // Baseline: Normal transaction patterns
  const normalTransactions = await fetchTransactions({
    type: 'legitimate',
    period: 'last_30_days'
  });

  const transactionAmounts = normalTransactions.map(t => t.amount);
  await monitor.setBaseline(transactionAmounts);

  // Monitor current transactions
  const result = await monitor.monitorFraudDetection(
    currentTransactionAmounts,
    { detectSpikes: true }  // Enable spike detection
  );

  if (result.anomalies && result.anomalies.spikes.length > 0) {
    console.log('🚨 FRAUD PATTERN SPIKE DETECTED!');
    console.log(`Spike count: ${result.anomalies.spikes.length}`);
    console.log('Suspicious transactions:', result.anomalies.spikes);

    // Immediate action
    await freezeSuspiciousAccounts(result.anomalies.spikes);
    await notifySecurityTeam(result);
  }

  if (result.isDrift) {
    console.log('\n⚠️  Fraud pattern drift detected');
    console.log('Recommended actions:');
    console.log('1. Update fraud detection rules');
    console.log('2. Retrain fraud ML model');
    console.log('3. Increase manual review threshold');
  }
}
```

### Use Case 6: Portfolio Risk Monitoring

```javascript
async function portfolioRiskMonitor() {
  const monitor = await FinancialDriftMonitor.create();

  // Baseline risk distribution
  const historicalRisk = await fetchPortfolioRisk('2024-Q4');
  await monitor.setBaseline(historicalRisk);

  // Current portfolio risk
  const currentRisk = await calculateCurrentPortfolioRisk();

  const result = await monitor.monitorPortfolioRisk(currentRisk);

  if (result.severity === 'high' || result.severity === 'critical') {
    console.log('🚨 PORTFOLIO RISK DRIFT - CRITICAL');
    console.log(`Risk increase: ${result.riskIncrease}%`);

    // Risk committee notification
    await sendRiskAlert({
      severity: result.severity,
      riskIncrease: result.riskIncrease,
      recommendations: [
        'Rebalance portfolio to reduce exposure',
        'Hedge against increased risk',
        'Review concentration limits',
        'Update VaR calculations'
      ]
    });
  }
}
```

---

## Multi-Agent Coordination

### Use Case 7: Hive Mind Swarm for Complex Analysis

**Scenario**: Deploy 8 specialized agents to comprehensively analyze drift.

```javascript
import { mcp__claude_flow__swarm_init } from './mcp-tools.js';
import { Task } from './claude-code-tools.js';

async function hiveMinddriftAnalysis(driftData) {
  // Step 1: Initialize Hive Mind with mesh topology
  await mcp__claude_flow__swarm_init({
    topology: 'mesh',
    maxAgents: 8,
    strategy: 'adaptive'
  });

  // Step 2: Store drift data in shared memory
  await mcp__claude_flow__memory_usage({
    action: 'store',
    key: 'hive/drift-data',
    value: JSON.stringify(driftData),
    namespace: 'analysis'
  });

  // Step 3: Spawn specialized agents in parallel (Claude Code Task tool)
  // All agents run concurrently and coordinate via memory
  const analysisPromises = [
    // Researcher: Find similar past drift events
    Task('Researcher Agent', `
      Analyze drift data and search for similar historical patterns.
      Data location: hive/drift-data in memory namespace 'analysis'.
      Store findings in hive/researcher/patterns.
    `, 'researcher'),

    // Analyst: Statistical deep dive
    Task('Analyst Agent', `
      Perform statistical analysis on drift data.
      Compare PSI, KS, JSD, and statistical methods.
      Store analysis in hive/analyst/statistics.
    `, 'analyst'),

    // Coder: Generate response code
    Task('Coder Agent', `
      Create automated response scripts based on drift severity.
      Store code in hive/coder/response-scripts.
    `, 'coder'),

    // Reviewer: Risk assessment
    Task('Reviewer Agent', `
      Review drift severity and assess business risk.
      Store risk report in hive/reviewer/risk-assessment.
    `, 'reviewer'),

    // Tester: Validate detection
    Task('Tester Agent', `
      Validate drift detection with statistical tests.
      Store validation in hive/tester/validation.
    `, 'tester'),

    // System Architect: Design mitigation strategy
    Task('System Architect', `
      Design system architecture for drift mitigation.
      Store architecture in hive/architect/mitigation-design.
    `, 'system-architect'),

    // Perf Analyzer: Performance impact
    Task('Performance Analyzer', `
      Analyze performance impact of drift on systems.
      Store metrics in hive/perf-analyzer/impact.
    `, 'perf-analyzer'),

    // API Docs: Documentation
    Task('API Documentation Agent', `
      Document drift event and response procedures.
      Store docs in hive/api-docs/drift-documentation.
    `, 'api-docs')
  ];

  // Wait for all agents to complete
  const results = await Promise.all(analysisPromises);

  // Step 4: Aggregate findings
  const aggregatedFindings = await mcp__claude_flow__memory_usage({
    action: 'retrieve',
    key: 'hive/*',
    namespace: 'analysis'
  });

  // Step 5: Generate comprehensive report
  const report = {
    timestamp: new Date(),
    driftSeverity: driftData.severity,
    agentFindings: aggregatedFindings,
    recommendations: extractRecommendations(aggregatedFindings),
    actionPlan: generateActionPlan(aggregatedFindings)
  };

  return report;
}

// Usage
const driftEvent = {
  isDrift: true,
  severity: 'high',
  scores: { psi: 0.28, ks: 0.15, jsd: 0.22, statistical: 0.19 },
  data: currentData
};

const comprehensiveReport = await hiveMinddriftAnalysis(driftEvent);
console.log(comprehensiveReport);
```

### Use Case 8: Adaptive Response System

**Scenario**: Automatic drift response with 4-agent coordination.

```javascript
import { AdaptiveResponseSystem } from './src/adapters/AdaptiveResponseSystem.js';

async function adaptiveResponseDemo() {
  // Initialize response system
  const responseSystem = await AdaptiveResponseSystem.create({
    autoExecute: true,        // Automatically execute high-confidence responses
    confidenceThreshold: 0.85 // Execute if confidence >= 85%
  });

  // Detect drift
  const engine = await DriftEngine.create();
  await engine.setBaseline(baselineData);
  const driftResult = await engine.detectDrift(currentData);

  if (driftResult.isDrift) {
    console.log('🔍 Drift detected, initiating adaptive response...\n');

    // Let the 4-agent system handle it
    const response = await responseSystem.respondToDrift(driftResult, {
      model: 'current-credit-model-v2',
      dataSource: 'production-applications',
      criticalThreshold: 0.25
    });

    // Agent 1: Analyzer
    console.log('📊 ANALYSIS (AnalyzerAgent):');
    console.log(`  Root cause: ${response.analysis.rootCause}`);
    console.log(`  Confidence: ${response.analysis.confidence}%`);
    console.log(`  Factors: ${response.analysis.contributingFactors.join(', ')}`);

    // Agent 2: Recommender
    console.log('\n💡 RECOMMENDATIONS (RecommenderAgent):');
    response.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec.action} (Priority: ${rec.priority})`);
      console.log(`     Automation: ${rec.canAutomate ? '✓' : '✗'}`);
    });

    // Agent 3: Executor (if auto-execute enabled)
    if (response.execution) {
      console.log('\n⚡ EXECUTION (ExecutorAgent):');
      console.log(`  Actions taken: ${response.execution.actionsExecuted}`);
      console.log(`  Status: ${response.execution.status}`);
    }

    // Agent 4: Monitor
    console.log('\n📈 MONITORING (MonitorAgent):');
    console.log(`  Metrics tracked: ${response.monitoring.metrics.length}`);
    console.log(`  Next check: ${response.monitoring.nextCheckpoint}`);

    // Store response as a skill for future reuse
    if (response.execution.status === 'success') {
      await responseSystem.storeSuccessfulResponse(driftResult, response);
      console.log('\n✅ Response stored as reusable skill');
    }
  }
}

adaptiveResponseDemo();
```

---

## Advanced Features

### Use Case 9: Predictive Drift Forecasting

**Scenario**: Predict drift before it happens (7-30 days ahead).

```javascript
async function predictiveDriftForecast() {
  const engine = await DriftEngine.create({
    predictionWindow: 14  // Predict 14 days ahead
  });

  // Set baseline and historical data
  await engine.setBaseline(historicalData);

  // Run multiple drift checks to build history
  for (const dailyData of last30Days) {
    await engine.detectDrift(dailyData);
  }

  // Get drift prediction
  const prediction = await engine.predictDrift(14); // 14 days ahead

  console.log('🔮 DRIFT PREDICTION (14 days):');
  console.log(`  Predicted drift: ${prediction.willDrift ? 'YES' : 'NO'}`);
  console.log(`  Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
  console.log(`  Trend: ${prediction.trend}`);

  if (prediction.willDrift) {
    console.log(`  Estimated severity: ${prediction.estimatedSeverity}`);
    console.log(`  Days until drift: ${prediction.daysUntilDrift}`);

    // Proactive actions
    console.log('\n⚡ PROACTIVE RECOMMENDATIONS:');
    console.log('1. Schedule model retraining for', prediction.recommendedRetrainDate);
    console.log('2. Increase monitoring frequency to hourly');
    console.log('3. Prepare updated baseline data');
    console.log('4. Alert stakeholders of upcoming drift');
  }
}
```

### Use Case 10: Learning from Past Drift Events

**Scenario**: Use AgentDB to learn from historical drift responses.

```javascript
async function learningFromHistory() {
  const engine = await DriftEngine.create();

  // Detect drift
  const result = await engine.detectDrift(currentData);

  if (result.isDrift) {
    // Search for similar past drift events
    const similarEvents = await engine.reflexion.recall({
      task: 'drift_detection',
      minScore: 0.7,
      limit: 5
    });

    console.log(`\n📚 Found ${similarEvents.length} similar past drift events`);

    // Analyze what worked before
    const successfulResponses = similarEvents
      .filter(event => event.success)
      .map(event => event.response);

    console.log('\n✅ Successful past responses:');
    successfulResponses.forEach(response => {
      console.log(`  - ${response.action} (Success rate: ${response.successRate}%)`);
    });

    // Apply learned patterns
    const bestResponse = successfulResponses[0];
    console.log(`\n🎯 Applying learned pattern: ${bestResponse.action}`);
    await executeResponse(bestResponse);

    // Store this event for future learning
    await engine.reflexion.storeEpisode({
      sessionId: `drift-${Date.now()}`,
      task: 'drift_detection',
      score: result.averageScore,
      success: true,
      reflection: 'Applied successful pattern from past events',
      response: bestResponse
    });
  }
}
```

### Use Case 11: Causal Reasoning

**Scenario**: Understand cause-effect relationships in drift.

```javascript
async function causalReasoningExample() {
  const engine = await DriftEngine.create();

  // Track causal relationships over time
  await engine.causal.addRelationship({
    cause: 'economic_downturn',
    effect: 'credit_score_decline',
    strength: 0.85,
    samples: 1000
  });

  await engine.causal.addRelationship({
    cause: 'credit_score_decline',
    effect: 'model_drift',
    strength: 0.92,
    samples: 500
  });

  // When drift is detected, find root causes
  const result = await engine.detectDrift(currentData);

  if (result.isDrift) {
    const rootCauses = await engine.causal.getCauses('model_drift', {
      minStrength: 0.7,
      depth: 2  // Look 2 levels deep
    });

    console.log('🔍 ROOT CAUSE ANALYSIS:');
    rootCauses.forEach(cause => {
      console.log(`  ${cause.cause} → ${cause.effect}`);
      console.log(`    Strength: ${(cause.strength * 100).toFixed(0)}%`);
      console.log(`    Uplift: ${(cause.uplift * 100).toFixed(2)}%`);
    });

    // Find what actions reduce drift
    const solutions = await engine.causal.getEffects('model_retraining');
    console.log('\n💡 KNOWN SOLUTIONS:');
    solutions.forEach(solution => {
      console.log(`  ${solution.action} → ${solution.outcome}`);
      console.log(`    Effectiveness: ${(solution.strength * 100).toFixed(0)}%`);
    });
  }
}
```

---

## Production Deployment

### Use Case 12: Production-Ready Setup

```javascript
// production-drift-monitor.js
import { DriftEngine } from './src/core/DriftEngine.js';
import { createLogger } from './src/utils/logger.js';
import { env } from './src/config/env.js';

const logger = createLogger('ProductionMonitor');

class ProductionDriftMonitor {
  constructor() {
    this.engine = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      // Production configuration
      this.engine = await DriftEngine.create({
        dbPath: env.DB_PATH,              // Persistent SQLite
        driftThreshold: 0.15,              // Basel II/III compliant
        maxHistorySize: env.MAX_HISTORY_SIZE,
        maxCacheSize: env.MAX_CACHE_SIZE,
        adaptiveSampling: env.ADAPTIVE_SAMPLING,
        memoization: env.MEMOIZATION
      });

      // Load baseline from secure storage
      const baseline = await this.loadBaseline();
      await this.engine.setBaseline(baseline.data, baseline.metadata);

      logger.info('Production drift monitor initialized', {
        dbPath: env.DB_PATH,
        threshold: 0.15,
        baselineVersion: baseline.metadata.version
      });

      this.isRunning = true;
    } catch (error) {
      logger.error('Failed to initialize drift monitor', { error: error.message });
      throw error;
    }
  }

  async monitorContinuous(interval = 60000) {
    logger.info(`Starting continuous monitoring (interval: ${interval}ms)`);

    while (this.isRunning) {
      try {
        const data = await this.fetchCurrentData();
        const result = await this.engine.detectDrift(data);

        // Log all checks
        logger.info('Drift check completed', {
          isDrift: result.isDrift,
          severity: result.severity,
          score: result.averageScore,
          skipped: result.skipped || false
        });

        // Alert on drift
        if (result.isDrift) {
          await this.handleDrift(result);
        }

        // Health metrics
        const stats = this.engine.getStatistics();
        logger.debug('Monitor statistics', stats);

      } catch (error) {
        logger.error('Drift check failed', { error: error.message });
        await this.sendErrorAlert(error);
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  async handleDrift(result) {
    logger.warn('DRIFT DETECTED', {
      severity: result.severity,
      scores: result.scores,
      timestamp: result.timestamp
    });

    // Critical severity - immediate action
    if (result.severity === 'critical' || result.severity === 'high') {
      await this.sendPagerAlert({
        severity: result.severity,
        message: `Critical drift detected: ${result.averageScore.toFixed(3)}`
      });

      // Auto-mitigation
      await this.executeMitigation(result);
    } else {
      // Medium/low - log and notify
      await this.sendSlackNotification(result);
    }

    // Store in incident database
    await this.logIncident(result);
  }

  async stop() {
    logger.info('Stopping production monitor');
    this.isRunning = false;
  }

  // Helper methods
  async loadBaseline() {
    // Load from S3, database, or file system
    return {
      data: await fetchFromS3('baselines/production-v1.json'),
      metadata: {
        version: 'production-v1',
        source: 's3://baselines',
        timestamp: Date.now()
      }
    };
  }

  async fetchCurrentData() {
    // Fetch from your data pipeline
    return await queryProductionDatabase({
      table: 'model_predictions',
      window: 'last_hour',
      metric: 'credit_score'
    });
  }
}

// Run
const monitor = new ProductionDriftMonitor();
await monitor.initialize();
await monitor.monitorContinuous(60000); // Check every minute
```

---

## Integration Patterns

### Use Case 13: Express.js REST API

```javascript
import express from 'express';
import { DriftEngine } from './src/core/DriftEngine.js';

const app = express();
app.use(express.json());

// Initialize engine
const engine = await DriftEngine.create();

// API endpoints
app.post('/api/drift/baseline', async (req, res) => {
  try {
    const { data, metadata } = req.body;
    await engine.setBaseline(data, metadata);

    res.json({
      success: true,
      message: 'Baseline updated',
      metadata
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/drift/detect', async (req, res) => {
  try {
    const { data, options } = req.body;
    const result = await engine.detectDrift(data, options);

    res.json({
      success: true,
      result: {
        isDrift: result.isDrift,
        severity: result.severity,
        scores: result.scores,
        timestamp: result.timestamp
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/drift/history', async (req, res) => {
  const history = engine.getHistory();
  res.json({ success: true, history });
});

app.get('/api/drift/stats', async (req, res) => {
  const stats = engine.getStatistics();
  res.json({ success: true, stats });
});

app.listen(3000, () => {
  console.log('Drift detection API running on port 3000');
});
```

### Use Case 14: Scheduled Jobs (Cron)

```javascript
import cron from 'node-cron';
import { DriftEngine } from './src/core/DriftEngine.js';

const engine = await DriftEngine.create();

// Daily baseline update (3 AM)
cron.schedule('0 3 * * *', async () => {
  console.log('Running daily baseline update...');

  const yesterdayData = await fetchDataForDate(getYesterday());
  await engine.setBaseline(yesterdayData, {
    version: `auto-${new Date().toISOString().split('T')[0]}`,
    description: 'Automated daily baseline update'
  });

  console.log('✅ Baseline updated');
});

// Hourly drift check
cron.schedule('0 * * * *', async () => {
  console.log('Running hourly drift check...');

  const lastHourData = await fetchLastHourData();
  const result = await engine.detectDrift(lastHourData);

  if (result.isDrift) {
    await notifyTeam(result);
  }

  console.log(`✅ Check completed: ${result.isDrift ? 'DRIFT' : 'OK'}`);
});
```

---

## Troubleshooting

### Common Issues

**1. "Baseline not set" Error**
```javascript
// ❌ Wrong
const result = await engine.detectDrift(data);

// ✅ Correct
await engine.setBaseline(trainingData);
const result = await engine.detectDrift(data);
```

**2. High Memory Usage**
```javascript
// Configure limits
const engine = await DriftEngine.create({
  maxHistorySize: 500,   // Reduce from 1000
  maxCacheSize: 50       // Reduce from 100
});
```

**3. Slow Performance**
```javascript
// Enable optimizations
const engine = await DriftEngine.create({
  adaptiveSampling: true,  // Skip similar checks
  memoization: true        // Cache results
});
```

**4. False Positives**
```javascript
// Adjust sensitivity
const engine = await DriftEngine.create({
  driftThreshold: 0.2,  // Less sensitive (was 0.1)
  primaryMethod: 'psi'  // Most stable method
});
```

---

## Next Steps

1. **Start Simple**: Use Case 1 (Basic Drift Detection)
2. **Add Monitoring**: Use Case 2 (Streaming Monitor)
3. **Go Production**: Use Case 12 (Production Setup)
4. **Add Intelligence**: Use Case 8 (Adaptive Response)
5. **Scale Up**: Use Case 7 (Hive Mind Swarm)

**Need Help?**
- 📖 [Full API Documentation](./API_REFERENCE.md)
- 🏗️ [Architecture Guide](../sparc/phase-3-architecture/ARCHITECTURE.md)
- 🧪 [Testing Guide](./TESTING_GUIDE.md)
- 🚀 [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

**Last Updated**: 2025-11-12
**Version**: 1.0
**Status**: Production-Ready
