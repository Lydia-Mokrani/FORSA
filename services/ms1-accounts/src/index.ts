import express from 'express';
import cors from 'cors';
import { errorHandler, loggerMiddleware, ConsulRegistry } from '@forsa/common';
import { config } from './config/env';
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { shopRouter } from './routes/shop.routes';
import { initRabbitMQ, rabbitMQ } from './services/rabbitmq.service';

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

// Enregistrement Consul pour la découverte dynamique Traefik
const consul = new ConsulRegistry({
  consulUrl: `http://${config.consulHost}:${config.consulPort}`,
  serviceName: 'ms1-accounts',
  serviceId: `ms1-accounts-${config.port}`,
  serviceHost: config.serviceHost,
  servicePort: config.port,
  healthPath: '/health',
  traefikPathPrefixes: ['/api/auth', '/api/users', '/api/shops'],
});

const server = app.listen(config.port, async () => {
  console.log(`[MS1-Accounts] Serveur démarré avec succès sur le port ${config.port} (Env: ${config.nodeEnv})`);

  // Initialisation RabbitMQ (bus d'événements)
  await initRabbitMQ();

  // Enregistrement du service auprès de Consul
  await consul.register();
});

// Arrêt gracieux (Graceful Shutdown)
const gracefulShutdown = async (signal: string) => {
  console.log(`[MS1-Accounts] Signal ${signal} reçu. Fermeture propre du service...`);
  await consul.deregister();
  await rabbitMQ.close();
  server.close(() => {
    console.log('[MS1-Accounts] Serveur HTTP arrêté.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
