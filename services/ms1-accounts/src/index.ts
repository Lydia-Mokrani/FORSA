import { app } from './app';
import { ConsulRegistry } from '@forsa/common';
import { config } from './config/env';
import { initRabbitMQ, rabbitMQ } from './services/rabbitmq.service';

// Enregistrement Consul pour la découverte dynamique Traefik
const consul = new ConsulRegistry({
  consulUrl: `http://${config.consulHost}:${config.consulPort}`,
  serviceName: 'ms1-accounts',
  serviceId: `ms1-accounts-${config.serviceHost.replace(/[^a-zA-Z0-9_-]/g, '-')}-${config.port}`,
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
