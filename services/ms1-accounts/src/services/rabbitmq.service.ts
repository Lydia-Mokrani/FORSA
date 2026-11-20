import { RabbitMQClient } from '@forsa/common';
import { config } from '../config/env';
import { prisma } from '../config/prisma';

export const rabbitMQ = new RabbitMQClient(config.rabbitmqUrl, 'ms1-accounts');

export async function initRabbitMQ(): Promise<void> {
  try {
    await rabbitMQ.connect();
    console.log('[MS1-RabbitMQ] Connecté au bus RabbitMQ sur', config.rabbitmqUrl);

    // Écoute de l'événement merchant.suspended (émis par MS4 si seuil de signalements atteint)
    await rabbitMQ.subscribe('merchant.suspended', async (event) => {
      const { shopId, reason } = event.data as { shopId: string; reason?: string };
      console.log(`[MS1-RabbitMQ] Événement merchant.suspended reçu pour la boutique ${shopId}`);

      try {
        const shop = await prisma.shop.update({
          where: { id: shopId },
          data: {
            status: 'SUSPENDED',
            suspensionReason: reason || 'Suspendu suite à des signalements répétés',
          },
          include: { user: true },
        });

        if (shop && shop.userId) {
          await prisma.user.update({
            where: { id: shop.userId },
            data: { status: 'SUSPENDED' },
          });
        }

        console.log(`[MS1-RabbitMQ] Boutique ${shopId} et commerçant passés en statut SUSPENDED`);
      } catch (dbErr) {
        console.error(`[MS1-RabbitMQ] Erreur lors de la suspension de la boutique ${shopId}:`, dbErr);
      }
    });

  } catch (err) {
    console.warn('[MS1-RabbitMQ] Avertissement: RabbitMQ non joignable pour le moment, le service continuera sans asynchronisme jusqu au démarrage de S0.');
  }
}
