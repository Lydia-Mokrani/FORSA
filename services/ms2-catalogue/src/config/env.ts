// src/config/env.ts
// Loads and validates all environment variables at startup.

import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// Support both JWT_PUBLIC_KEY and MS1_JWT_PUBLIC_KEY
const rawJwtPublicKey = (process.env.JWT_PUBLIC_KEY || process.env.MS1_JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');

export const env = {
  NODE_ENV:          optional('NODE_ENV', 'development'),
  PORT:              parseInt(optional('PORT', '3002'), 10),
  SERVICE_NAME:      optional('SERVICE_NAME', 'ms2-catalogue'),

  DATABASE_URL:      required('DATABASE_URL'),

  // RS256 Public Key from MS1
  JWT_PUBLIC_KEY:     rawJwtPublicKey,
  MS1_JWT_PUBLIC_KEY: rawJwtPublicKey,
  JWT_ALGORITHM:     'RS256' as const,
  MS1_PUBLIC_KEY_URL: optional('MS1_PUBLIC_KEY_URL', 'http://localhost:3001/api/auth/public-key'),

  // Shared secret for internal service-to-service calls (MS3 -> MS2)
  INTERNAL_API_KEY:  optional('INTERNAL_API_KEY', 'forsa-internal-secret-token-2026'),

  RABBITMQ_URL:      optional('RABBITMQ_URL', 'amqp://localhost'),
  RABBITMQ_EXCHANGE: optional('RABBITMQ_EXCHANGE', 'forsa.events'),

  CONSUL_HOST:       optional('CONSUL_HOST', 'localhost'),
  CONSUL_PORT:       parseInt(optional('CONSUL_PORT', '8500'), 10),

  UPLOAD_DIR:        optional('UPLOAD_DIR', './uploads'),
  MAX_FILE_SIZE_MB:  parseInt(optional('MAX_FILE_SIZE_MB', '5'), 10),
  MEDIA_BASE_URL:    optional('MEDIA_BASE_URL', 'http://localhost:3002/media'),

  LOG_LEVEL:         optional('LOG_LEVEL', 'info'),

  RATE_LIMIT_WINDOW_MS:    parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
} as const;
