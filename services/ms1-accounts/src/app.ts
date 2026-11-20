import express, { Express } from 'express';
import cors from 'cors';
import { errorHandler, loggerMiddleware } from '@forsa/common';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { shopRouter } from './routes/shop.routes';

export const createApp = (): Express => {
  const app = express();

  // Middlewares fondamentaux
  app.use(cors());
  app.use(express.json());
  app.use(loggerMiddleware);

  // Endpoint Healthcheck pour Consul et Docker
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      service: 'ms1-accounts',
      timestamp: new Date().toISOString(),
    });
  });

  // Montage des routes sous les préfixes Traefik
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/shops', shopRouter);

  // Gestionnaire global d'erreurs uniforme FORSA
  app.use(errorHandler);

  return app;
};

export const app = createApp();
