import { app } from './app';
import { config } from './config/env';
import { consul } from './services/consul.service';
import { initRabbitMQ, rabbitMQ } from './services/rabbitmq.service';
import { startTelegramBot, stopTelegramBot, initTelegramBotSubscriptions } from './services/telegram.service';
import { initAuthEventListeners } from './events/auth-events.listener';


const server = app.listen(config.port, async () => {
  console.log(`[MS1-Accounts] Serveur démarré avec succès sur le port ${config.port} (Env: ${config.nodeEnv})`);

  // Initialisation RabbitMQ (bus d'événements)
  await initRabbitMQ();

  // Initialisation des écouteurs d'événements d'authentification et du bot
  await initAuthEventListeners();
  await initTelegramBotSubscriptions();

  // Enregistrement du service auprès de Consul
  await consul.register();

  // Démarrage du bot Telegram officiel FORSA
  await startTelegramBot();
});

// Arrêt gracieux (Graceful Shutdown)
const gracefulShutdown = async (signal: string) => {
  console.log(`[MS1-Accounts] Signal ${signal} reçu. Fermeture propre du service...`);
  stopTelegramBot();
  await consul.deregister();
  await rabbitMQ.close();
  server.close(() => {
    console.log('[MS1-Accounts] Serveur HTTP arrêté.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
