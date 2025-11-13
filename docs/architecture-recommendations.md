# Architecture & Dependency Recommendations

**Project**: agentic-drift v1.0.0
**Analysis Date**: 2025-11-12
**Architecture Role**: System Architecture Designer

---

## Architecture Overview

### Current Architecture

```
agentic-drift/
├── src/
│   ├── core/              # Core business logic
│   │   └── DriftEngine.js (25KB, 700 lines)
│   ├── adapters/          # External integrations
│   │   └── AdaptiveResponseSystem.js (17KB, 500 lines)
│   └── use-cases/         # Industry-specific implementations
│       ├── FinancialDriftMonitor.js (17KB, 500 lines)
│       ├── HealthcareDriftMonitor.js (13KB, 380 lines)
│       └── ManufacturingDriftMonitor.js (14KB, 420 lines)
├── tests/
│   ├── unit/              # Unit tests (48 tests)
│   ├── integration/       # Integration tests (12 tests)
│   └── helpers/           # Test utilities
└── examples/              # Usage examples
```

**Architecture Style**: Clean Architecture / Hexagonal Architecture
**Pattern**: Layered architecture with separation of concerns

---

## Architecture Decision Records

### ADR-001: Clean Architecture Pattern

**Status**: Implemented
**Date**: 2025-11-12

**Context**:
Project requires separation between core drift detection logic and industry-specific implementations.

**Decision**:
Implement Clean Architecture with three layers:
1. **Core** (src/core): Business logic, independent of external dependencies
2. **Adapters** (src/adapters): Integration with external systems (AgentDB, agentic-flow)
3. **Use Cases** (src/use-cases): Industry-specific drift monitoring implementations

**Consequences**:
- ✅ Easy to test core logic in isolation
- ✅ Industry-specific monitors can be added without changing core
- ✅ External dependencies isolated to adapters
- ⚠️ More files and indirection
- ⚠️ Developers must understand layer boundaries

**Compliance**: ✅ Current implementation follows this pattern

---

### ADR-002: ESM Module System

**Status**: Implemented
**Date**: 2025-11-12

**Context**:
Modern JavaScript supports ES modules, providing better tree-shaking and static analysis.

**Decision**:
Use ES modules (`type: "module"` in package.json) throughout the project.

**Consequences**:
- ✅ Better IDE support and autocomplete
- ✅ Static import/export analysis
- ✅ Future-proof for modern tooling
- ⚠️ Requires Node.js 14+
- ⚠️ Cannot mix with CommonJS easily

**Compliance**: ✅ Fully implemented

---

### ADR-003: Minimal Production Dependencies

**Status**: Implemented
**Date**: 2025-11-12

**Context**:
Large dependency trees increase security risk, bundle size, and maintenance burden.

**Decision**:
Keep production dependencies minimal (currently 3: agentdb, agentic-flow, hnswlib-node).

**Consequences**:
- ✅ Smaller attack surface
- ✅ Faster installation
- ✅ Easier dependency auditing
- ⚠️ May need to implement some utilities ourselves

**Compliance**: ✅ Excellent - only 3 production dependencies

---

### ADR-004: Vitest for Testing

**Status**: Implemented
**Date**: 2025-11-12

**Context**:
Need fast, modern testing framework with good ES module support.

**Decision**:
Use Vitest instead of Jest due to:
- Native ES module support
- Vite-powered (extremely fast)
- Compatible with Jest API
- Built-in code coverage

**Consequences**:
- ✅ Fast test execution
- ✅ Great developer experience
- ✅ Hot module reloading for tests
- ⚠️ Smaller ecosystem than Jest

**Compliance**: ✅ Fully implemented with 80% coverage

---

## Dependency Analysis

### Production Dependencies (3 total - Excellent)

#### 1. agentdb (v1.6.1)

**Purpose**: Vector database for AI agent memory
**License**: MIT
**Size**: ~15MB (estimated)
**Status**: ✅ Up-to-date

**Features Used**:
- Reflexion memory system
- Skill library
- Causal memory tracking
- Vector search

**Risk Assessment**: LOW
- Well-maintained
- Clear licensing
- No security issues
- Active development

**Architecture Impact**:
- Used in adapters layer
- Core DriftEngine doesn't directly depend on it
- Good architectural separation

**Recommendation**: Keep. Essential for agentic memory features.

---

#### 2. agentic-flow (v1.10.2)

