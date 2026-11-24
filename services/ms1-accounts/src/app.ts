import express, { Express } from 'express';
import cors from 'cors';
import { errorHandler, loggerMiddleware } from '@forsa/common';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { shopRouter } from './routes/shop.routes';
import { config } from './config/env';
import { prisma } from './config/prisma';
import { eventBus } from './services/event-bus';
import { consul } from './services/consul.service';

export const createApp = (): Express => {
  const app = express();

  // Middlewares fondamentaux
  app.use(cors());
  app.use(express.json());
  app.use(loggerMiddleware);

  // Identification d'instance pour Traefik / Load Balancing (WAMS Multi-Instances)
  app.use((_req, res, next) => {
    res.setHeader('X-Instance-Id', config.instanceId);
    next();
  });

  // Endpoint Healthcheck pour Consul et Docker (WAMS §3)
  app.get('/health', async (_req, res) => {
    // 1. Vérification DB (SELECT 1 avec timeout 2s)
    let dbStatus: 'up' | 'down' = 'down';
    try {
      const dbCheck = prisma.$queryRawUnsafe('SELECT 1');
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB_TIMEOUT')), 2000)
      );
      await Promise.race([dbCheck, timeout]);
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    // 2. Vérification Broker
    let brokerStatus: 'up' | 'down' | 'disabled' = 'disabled';
    const driver = process.env.EVENT_BUS_DRIVER?.toLowerCase();
    const isMemory = driver === 'memory' || process.env.RABBITMQ_ENABLED === 'false';
    if (isMemory) {
      brokerStatus = 'disabled';
    } else {
      const isUp = typeof (eventBus as any).isBrokerUp === 'function' ? (eventBus as any).isBrokerUp() : false;
      brokerStatus = isUp ? 'up' : 'down';
    }

    // 3. Statut Consul
    const registered = Boolean(consul.registered);

    // 4. Décision de statut et code HTTP
    if (dbStatus === 'down') {
      return res.status(503).json({
        status: 'DOWN',
        service: 'ms1-accounts',
        instanceId: config.instanceId,
        timestamp: new Date().toISOString(),
        broker: brokerStatus,
        db: dbStatus,
        registered,
      });
    }

    const overallStatus = brokerStatus === 'down' ? 'DEGRADED' : 'UP';
    return res.status(200).json({
      status: overallStatus,
      service: 'ms1-accounts',
      instanceId: config.instanceId,
      timestamp: new Date().toISOString(),
      broker: brokerStatus,
      db: dbStatus,
      registered,
    });
  });

  // Montage des routes sous les préfixes Traefik et direct
  app.use('/api/auth', authRouter);
  app.use('/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/users', userRouter);
  app.use('/api/shops', shopRouter);
  app.use('/shops', shopRouter);

  // Gestionnaire global d'erreurs uniforme FORSA
  app.use(errorHandler);

  return app;
};

export const app = createApp();
