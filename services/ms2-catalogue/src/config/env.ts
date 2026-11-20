// src/config/env.ts
// Loads and validates all environment variables at startup.
// The app crashes immediately if a required variable is missing.

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

export const env = {
  NODE_ENV:          optional('NODE_ENV', 'development'),
  PORT:              parseInt(optional('PORT', '3002'), 10),
  SERVICE_NAME:      optional('SERVICE_NAME', 'ms2-catalogue'),

  DATABASE_URL:      required('DATABASE_URL'),

  MS1_JWT_PUBLIC_KEY: required('MS1_JWT_PUBLIC_KEY').replace(/\\n/g, '\n'),
  JWT_ALGORITHM:     optional('JWT_ALGORITHM', 'RS256') as 'RS256',

  INTERNAL_API_KEY:  required('INTERNAL_API_KEY'),

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
