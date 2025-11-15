# Multi-stage Dockerfile for Agentic-Drift
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Run linter and tests
RUN npm run lint || true
RUN npm test

# Stage 2: Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code and built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/index.js ./

# Create necessary directories with correct permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R nodejs:nodejs /app/data /app/logs

# Switch to non-root user
USER nodejs

# Expose port (if needed for health checks)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production \
    LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["node", "index.js"]
