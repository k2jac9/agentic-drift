# Recommended Configuration Files

This document contains all recommended configuration files for the agentic-drift project.

---

## 1. ESLint Configuration

**File**: `.eslintrc.json`

```json
{
  "env": {
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["vitest"],
  "rules": {
    "no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "no-console": ["warn", {
      "allow": ["warn", "error", "info"]
    }],
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "no-throw-literal": "error",
    "prefer-promise-reject-errors": "error",
    "no-return-await": "error",
    "require-await": "error",
    "no-async-promise-executor": "error"
  },
  "overrides": [
    {
      "files": ["tests/**/*.js"],
      "env": {
        "vitest/globals": true
      }
    }
  ]
}
```

---

## 2. Prettier Configuration

**File**: `.prettierrc.json`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "proseWrap": "preserve"
}
```

**File**: `.prettierignore`

```
# Dependencies
node_modules/
package-lock.json
pnpm-lock.yaml
yarn.lock

# Build outputs
dist/
build/
coverage/
.cache/

# Generated files
*.min.js
*.bundle.js

# Logs
*.log

# OS files
.DS_Store
Thumbs.db

# Documentation that shouldn't be formatted
docs/API.md

# Config files with specific formatting
*.md
```

---

## 3. EditorConfig

**File**: `.editorconfig`

```ini
# EditorConfig is awesome: https://EditorConfig.org

root = true

# Default settings for all files
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

# JavaScript/TypeScript files
[*.{js,ts,jsx,tsx}]
indent_style = space
indent_size = 2

# JSON files
[*.json]
indent_style = space
indent_size = 2

# YAML files
[*.{yml,yaml}]
indent_style = space
indent_size = 2

# Markdown files
[*.md]
trim_trailing_whitespace = false
max_line_length = off

# Package files
[package.json]
indent_style = space
indent_size = 2

# Shell scripts
[*.sh]
end_of_line = lf
```

---

## 4. TypeScript Configuration

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "node",

    // Type Checking
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Module Resolution
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,

    // Emit
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false,

    // Skip Lib Check
    "skipLibCheck": true,

    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "src/**/*",
    "tests/**/*",
    "index.js"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build",
    "coverage",
    "examples"
  ]
}
```

---

## 5. Git Hooks (Husky)

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged
npx lint-staged

# Optional: Run type checking
npm run typecheck
```

**File**: `.husky/pre-push`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run tests before push
npm test
```

**Add to package.json**:

```json
{
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

---

## 6. GitHub Actions - CI Workflow

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [ main, develop, claude/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

      - name: Type check
        run: npm run typecheck

  test:
    name: Test on Node.js ${{ matrix.node-version }}
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        if: matrix.node-version == '22.x'
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/
          retention-days: 7
```

---

## 7. GitHub Actions - Security Workflow

**File**: `.github/workflows/security.yml`

```yaml
name: Security

on:
  schedule:
    # Run daily at 9am UTC
    - cron: '0 9 * * *'
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  audit:
    name: npm audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --production

      - name: Run npm audit (all)
        run: npm audit
        continue-on-error: true

  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Autobuild
        uses: github/codeql-action/autobuild@v2

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Dependency Review
        uses: actions/dependency-review-action@v3
        with:
          fail-on-severity: moderate
```

---

## 8. Docker Configuration

**File**: `Dockerfile`

```dockerfile
# Stage 1: Base
FROM node:22.21.1-alpine AS base

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

WORKDIR /app

# Stage 2: Dependencies
FROM base AS dependencies

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Stage 3: Build (if needed)
FROM dependencies AS build

# Copy source code
COPY . .

# Run build (if you add a build step)
# RUN npm run build

# Stage 4: Production
FROM node:22.21.1-alpine AS production

# Install runtime dependencies for native modules
RUN apk add --no-cache \
    libstdc++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY --from=build /app/src ./src
COPY --from=build /app/index.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Environment
ENV NODE_ENV=production

# Start application
CMD ["node", "index.js"]
```

**File**: `.dockerignore`

