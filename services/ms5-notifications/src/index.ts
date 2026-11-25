import express, { Request, Response } from 'express';
import { ConsulRegistry } from '@forsa/common';
import { config } from './config/env';
import { eventBus } from './services/event-bus';
import {
  startTelegramBot,
  stopTelegramBot,
  initTelegramBotSubscriptions,
} from './telegram-bot/telegram.service';
import { initEmailSubscriptions } from './email-sender/email.consumer';

export const app = express();
app.use(express.json());

// Instance Consul dédiée à MS5 (Worker interne : traefikPathPrefixes vide, pas de routes publiques)
export const consul = new ConsulRegistry({
  consulUrl: `http://${config.consulHost}:${config.consulPort}`,
  serviceName: 'ms5-notifications',
  serviceId: `ms5-notifications-${config.serviceHost.replace(/[^a-zA-Z0-9_-]/g, '-')}-${config.servicePort}`,
  serviceHost: config.serviceHost,
  servicePort: config.servicePort,
  healthPath: '/health',
  traefikPathPrefixes: [],
});

// Endpoint /health conforme au standard WAMS
app.get('/health', async (_req: Request, res: Response) => {
  const brokerUp = typeof eventBus.isBrokerUp === 'function' ? eventBus.isBrokerUp() : true;
  const brokerStatus: 'up' | 'down' = brokerUp ? 'up' : 'down';
  const overallStatus = brokerStatus === 'up' ? 'UP' : 'DEGRADED';

  res.status(200).json({
    status: overallStatus,
    service: 'ms5-notifications',
    instanceId: config.instanceId,
    timestamp: new Date().toISOString(),
    broker: brokerStatus,
    registered: consul.registered,
  });
});

let server: any = null;

export async function startServer(): Promise<any> {
  return new Promise((resolve) => {
    server = app.listen(config.port, async () => {
      console.log(`[MS5-Notifications] Serveur démarré sur le port ${config.port} (Instance: ${config.instanceId})`);

      // 1. Connexion au bus RabbitMQ
      try {
        await eventBus.connect();
        await initTelegramBotSubscriptions();
        await initEmailSubscriptions();
      } catch (err: any) {
        console.error('[MS5-Notifications] Erreur connexion EventBus:', err.message);
      }

      // 2. Démarrage du bot Telegram (Singleton)
      try {
        await startTelegramBot();
      } catch (err: any) {
        console.error('[MS5-Notifications] Erreur démarrage TelegramBot:', err.message);
      }

      // 3. Enregistrement auprès de Consul
      try {
        await consul.register();
      } catch (err: any) {
        console.warn('[MS5-Notifications] Avertissement enregistrement Consul:', err.message);
      }

      resolve(server);
    });
  });
}

export async function stopServer(): Promise<void> {
  stopTelegramBot();
  await consul.deregister().catch(() => {});
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server = null;
  }
}

// Démarrage automatique si exécuté directement
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[MS5-Notifications] Échec fatal au démarrage:', err);
    process.exit(1);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`[MS5-Notifications] Signal ${signal} reçu, arrêt gracieux...`);
    await stopServer();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
