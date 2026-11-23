// src/config/env.ts
// Loads and validates all environment variables at startup.
// Fails fast listing ALL missing variables at once in production (Item O).

import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const missingErrors: string[] = [];

function checkRequired(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    missingErrors.push(`Missing required environment variable: ${key}`);
    return '';
  }
  return value.trim();
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// Support MS1_JWT_PUBLIC_KEY and accept JWT_PUBLIC_KEY as deprecated alias (Item O.5)
const rawJwtPublicKey = (process.env.MS1_JWT_PUBLIC_KEY || process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
const ms1PublicKeyUrl = process.env.MS1_PUBLIC_KEY_URL || (isProd ? '' : 'http://localhost:3001/api/auth/public-key');

if (isProd) {
  checkRequired('DATABASE_URL');
  checkRequired('SERVICE_ADDRESS');
  checkRequired('RABBITMQ_URL');
  checkRequired('CONSUL_HOST');
  checkRequired('CORS_ORIGIN');

  const internalKey = checkRequired('INTERNAL_API_KEY');
  if (internalKey && internalKey.length < 32) {
    missingErrors.push('INTERNAL_API_KEY must be at least 32 characters long in production.');
  }

  const mediaBaseUrl = checkRequired('MEDIA_BASE_URL');
  if (mediaBaseUrl && mediaBaseUrl.toLowerCase().includes('localhost')) {
    missingErrors.push('MEDIA_BASE_URL must not contain "localhost" in production.');
  }

  if (!rawJwtPublicKey && (!ms1PublicKeyUrl || ms1PublicKeyUrl.trim() === '')) {
    missingErrors.push('Either MS1_JWT_PUBLIC_KEY or MS1_PUBLIC_KEY_URL must be configured in production.');
  }
  if (ms1PublicKeyUrl && ms1PublicKeyUrl.toLowerCase().includes('localhost')) {
    missingErrors.push('MS1_PUBLIC_KEY_URL must not point to localhost in production (use Traefik gateway http://<S0>/api/auth/public-key).');
  }

  if (missingErrors.length > 0) {
    throw new Error(
      `\n❌ Production Environment Configuration Incomplete:\n- ${missingErrors.join('\n- ')}\n`
    );
  }
} else {
  // In development and test, ensure INTERNAL_API_KEY is present
  if (!process.env.INTERNAL_API_KEY && process.env.NODE_ENV !== 'test') {
    missingErrors.push('Missing required environment variable: INTERNAL_API_KEY');
  }
  if (missingErrors.length > 0) {
    throw new Error(`\n❌ Environment Configuration Incomplete:\n- ${missingErrors.join('\n- ')}\n`);
  }
}

export const env = {
  NODE_ENV:          optional('NODE_ENV', 'development'),
  PORT:              parseInt(optional('PORT', '3002'), 10),
  HOST:              optional('HOST', '0.0.0.0'),
  SERVICE_NAME:      optional('SERVICE_NAME', 'ms2-catalogue'),

  DATABASE_URL:      process.env.DATABASE_URL || '',

  // RS256 Public Key from MS1
  JWT_PUBLIC_KEY:     rawJwtPublicKey,
  MS1_JWT_PUBLIC_KEY: rawJwtPublicKey,
  JWT_ALGORITHM:     'RS256' as const,
  MS1_PUBLIC_KEY_URL: ms1PublicKeyUrl,

  // Shared secret for internal service-to-service calls (MS3 -> MS2). Required with no fallback.
  INTERNAL_API_KEY:  process.env.INTERNAL_API_KEY || (process.env.NODE_ENV === 'test' ? 'forsa-internal-secret-token-2026' : ''),

  RABBITMQ_URL:      optional('RABBITMQ_URL', 'amqp://forsa_user:forsa_password@localhost:5672'),
  RABBITMQ_EXCHANGE: optional('RABBITMQ_EXCHANGE', 'forsa.events'),

  CONSUL_HOST:       optional('CONSUL_HOST', 'localhost'),
  CONSUL_PORT:       parseInt(optional('CONSUL_PORT', '8500'), 10),

  CORS_ORIGIN:       process.env.CORS_ORIGIN || (isProd ? '' : '*'),

  UPLOAD_DIR:        optional('UPLOAD_DIR', './uploads'),
  MAX_FILE_SIZE_MB:  parseInt(optional('MAX_FILE_SIZE_MB', '5'), 10),
  MEDIA_BASE_URL:    optional('MEDIA_BASE_URL', 'http://localhost:3002/media'),

  LOG_LEVEL:         optional('LOG_LEVEL', 'info'),

  RATE_LIMIT_WINDOW_MS:    parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
} as const;