```
# Dependencies
node_modules
npm-debug.log
package-lock.json
pnpm-lock.yaml
yarn.lock

# Build outputs
dist
build
coverage
.cache

# Git
.git
.gitignore
.gitattributes

# CI/CD
.github
.gitlab-ci.yml

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Documentation
*.md
!README.md
docs

# Tests
tests
examples
*.test.js
*.spec.js

# Claude Flow generated
.claude
.swarm
.hive-mind
.claude-flow
memory
coordination
```

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: agentic-drift-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AGENTDB_HOST=agentdb
      - AGENTDB_PORT=3000
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - drift-data:/app/data
    networks:
      - agentic-network
    depends_on:
      - agentdb
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s

  agentdb:
    image: agentdb:latest
    container_name: agentic-drift-db
    restart: unless-stopped
    ports:
      - "3001:3000"
    volumes:
      - agentdb-data:/data
    networks:
      - agentic-network
    environment:
      - NODE_ENV=production

networks:
  agentic-network:
    driver: bridge

volumes:
  drift-data:
    driver: local
  agentdb-data:
    driver: local
```

---

## 9. Enhanced package.json Scripts

**Add to existing `package.json`**:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "dev:debug": "node --inspect --watch index.js",

    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest watch",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",

    "lint": "eslint src tests",
    "lint:fix": "eslint src tests --fix",

    "format": "prettier --write \"src/**/*.js\" \"tests/**/*.js\" \"*.{js,json,md}\"",
    "format:check": "prettier --check \"src/**/*.js\" \"tests/**/*.js\" \"*.{js,json,md}\"",

    "typecheck": "tsc --noEmit",

    "validate": "npm run lint && npm run format:check && npm run typecheck && npm run test",

    "clean": "rm -rf coverage dist build",
    "prebuild": "npm run clean",
    "build": "echo 'Build step not configured - add build tool'",

    "prepublishOnly": "npm run validate && npm run build",

    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "audit:production": "npm audit --production",

    "docs:generate": "jsdoc2md src/**/*.js > docs/API.md",
    "docs:serve": "npx http-server docs",

    "docker:build": "docker build -t agentic-drift:latest .",
    "docker:run": "docker-compose up -d",
    "docker:stop": "docker-compose down",
    "docker:logs": "docker-compose logs -f",

    "prepare": "husky install"
  }
}
```

---

## 10. Environment Validation

**File**: `src/config/env.js`

```javascript
import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // API Keys
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  OPENAI_API_KEY: z.string().optional(),

  // AgentDB Configuration
  AGENTDB_PORT: z.coerce.number().int().positive().default(3000),
  AGENTDB_HOST: z.string().default('localhost'),

  // Agent Configuration
  AGENT_TYPE: z
    .enum(['coder', 'reviewer', 'tester', 'researcher', 'planner'])
    .default('coder'),
  AGENT_OPTIMIZE: z.coerce.boolean().default(true),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Validated environment variables
 * @type {z.infer<typeof envSchema>}
 */
export const env = envSchema.parse(process.env);

/**
 * Check if running in production
 */
export const isProd = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDev = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';
```

---

## 11. Structured Logging

**File**: `src/core/logger.js`

```javascript
import pino from 'pino';
import { env, isProd } from '../config/env.js';

/**
 * Logger configuration
 */
const loggerConfig = {
  level: env.LOG_LEVEL || 'info',
  ...(isProd
    ? {
        // Production: JSON output
        formatters: {
          level: (label) => ({ level: label }),
        },
      }
    : {
        // Development: Pretty output
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      }),
};

/**
 * Application logger
 */
export const logger = pino(loggerConfig);

/**
 * Create child logger with context
 * @param {Object} context - Context object
 * @returns {pino.Logger} Child logger
 */
export function createLogger(context) {
  return logger.child(context);
}

/**
 * Log execution time of async function
 * @param {string} operation - Operation name
 * @param {Function} fn - Async function to measure
 * @returns {Promise<any>} Function result
 */
export async function logExecutionTime(operation, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.info({ operation, duration }, 'Operation completed');
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error({ operation, duration, error }, 'Operation failed');
    throw error;
  }
}
```

---

## Installation Commands

```bash
# 1. Code quality tools
npm install --save-dev \
  eslint \
  prettier \
  eslint-config-prettier \
  eslint-plugin-vitest \
  husky \
  lint-staged

# 2. Type checking
npm install --save-dev \
  typescript \
  @types/node

# 3. Validation and logging
npm install zod pino pino-pretty

# 4. Documentation
npm install --save-dev \
  jsdoc \
  jsdoc-to-markdown

# 5. Initialize Husky
npx husky init

# 6. Create configuration files
# Copy the configurations above into their respective files
```

---

## Next Steps

1. Create all configuration files listed above
2. Run `npm install` to install new dependencies
3. Run `npm run validate` to check everything works
4. Commit the changes
5. Push to trigger CI/CD pipeline

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-12
