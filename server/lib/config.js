/**
 * Environment Configuration Manager
 * Validates and exports environment variables with type checking
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Configuration validation error
 */
class ConfigError extends Error {
  constructor(message, missingVars = []) {
    super(message);
    this.name = 'ConfigError';
    this.missingVars = missingVars;
  }
}

/**
 * Get required environment variable
 */
function required(name, description = '') {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new ConfigError(
      `Missing required environment variable: ${name}${description ? ` (${description})` : ''}`,
      [name]
    );
  }
  return value.trim();
}

/**
 * Get optional environment variable with default
 */
function optional(name, defaultValue = '') {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

/**
 * Get boolean environment variable
 */
function bool(name, defaultValue = false) {
  const value = process.env[name];
  if (!value || value.trim() === '') return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase().trim());
}

/**
 * Get integer environment variable
 */
function int(name, defaultValue = 0) {
  const value = process.env[name];
  if (!value || value.trim() === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validate all required configuration at startup
 */
function validateConfig() {
  const errors = [];

  // Check required variables
  const requiredVars = [
    { name: 'ANTHROPIC_API_KEY', desc: 'Required for Claude provider' },
    { name: 'COMPOSIO_API_KEY', desc: 'Required for tool integration' }
  ];

  for (const { name, desc } of requiredVars) {
    if (!process.env[name] || process.env[name].trim() === '') {
      errors.push(`${name}: ${desc}`);
    }
  }

  if (errors.length > 0) {
    const message = [
      'Missing required environment variables:',
      ...errors.map(e => `  - ${e}`),
      '',
      'Please check your .env file or environment configuration.',
      'See .env.example for reference.'
    ].join('\n');
    throw new ConfigError(message, errors.map(e => e.split(':')[0]));
  }
}

/**
 * Application configuration object
 */
const config = {
  // Environment
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDevelopment: optional('NODE_ENV', 'development') === 'development',

  // Server
  port: int('PORT', 3001),
  logLevel: optional('LOG_LEVEL', 'info'),

  // API Keys
  anthropicApiKey: optional('ANTHROPIC_API_KEY', ''),
  composioApiKey: optional('COMPOSIO_API_KEY', ''),

  // CORS
  corsOrigins: optional('CORS_ORIGINS', '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // Supabase
  supabase: {
    url: optional('SUPABASE_URL', ''),
    anonKey: optional('SUPABASE_ANON_KEY', ''),
    serviceKey: optional('SUPABASE_SERVICE_KEY', ''),
    get isConfigured() {
      return Boolean(this.url && this.serviceKey);
    }
  },

  // Docling
  docling: {
    url: optional('DOCLING_URL', 'http://localhost:8765'),
    enabled: bool('ENABLE_DOCLING', false),
    get isConfigured() {
      return Boolean(this.url && this.enabled);
    }
  },

  // Features
  features: {
    browser: bool('ENABLE_BROWSER', true),
    docling: bool('ENABLE_DOCLING', false)
  },

  // Validate and throw if missing required vars
  validate: validateConfig
};

export default config;
export { config, validateConfig, ConfigError, required, optional, bool, int };
