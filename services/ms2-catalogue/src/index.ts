// src/index.ts
// MS2 — Catalogue & Search microservice entry point

import 'dotenv/config';
import { env } from './config/env';

// ── Validate env before anything else ────────────────────────────────────────
// (env.ts throws if a required variable is missing)

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { router } from './routes';
import { connectRabbitMQ } from './messaging/connection';
import { startConsumers } from './messaging/consumers';
import { startExpirationJob } from './jobs/expirationJob';
import { registerWithConsul } from './services/consulService';
import { loadMs1PublicKey } from './middleware/auth';

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Api-Key'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ── Body parsing and compression ──────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static media files (uploaded images) ─────────────────────────────────────
// Accessible at /media/:filename
app.use('/media', express.static(path.resolve(env.UPLOAD_DIR)));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status:    'healthy',
      service:   env.SERVICE_NAME,
      version:   '1.0.0',
      timestamp: new Date().toISOString(),
      database:  'connected',
    });
  } catch {
    res.status(503).json({
      status:    'unhealthy',
      service:   env.SERVICE_NAME,
      database:  'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use(router);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    // 1. Start the HTTP server first so the service is reachable
    app.listen(env.PORT, () => {
      logger.info(`MS2 Catalogue & Search running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // 2. Load MS1 RSA RS256 public key (from env or dynamic endpoint)
    await loadMs1PublicKey();

    // 3. Connect to PostgreSQL database
    try {
      await prisma.$connect();
      logger.info('Database connected successfully.');
    } catch (dbErr: any) {
      logger.warn(
        `⚠️ Could not connect to PostgreSQL at ${env.DATABASE_URL}. ` +
        `Please ensure PostgreSQL is running (or run 'docker-compose up -d ms2-db') to perform database queries.`
      );
    }

    // 4. Connect to RabbitMQ (non-blocking — retries on failure)
    try {
      await connectRabbitMQ();
      await startConsumers();
    } catch (mqErr) {
      logger.warn('RabbitMQ connection pending...');
    }

    // 5. Start offer expiration cron job
    try {
      startExpirationJob();
    } catch (cronErr) {
      logger.warn('Expiration job failed to initialize');
    }

    // 6. Register with Consul
    await registerWithConsul();

  } catch (err) {
    logger.error('Bootstrap failed', { err });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();

export { app }; // exported for tests