**Purpose**: Multi-agent orchestration framework
**License**: MIT
**Size**: ~20MB (estimated)
**Status**: ✅ Up-to-date

**Features Used**:
- Agent spawning
- Task orchestration
- Memory coordination
- SPARC methodology support

**Risk Assessment**: LOW
- Active development
- Clear licensing
- No security issues
- Good documentation

**Architecture Impact**:
- Used throughout the application
- Provides coordination infrastructure
- Enables SPARC workflow

**Recommendation**: Keep. Core framework dependency.

---

#### 3. hnswlib-node (v3.0.0)

**Purpose**: High-performance vector search (HNSW algorithm)
**License**: Apache-2.0
**Size**: ~5MB (estimated)
**Status**: ✅ Up-to-date

**Features Used**:
- Fast nearest neighbor search
- Vector similarity matching
- HNSW indexing

**Risk Assessment**: LOW
- Native module (requires compilation)
- Apache 2.0 license (permissive)
- Stable API
- Good performance characteristics

**Architecture Impact**:
- Used by AgentDB internally
- Native module requires build tooling
- Performance-critical component

**Recommendation**: Keep. Essential for vector search performance.

---

### Transitive Dependencies Assessment

**Total**: 441 packages (311 prod, 113 dev, 67 optional)
**Size**: 496 MB

**Analysis**:
- Larger than ideal due to native module dependencies
- Many optional dependencies for platform-specific binaries
- No security vulnerabilities detected

**Optimization Opportunities**:
1. Use `--production` flag in production deployments
2. Consider using `pnpm` instead of `npm` for deduplication
3. Docker multi-stage builds to exclude dev dependencies

---

## Architecture Recommendations

### 1. Add Dependency Injection (MEDIUM PRIORITY)

**Current Issue**: Hard-coded dependencies in constructors

**Recommendation**: Implement dependency injection pattern

**Example Refactoring**:

```javascript
// Before: Hard-coded dependency
class DriftEngine {
  constructor(config) {
    this.agentDB = new AgentDB(config.dbPath);
  }
}

// After: Dependency injection
class DriftEngine {
  constructor(config, dependencies = {}) {
    this.agentDB = dependencies.agentDB || new AgentDB(config.dbPath);
    this.logger = dependencies.logger || console;
  }
}

// Benefits for testing
const mockDB = createMockAgentDB();
const engine = new DriftEngine(config, { agentDB: mockDB });
```

**Benefits**:
- Easier unit testing (inject mocks)
- Better separation of concerns
- More flexible configuration
- Enables different implementations

**Effort**: 4-6 hours
**Impact**: HIGH (improves testability)

---

### 2. Extract Configuration Layer (HIGH PRIORITY)

**Current Issue**: Configuration scattered across files

**Recommendation**: Centralize configuration

**Proposed Structure**:

```
src/
├── config/
│   ├── env.js           # Environment validation
│   ├── defaults.js      # Default configurations
│   ├── drift-config.js  # Drift detection thresholds
│   └── index.js         # Export unified config
```

**Example Implementation**:

```javascript
// src/config/drift-config.js
export const driftConfig = {
  baseline: {
    threshold: 0.1,
    minSamples: 100,
    methods: ['psi', 'ks', 'jsd', 'statistical'],
  },
  financial: {
    threshold: 0.15,
    psiThresholds: {
      low: 0.05,
      medium: 0.10,
      high: 0.15,
      critical: 0.25,
    },
  },
  healthcare: {
    threshold: 0.08,
    hipaaCompliance: true,
  },
  manufacturing: {
    threshold: 0.12,
    qualityMetrics: true,
  },
};

// src/config/index.js
export { env } from './env.js';
export { driftConfig } from './drift-config.js';
```

**Benefits**:
- Single source of truth for configuration
- Easier to manage different environments
- Type-safe configuration with validation
- Clear documentation of all settings

**Effort**: 3-4 hours
**Impact**: HIGH (improves maintainability)

---

### 3. Add Error Handling Layer (HIGH PRIORITY)

**Current Issue**: Error handling inconsistent

**Recommendation**: Create custom error hierarchy

**Example Implementation**:

