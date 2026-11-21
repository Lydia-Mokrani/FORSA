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
      const payload = (event.payload || event.data) as {
        shopId?: string;
        merchantId?: string;
        userId?: string;
        reason?: string;
      };
      const shopId = payload.shopId;
      const merchantId = payload.merchantId || payload.userId;
      console.log(`[MS1-RabbitMQ] Événement merchant.suspended reçu (shopId: ${shopId}, merchantId: ${merchantId})`);

      try {
        const whereClause = shopId ? { id: shopId } : (merchantId ? { userId: merchantId } : null);
        if (!whereClause) return;

        const shop = await prisma.shop.update({
          where: whereClause,
          data: {
            status: 'SUSPENDED',
            suspensionReason: payload.reason || 'Suspendu suite à des signalements répétés',
          },
          include: { user: true },
        });

        if (shop && shop.userId) {
          await prisma.user.update({
            where: { id: shop.userId },
            data: { status: 'SUSPENDED' },
          });
        }

        console.log(`[MS1-RabbitMQ] Boutique ${shop.id} et commerçant passés en statut SUSPENDED`);

        // Émission de shop.status_changed pour MS2
        await rabbitMQ.publish('shop.status_changed', {
          shopId: shop.id,
          merchantId: shop.userId,
          userId: shop.userId,
          status: 'SUSPENDED',
          reason: shop.suspensionReason || undefined,
        }).catch((err) => console.warn('[MS1-RabbitMQ] Publish shop.status_changed warning:', err.message));
      } catch (dbErr) {
        console.error(`[MS1-RabbitMQ] Erreur lors de la suspension de la boutique:`, dbErr);
      }
    });

    // Écoute de l'événement merchant.approved (émis par MS4 lors de la validation des pièces)
    await rabbitMQ.subscribe('merchant.approved', async (event) => {
      const payload = (event.payload || event.data) as {
        shopId?: string;
        merchantId?: string;
        userId?: string;
      };
      const shopId = payload.shopId;
      const merchantId = payload.merchantId || payload.userId;
      console.log(`[MS1-RabbitMQ] Événement merchant.approved reçu (shopId: ${shopId}, merchantId: ${merchantId})`);

      try {
        const whereClause = shopId ? { id: shopId } : (merchantId ? { userId: merchantId } : null);
        if (!whereClause) return;

        const shop = await prisma.shop.update({
          where: whereClause,
          data: {
            status: 'APPROVED',
          },
          include: { user: true },
        });

        if (shop && shop.userId) {
          await prisma.user.update({
            where: { id: shop.userId },
            data: { status: 'ACTIVE' },
          });
        }

        console.log(`[MS1-RabbitMQ] Boutique ${shop.id} et commerçant passés en statut APPROVED`);

        // Émission de shop.status_changed pour MS2
        await rabbitMQ.publish('shop.status_changed', {
          shopId: shop.id,
          merchantId: shop.userId,
          userId: shop.userId,
          status: 'APPROVED',
        }).catch((err) => console.warn('[MS1-RabbitMQ] Publish shop.status_changed warning:', err.message));
      } catch (dbErr) {
        console.error(`[MS1-RabbitMQ] Erreur lors de l'approbation de la boutique:`, dbErr);
      }
    });

  } catch (err) {
    console.warn('[MS1-RabbitMQ] Avertissement: RabbitMQ non joignable pour le moment, le service continuera sans asynchronisme jusqu au démarrage de S0.');
  }
}
