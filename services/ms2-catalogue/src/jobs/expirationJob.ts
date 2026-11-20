// src/jobs/expirationJob.ts
// Runs every minute to expire offers whose pickup deadlines have passed.
// Also expires same-day offers at end of day in Africa/Algiers timezone (UTC+1).

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

      // ── 1. Expire offers past their pickup deadline ────────────────────────
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
        logger.info(`Expired ${expired.count} offers past pickup deadline.`);

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

      // ── 2. Expire same-day offers at end of day (Africa/Algiers timezone) ──
      // Algeria is UTC+1 all year. End of day = 23:00 onwards in Africa/Algiers.
      const algeriaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' }));
      const algeriaHour = algeriaNow.getHours();

      if (algeriaHour >= 23) {
        // Find active offers marked with same_day_expiry
        const sameDayOffers = await prisma.offer.findMany({
          where: {
            status:          OfferStatus.ACTIVE,
            same_day_expiry: true,
          },
          select: { id: true, merchant_id: true, created_at: true },
        });

        const toExpireIds: string[] = [];
        for (const o of sameDayOffers) {
          const offerAlgeriaDate = new Date(o.created_at.toLocaleString('en-US', { timeZone: 'Africa/Algiers' }));
          // If created on or before today's calendar date in Algeria, expire it at end-of-day
          if (
            offerAlgeriaDate.getFullYear() <= algeriaNow.getFullYear() &&
            offerAlgeriaDate.getMonth() <= algeriaNow.getMonth() &&
            offerAlgeriaDate.getDate() <= algeriaNow.getDate()
          ) {
            toExpireIds.push(o.id);
          }
        }

        if (toExpireIds.length > 0) {
          await prisma.offer.updateMany({
            where: { id: { in: toExpireIds } },
            data:  { status: OfferStatus.EXPIRED, expired_at: now },
          });

          logger.info(`Expired ${toExpireIds.length} same-day offers at end of day in Algeria timezone.`);

          for (const id of toExpireIds) {
            await publishEvent({
              eventId:    uuidv4(),
              type:       'offer.expired',
              occurredAt: now.toISOString(),
              payload:    { offerId: id },
            });
          }
        }
      }
    } catch (err) {
      logger.error('Expiration job error', { err });
    }
  });

  logger.info('Offer expiration cron job started (every minute).');
}