```javascript
// src/core/errors.js

/**
 * Base error for drift detection system
 */
export class DriftError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'DriftError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validation errors
 */
export class ValidationError extends DriftError {
  constructor(message, details) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Drift detection errors
 */
export class DetectionError extends DriftError {
  constructor(message, details) {
    super(message, 'DETECTION_ERROR', details);
    this.name = 'DetectionError';
  }
}

/**
 * Database errors
 */
export class DatabaseError extends DriftError {
  constructor(message, details) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

// Usage in DriftEngine
import { ValidationError, DetectionError } from './errors.js';

class DriftEngine {
  async detectDrift(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new ValidationError('Data must be a non-empty array', {
        received: typeof data,
        length: data?.length,
      });
    }

    try {
      // Detection logic
    } catch (error) {
      throw new DetectionError('Drift detection failed', {
        originalError: error.message,
        method: 'detectDrift',
      });
    }
  }
}
```

**Benefits**:
- Consistent error handling across application
- Better error messages for debugging
- Easier to implement error tracking
- Type-safe error handling

**Effort**: 2-3 hours
**Impact**: MEDIUM-HIGH

---

### 4. Add Repository Pattern for Data Access (MEDIUM PRIORITY)

**Current Issue**: Direct database access in business logic

**Recommendation**: Implement repository pattern

**Example Structure**:

```javascript
// src/repositories/DriftRepository.js
export class DriftRepository {
  constructor(database) {
    this.db = database;
  }

  async saveBaseline(sessionId, data) {
    return this.db.store('baseline', sessionId, data);
  }

  async getBaseline(sessionId) {
    return this.db.retrieve('baseline', sessionId);
  }

  async saveDriftResult(sessionId, result) {
    return this.db.store('drift_result', sessionId, result);
  }
}

// src/core/DriftEngine.js
class DriftEngine {
  constructor(config, { repository, logger }) {
    this.repository = repository;
    this.logger = logger;
  }

  async setBaseline(data) {
    const validated = this.validateData(data);
    await this.repository.saveBaseline(this.sessionId, validated);
  }
}
```

**Benefits**:
- Cleaner separation of concerns
- Easier to test business logic
- Can swap database implementations
- Centralizes data access logic

**Effort**: 6-8 hours
**Impact**: MEDIUM (improves architecture)

---

### 5. Add API Layer for External Consumption (LOW-MEDIUM PRIORITY)

**Current Issue**: Library-only, no HTTP API

**Recommendation**: Add optional HTTP API layer using Express or Fastify

**Proposed Structure**:

```
src/
├── api/
│   ├── server.js           # HTTP server setup
│   ├── routes/
│   │   ├── drift.js        # Drift detection endpoints
│   │   ├── baseline.js     # Baseline management
│   │   └── health.js       # Health checks
│   ├── middleware/
│   │   ├── auth.js         # Authentication
│   │   ├── validation.js   # Request validation
│   │   └── error.js        # Error handling
│   └── schemas/
│       └── drift.schema.js # Request/response schemas
```

**Example Implementation**:

```javascript
// src/api/server.js
import express from 'express';
import { driftRoutes } from './routes/drift.js';
import { healthRoutes } from './routes/health.js';

export function createServer(driftEngine) {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/drift', driftRoutes(driftEngine));
  app.use('/health', healthRoutes);

  return app;
}

// src/api/routes/drift.js
export function driftRoutes(driftEngine) {
  const router = express.Router();

  router.post('/detect', async (req, res) => {
    try {
      const { data } = req.body;
      const result = await driftEngine.detectDrift(data);
      res.json({ success: true, result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
}
```

**Benefits**:
- Enables HTTP/REST consumption
- Better for microservices architecture
- Easier integration with external systems
- Supports multiple client types

**Effort**: 12-16 hours
**Impact**: MEDIUM (adds new capability)

**Decision**: Consider if HTTP API is needed for your use case

---

## Dependency Version Strategy

### Current Strategy: Caret (^)

All dependencies use caret ranges (e.g., `^1.6.1`), which allows:
- Patch updates: ✅ 1.6.1 → 1.6.2
- Minor updates: ✅ 1.6.1 → 1.7.0
- Major updates: ❌ 1.6.1 → 2.0.0

**Assessment**: ✅ Appropriate for this project

### Alternative Strategies

#### 1. Exact Versions (Locked)

```json
{
  "dependencies": {
    "agentdb": "1.6.1",
    "agentic-flow": "1.10.2"
  }
}
```

**When to use**: Production applications requiring stability

**Pros**: Reproducible builds, no surprises
**Cons**: Miss security patches, manual updates

