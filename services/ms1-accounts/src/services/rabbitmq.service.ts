import { eventBus } from './event-bus';
import { prisma } from '../config/prisma';

export const rabbitMQ = eventBus;

export async function initRabbitMQ(): Promise<void> {
  try {
    await rabbitMQ.connect();
    console.log('[MS1-RabbitMQ] Bus initialisé');

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

        // Émission de shop.status_changed pour MS2 (statut ACTIVE attendu par MS2)
        await rabbitMQ.publish('shop.status_changed', {
          shopId: shop.id,
          merchantId: shop.userId,
          userId: shop.userId,
          status: 'ACTIVE',
          shopStatus: 'APPROVED',
        }).catch((err) => console.warn('[MS1-RabbitMQ] Publish shop.status_changed warning:', err.message));
      } catch (dbErr) {
        console.error(`[MS1-RabbitMQ] Erreur lors de l'approbation de la boutique:`, dbErr);
      }
    });

    // Écoute de l'événement merchant.reactivated (émis par MS4 ou un admin)
    await rabbitMQ.subscribe('merchant.reactivated', async (event) => {
      const payload = (event.payload || event.data) as {
        shopId?: string;
        merchantId?: string;
        userId?: string;
      };
      const shopId = payload.shopId;
      const merchantId = payload.merchantId || payload.userId;
      console.log(`[MS1-RabbitMQ] Événement merchant.reactivated reçu (shopId: ${shopId}, merchantId: ${merchantId})`);

      try {
        const whereClause = shopId ? { id: shopId } : (merchantId ? { userId: merchantId } : null);
        if (!whereClause) return;

        const shop = await prisma.shop.update({
          where: whereClause,
          data: { status: 'APPROVED', suspensionReason: null },
          include: { user: true },
        });

        if (shop && shop.userId) {
          await prisma.user.update({
            where: { id: shop.userId },
            data: { status: 'ACTIVE' },
          });
        }

        console.log(`[MS1-RabbitMQ] Boutique ${shop.id} réactivée (APPROVED)`);

        await rabbitMQ.publish('shop.status_changed', {
          shopId: shop.id,
          merchantId: shop.userId,
          userId: shop.userId,
          status: 'ACTIVE',
          shopStatus: 'APPROVED',
        }).catch((err) => console.warn('[MS1-RabbitMQ] Publish shop.status_changed warning:', err.message));
      } catch (dbErr) {
        console.error(`[MS1-RabbitMQ] Erreur lors de la réactivation de la boutique:`, dbErr);
      }
    });

    // Écoute de l'événement merchant.rejected (émis par MS4 lors du rejet des pièces)
    await rabbitMQ.subscribe('merchant.rejected', async (event) => {
      const payload = (event.payload || event.data) as {
        shopId?: string;
        merchantId?: string;
        userId?: string;
        reason?: string;
      };
      const shopId = payload.shopId;
      const merchantId = payload.merchantId || payload.userId;
      console.log(`[MS1-RabbitMQ] Événement merchant.rejected reçu (shopId: ${shopId}, merchantId: ${merchantId})`);

      try {
        const whereClause = shopId ? { id: shopId } : (merchantId ? { userId: merchantId } : null);
        if (!whereClause) return;

        const shop = await prisma.shop.update({
          where: whereClause,
          data: {
            status: 'REJECTED',
            suspensionReason: payload.reason || 'Dossier rejeté par la modération',
          },
        });

        console.log(`[MS1-RabbitMQ] Boutique ${shop.id} passée en statut REJECTED`);

        await rabbitMQ.publish('shop.status_changed', {
          shopId: shop.id,
          status: 'REJECTED',
          reason: payload.reason,
        }).catch((err) => console.warn('[MS1-RabbitMQ] Publish shop.status_changed warning:', err.message));
      } catch (dbErr) {
        console.error(`[MS1-RabbitMQ] Erreur lors du rejet de la boutique:`, dbErr);
      }
    });

    // Écoute de reservation.picked_up (émis par MS3 lors du retrait physique validé)
    await rabbitMQ.subscribe('reservation.picked_up', async (event) => {
      const payload = (event.payload || event.data) as {
        shopId?: string;
        reservationId?: string;
        quantity?: number;
      };
      console.log(`[MS1-RabbitMQ] Confirmation retrait physique reservation.picked_up reçue pour boutique: ${payload.shopId}`);
    });

    // Écoute de shop.rating_updated (émis par MS4 après un avis client)
    await rabbitMQ.subscribe('shop.rating_updated', async (event) => {
      const payload = (event.payload || event.data) as {
        shopId?: string;
        averageRating?: number;
        salesCount?: number;
        totalReviews?: number;
      };
      console.log(`[MS1-RabbitMQ] Note mise à jour shop.rating_updated reçue pour boutique: ${payload.shopId} (note: ${payload.averageRating})`);
    });

  } catch (err) {
    console.warn('[MS1-RabbitMQ] Avertissement: RabbitMQ non joignable pour le moment, le service continuera sans asynchronisme jusqu au démarrage de S0.');
  }
}
