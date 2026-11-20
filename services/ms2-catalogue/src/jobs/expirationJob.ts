// src/jobs/expirationJob.ts
// Runs every minute to expire offers whose pickup deadlines or product expiry dates have passed.
// Also ensures same-day offers expire strictly at the end of their calendar day in Africa/Algiers timezone (UTC+1).

import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { publishEvent } from '../messaging/publisher';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { OfferStatus } from '@prisma/client';
import { getAlgiersEndOfDay } from '../utils/timezone';

let isRunning = false;

export async function checkAndExpireOffers(currentTime?: Date): Promise<number> {
  if (isRunning) {
    logger.debug('Expiration job already running, skipping overlapping tick.');
    return 0;
  }
  isRunning = true;

  try {
    const now = currentTime || new Date();

    // 1. Find candidates that have passed their pickup deadline OR product expiry date
    const standardExpired = await prisma.offer.findMany({
      where: {
        status: { in: [OfferStatus.ACTIVE, OfferStatus.PENDING_VERIFICATION] },
        OR: [
          { expires_at: { lte: now } },
          { product_expiry_date: { lte: now } },
        ],
      },
      select: { id: true, merchant_id: true },
    });

    // 2. Find same-day offers that have passed the end of their calendar date in Algeria
    const sameDayCandidates = await prisma.offer.findMany({
      where: {
        status:          { in: [OfferStatus.ACTIVE, OfferStatus.PENDING_VERIFICATION] },
        same_day_expiry: true,
      },
      select: { id: true, merchant_id: true, product_expiry_date: true },
    });

    const sameDayExpired = sameDayCandidates.filter(
      (o) => getAlgiersEndOfDay(o.product_expiry_date) <= now
    );

    // Merge and deduplicate candidates
    const expiredMap = new Map<string, string>(); // offerId -> merchantId
    for (const o of standardExpired) {
      expiredMap.set(o.id, o.merchant_id);
    }
    for (const o of sameDayExpired) {
      expiredMap.set(o.id, o.merchant_id);
    }

    const candidateIds = Array.from(expiredMap.keys());
    if (candidateIds.length === 0) {
      return 0;
    }

    // Atomic update with status guard to prevent duplicate processing
    const result = await prisma.offer.updateMany({
      where: {
        id:     { in: candidateIds },
        status: { in: [OfferStatus.ACTIVE, OfferStatus.PENDING_VERIFICATION] },
      },
      data: {
        status:     OfferStatus.EXPIRED,
        expired_at: now,
      },
    });

    if (result.count > 0) {
      logger.info(`Expired ${result.count} offers.`, { count: result.count });

      for (const [offerId, merchantId] of expiredMap.entries()) {
        await publishEvent({
          eventId:    uuidv4(),
          type:       'offer.expired',
          occurredAt: now.toISOString(),
          payload:    { offerId, merchantId },
        });
      }
    }

    return result.count;
  } catch (err) {
    logger.error('Expiration job error', { err });
    return 0;
  } finally {
    isRunning = false;
  }
}

export function startExpirationJob(): void {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    await checkAndExpireOffers();
  });

  logger.info('Offer expiration cron job started (every minute).');
}