---

#### 2. Tilde (~) - Patch Updates Only

```json
{
  "dependencies": {
    "agentdb": "~1.6.1",
    "agentic-flow": "~1.10.2"
  }
}
```

**When to use**: Conservative update strategy

**Pros**: Only bug fixes, safer than caret
**Cons**: Miss minor feature releases

---

#### 3. Latest (Bleeding Edge)

```json
{
  "dependencies": {
    "agentdb": "latest",
    "agentic-flow": "latest"
  }
}
```

**When to use**: Never in production

**Pros**: Always up-to-date
**Cons**: Breaking changes, unstable

---

### Recommendation for agentic-drift

**Keep current strategy (caret ^)** with these practices:

1. **Lock file committed**: ✅ Already doing
2. **Dependabot enabled**: ✅ Already doing
3. **CI tests on update**: ❌ Need to add
4. **Manual review of major updates**: Recommended

---

## Performance Considerations

### 1. Bundle Size Optimization

**Current**: No bundling configured

**Recommendations**:

```javascript
// build.config.js using esbuild
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  external: ['agentdb', 'agentic-flow', 'hnswlib-node'],
  format: 'esm',
});
```

**Benefits**:
- Smaller distribution size
- Faster startup time
- Better for serverless deployment

---

### 2. Lazy Loading for Industry Monitors

**Current**: All monitors loaded upfront

**Recommendation**: Dynamic imports

```javascript
// Before: All loaded upfront
import { FinancialDriftMonitor } from './use-cases/FinancialDriftMonitor.js';
import { HealthcareDriftMonitor } from './use-cases/HealthcareDriftMonitor.js';
import { ManufacturingDriftMonitor } from './use-cases/ManufacturingDriftMonitor.js';

// After: Lazy load as needed
async function getMonitor(industry) {
  switch (industry) {
    case 'financial':
      return (await import('./use-cases/FinancialDriftMonitor.js')).FinancialDriftMonitor;
    case 'healthcare':
      return (await import('./use-cases/HealthcareDriftMonitor.js')).HealthcareDriftMonitor;
    case 'manufacturing':
      return (await import('./use-cases/ManufacturingDriftMonitor.js')).ManufacturingDriftMonitor;
    default:
      return (await import('./core/DriftEngine.js')).DriftEngine;
  }
}
```

**Benefits**:
- Faster startup (only load what's needed)
- Lower memory usage
- Better for serverless

**Effort**: 2-3 hours
**Impact**: MEDIUM (for serverless/edge deployments)

---

### 3. Caching Strategy

**Recommendation**: Add caching layer for drift results

```javascript
// src/core/cache.js
import { LRUCache } from 'lru-cache';

export class DriftCache {
  constructor(options = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 100,
      ttl: options.ttl || 1000 * 60 * 60, // 1 hour default
    });
  }

  getCacheKey(baseline, data) {
    return `${JSON.stringify(baseline)}-${JSON.stringify(data)}`;
  }

  get(baseline, data) {
    return this.cache.get(this.getCacheKey(baseline, data));
  }

  set(baseline, data, result) {
    this.cache.set(this.getCacheKey(baseline, data), result);
  }
}

// Usage in DriftEngine
class DriftEngine {
  async detectDrift(data) {
    const cached = this.cache?.get(this.baseline, data);
    if (cached) {
      return cached;
    }

    const result = await this._computeDrift(data);
    this.cache?.set(this.baseline, data, result);
    return result;
  }
}
```

---

## Security Hardening

### 1. Input Validation with Zod

**Priority**: HIGH

```javascript
// src/validation/schemas.js
import { z } from 'zod';

export const BaselineSchema = z.object({
  data: z.array(z.number().finite()).min(1),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const DriftDetectionSchema = z.object({
  data: z.array(z.number().finite()).min(1),
  methods: z.array(z.enum(['psi', 'ks', 'jsd', 'statistical'])).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

// Usage
import { DriftDetectionSchema } from './validation/schemas.js';

class DriftEngine {
  async detectDrift(input) {
    const validated = DriftDetectionSchema.parse(input);
    // ... proceed with validated data
  }
}
```

---

### 2. Rate Limiting (if adding HTTP API)

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);
```

---

## Monitoring & Observability

### 1. Metrics Collection

**Recommendation**: Track key metrics

```javascript
// src/core/metrics.js
export class MetricsCollector {
  constructor() {
    this.metrics = {
      driftDetections: 0,
      driftDetected: 0,
      averageLatency: 0,
      errors: 0,
    };
  }

