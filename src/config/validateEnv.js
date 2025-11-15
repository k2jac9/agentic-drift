/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup to prevent
 * runtime failures due to missing or invalid configuration.
 */

export class EnvironmentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

/**
 * Configuration schema with validation rules
 */
const envSchema = {
  // Node environment
  NODE_ENV: {
    required: false,
    default: 'development',
    values: ['development', 'production', 'test'],
    description: 'Node environment mode'
  },

  // Logging
  LOG_LEVEL: {
    required: false,
    default: 'info',
    values: ['error', 'warn', 'info', 'debug', 'trace'],
    description: 'Logging level'
  },

  // AgentDB (optional for testing)
  AGENTDB_PORT: {
    required: false,
    default: '3000',
    validate: val => {
      const port = parseInt(val, 10);
      return port > 0 && port < 65536;
    },
    description: 'AgentDB server port'
  },

  AGENTDB_HOST: {
    required: false,
    default: 'localhost',
    description: 'AgentDB server host'
  },

  // API Keys (optional - only needed for certain features)
  ANTHROPIC_API_KEY: {
    required: false,
    description: 'Anthropic API key for AI features'
  },

  OPENAI_API_KEY: {
    required: false,
    description: 'OpenAI API key for multi-model routing'
  },

  // Hugging Face (optional - for embeddings)
  HUGGINGFACE_API_KEY: {
    required: false,
    description: 'Hugging Face API key for embeddings'
  }
};

/**
 * Validate a single environment variable
 *
 * @param {string} key - Environment variable name
 * @param {Object} config - Validation configuration
 * @returns {Object} Validation result
 */
function validateEnvVar(key, config) {
  const value = process.env[key];
  const result = {
    key,
    value: value || config.default,
    valid: true,
    errors: [],
    warnings: []
  };

  // Check if required
  if (config.required && !value) {
    result.valid = false;
    result.errors.push(`${key} is required but not set`);
    return result;
  }

  // Use default if not set
  if (!value && config.default) {
    result.warnings.push(`${key} not set, using default: ${config.default}`);
    process.env[key] = config.default;
  }

  // Validate against allowed values
  if (value && config.values && !config.values.includes(value)) {
    result.valid = false;
    result.errors.push(`${key}="${value}" is invalid. Allowed values: ${config.values.join(', ')}`);
  }

  // Custom validation function
  if (value && config.validate && !config.validate(value)) {
    result.valid = false;
    result.errors.push(`${key}="${value}" failed custom validation`);
  }

  return result;
}

/**
 * Validate all environment variables
 *
 * @param {Object} options - Validation options
 * @returns {Object} Validation results
 */
export function validateEnvironment(options = {}) {
  const {
    strict = false, // Throw on warnings in production
    silent = false // Don't log validation results
  } = options;

  const results = {
    valid: true,
    errors: [],
    warnings: [],
    variables: {}
  };

  // Validate each variable
  for (const [key, config] of Object.entries(envSchema)) {
    const result = validateEnvVar(key, config);
    results.variables[key] = result;

    if (!result.valid) {
      results.valid = false;
      results.errors.push(...result.errors);
    }

    results.warnings.push(...result.warnings);
  }

  // Log results if not silent
  if (!silent) {
    if (results.errors.length > 0) {
      console.error('\n❌ Environment Validation Failed:');
      results.errors.forEach(err => console.error(`  • ${err}`));
    }

    if (results.warnings.length > 0 && !silent) {
      console.warn('\n⚠️  Environment Warnings:');
      results.warnings.forEach(warn => console.warn(`  • ${warn}`));
    }

    if (results.valid) {
      console.log('\n✅ Environment validation passed');
      console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`   LOG_LEVEL: ${process.env.LOG_LEVEL}`);
    }
  }

  // Throw if invalid
  if (!results.valid) {
    throw new EnvironmentValidationError(`Environment validation failed:\n${results.errors.join('\n')}`);
  }

  // Throw on warnings in strict mode (production)
  if (strict && process.env.NODE_ENV === 'production' && results.warnings.length > 0) {
    throw new EnvironmentValidationError(
      `Environment validation warnings in production (strict mode):\n${results.warnings.join('\n')}`
    );
  }

  return results;
}

/**
 * Get environment variable with validation
 *
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {string} Environment variable value
 */
export function getEnv(key, defaultValue = undefined) {
  const value = process.env[key];

  if (!value && defaultValue === undefined && envSchema[key]?.required) {
    throw new EnvironmentValidationError(`Required environment variable ${key} is not set`);
  }

  return value || defaultValue;
}

/**
 * Check if running in production
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in test
 */
export function isTest() {
  return process.env.NODE_ENV === 'test';
}
