// src/jobs/expirationJob.ts
// Runs every minute to expire offers whose deadlines have passed.
// Also hides same-day bakery/prepared-food items at end of day.
// All time logic uses UTC (server time).

import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { publishEvent } from '../messaging/publisher';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { OfferStatus } from '@prisma/client';

export function startExpirationJob(): void {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // ── Expire offers past their deadline ──────────────────────────────────
      const expired = await prisma.offer.updateMany({
        where: {
          status:     { in: [OfferStatus.ACTIVE, OfferStatus.PENDING_VERIFICATION] },
          expires_at: { lte: now },
        },
        data: {
          status:     OfferStatus.EXPIRED,
          expired_at: now,
        },
      });

      if (expired.count > 0) {
        logger.info(`Expired ${expired.count} offers.`);

        // Fetch the IDs to publish events
        const justExpired = await prisma.offer.findMany({
          where:  { status: OfferStatus.EXPIRED, expired_at: { gte: new Date(now.getTime() - 60000) } },
          select: { id: true, merchant_id: true },
        });

        for (const o of justExpired) {
          await publishEvent({
            eventId:    uuidv4(),
            type:       'offer.expired',
            occurredAt: now.toISOString(),
            payload:    { offerId: o.id, merchantId: o.merchant_id },
          });
        }
      }

      // ── Hide same-day bakery items at end of day (23:00 UTC) ──────────────
      const hour = now.getUTCHours();
      if (hour >= 23) {
        const bakeryCat = await prisma.category.findUnique({ where: { slug: 'bakeries' } });
        const restaurantCat = await prisma.category.findUnique({ where: { slug: 'restaurants' } });

        const categoryIds = [bakeryCat?.id, restaurantCat?.id].filter(Boolean) as string[];

        if (categoryIds.length > 0) {
          // Hide offers that expire TODAY (same calendar day) for bakeries/restaurants
          const startOfDay = new Date(now);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(now);
          endOfDay.setUTCHours(23, 59, 59, 999);

          await prisma.offer.updateMany({
            where: {
              status:      OfferStatus.ACTIVE,
              category_id: { in: categoryIds },
              expires_at:  { gte: startOfDay, lte: endOfDay },
            },
            data: { status: OfferStatus.EXPIRED, expired_at: now },
          });
        }
      }
    } catch (err) {
      logger.error('Expiration job error', { err });
    }
  });

  logger.info('Offer expiration cron job started (every minute).');
}
