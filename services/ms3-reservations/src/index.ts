
import express from 'express';
import cors from 'cors';
import { loggerMiddleware, errorHandler, ConsulRegistry } from '@forsa/common';
import { config } from './config/env';
import { createReservationRouter } from './routes/reservation.routes';
import { AuthService } from './services/auth.service';
import { initRabbitMQ } from './services/rabbitmq.service';

async function startServer() {
  // Retrieve MS1 public key before starting the service
  const publicKey = await AuthService.getPublicKey();

  const app = express();

  // Global middlewares
  app.use(cors());
  app.use(express.json());
  app.use(loggerMiddleware);

  // Health endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'UP',
      service: 'ms3-reservations',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount reservation routes
  app.use('/api/reservations', createReservationRouter(publicKey));

  // Global error handler
  app.use(errorHandler);

  // Consul registration
  const consul = new ConsulRegistry({
    consulUrl: `http://${config.consulHost}:${config.consulPort}`,
    serviceName: 'ms3-reservations',
    serviceId: `ms3-reservations-${config.port}`,
    serviceHost: config.serviceHost,
    servicePort: config.port,
    healthPath: '/health',
    traefikPathPrefixes: ['/api/reservations'],
  });

  const server = app.listen(config.port, async () => {
    console.log(`[MS3-Reservations] Server started on port ${config.port} (Env: ${config.nodeEnv})`);
    await initRabbitMQ();
    await consul.register();
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`[MS3-Reservations] Received ${signal}, shutting down...`);
    await consul.deregister();

    const { rabbitMQ } = await import('./services/rabbitmq.service.js');
    await rabbitMQ.close();

    server.close(() => {
      console.log('[MS3-Reservations] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('[MS3-Reservations] Startup failed:', error);
  process.exit(1);
});