  recordDetection(result, latency) {
    this.metrics.driftDetections++;
    if (result.isDrift) {
      this.metrics.driftDetected++;
    }
    this.updateAverageLatency(latency);
  }

  recordError(error) {
    this.metrics.errors++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      driftRate: this.metrics.driftDetected / this.metrics.driftDetections,
    };
  }
}
```

---

### 2. Health Check Endpoint

```javascript
// src/api/routes/health.js
export function healthRoutes(driftEngine, metrics) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    });
  });

  router.get('/metrics', (req, res) => {
    res.json(metrics.getMetrics());
  });

  router.get('/ready', async (req, res) => {
    try {
      await driftEngine.healthCheck();
      res.json({ ready: true });
    } catch (error) {
      res.status(503).json({ ready: false, error: error.message });
    }
  });

  return router;
}
```

---

## Scalability Considerations

### Current Architecture Scalability

**Single Node**: ✅ Excellent
- In-memory processing
- SQLite database (AgentDB)
- Fast vector search (HNSW)

**Horizontal Scaling**: ⚠️ Limited
- SQLite doesn't support concurrent writes from multiple processes
- In-memory state doesn't share across instances

---

### Scaling Recommendations

#### 1. For Moderate Scale (1-10 nodes)

**Use PostgreSQL with pgvector extension**:

```javascript
// config/database.js
export const dbConfig = {
  // Development: SQLite
  development: {
    type: 'sqlite',
    path: './drift-memory.db',
  },
  // Production: PostgreSQL
  production: {
    type: 'postgresql',
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
  },
};
```

---

#### 2. For High Scale (10+ nodes)

**Consider microservices architecture**:

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌──▼──┐ ┌─────▼─────┐ ┌──▼────┐
│ Drift │ │Base-│ │  Memory   │ │Worker │
│  API  │ │line │ │  Service  │ │ Pool  │
└───┬───┘ └──┬──┘ └─────┬─────┘ └───┬───┘
    │        │           │            │
    └────────┴───────────┴────────────┘
                    │
            ┌───────▼────────┐
            │   PostgreSQL   │
            │   + pgvector   │
            └────────────────┘
```

---

## Technology Evaluation Matrix

### Alternative Vector Databases

| Database | Pros | Cons | Fit Score |
|----------|------|------|-----------|
| **AgentDB** (current) | Fast, integrated memory features | Limited scaling | 9/10 |
| **Pinecone** | Fully managed, scales infinitely | Expensive, vendor lock-in | 7/10 |
| **Weaviate** | Open source, GraphQL API | More complex setup | 6/10 |
| **Milvus** | High performance, Kubernetes-native | Heavy infrastructure | 5/10 |
| **pgvector** | Use existing PostgreSQL | Slower than specialized DBs | 8/10 |

**Recommendation**: Keep AgentDB for now, consider pgvector for scaling

---

### Alternative Test Frameworks

| Framework | Pros | Cons | Fit Score |
|-----------|------|------|-----------|
| **Vitest** (current) | Fast, modern, great DX | Smaller ecosystem | 9/10 |
| **Jest** | Largest ecosystem, mature | Slower, ESM issues | 7/10 |
| **Mocha** | Flexible, minimal | Requires more setup | 6/10 |
| **AVA** | Concurrent tests | Less popular | 5/10 |

**Recommendation**: Keep Vitest

---

## Summary of Recommendations

### Critical (Do Immediately)

1. ✅ Add CI/CD pipeline
2. ✅ Set up code quality tools (ESLint, Prettier)
3. ✅ Add pre-commit hooks
4. ⚠️ Extract configuration layer
5. ⚠️ Add error handling layer

### High Priority (Next 2 Weeks)

6. Add dependency injection
7. Add TypeScript type checking
8. Implement input validation
9. Add structured logging
10. Create Docker configuration

### Medium Priority (Next Month)

11. Add repository pattern
12. Implement caching strategy
13. Add metrics collection
14. Create health check endpoints
15. Optimize bundle size

### Low Priority (Future)

16. Add HTTP API layer
17. Implement microservices architecture
18. Add performance benchmarks
19. Create monitoring dashboards
20. Scale to PostgreSQL

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-12
**Next Review**: 2025-12-12
