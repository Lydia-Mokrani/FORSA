// src/jobs/expirationJob.ts
// Runs every minute to expire offers whose pickup deadlines or product expiry dates have passed.
// Also ensures same-day offers expire strictly at the end of their calendar day in Africa/Algiers timezone (UTC+1).
// Implements cross-instance atomic transitions using PostgreSQL RETURNING to eliminate duplicate events.

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
    logger.debug('Expiration job already running in this process, skipping overlapping tick.');
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

    // Merge and deduplicate candidate IDs
    const candidateIdSet = new Set<string>();
    for (const o of standardExpired) candidateIdSet.add(o.id);
    for (const o of sameDayExpired) candidateIdSet.add(o.id);

    const candidateIds = Array.from(candidateIdSet);
    if (candidateIds.length === 0) {
      return 0;
    }

    // 3. Atomic transition across multiple instances using UPDATE ... RETURNING
    // Only rows that ACTUALLY transition from ACTIVE or PENDING_VERIFICATION to EXPIRED
    // are returned. Any other instance executing concurrently will match 0 rows and return empty.
    const transitioned = await prisma.$queryRaw<{ id: string; merchant_id: string }[]>`
      UPDATE offers
      SET status = ${OfferStatus.EXPIRED}::"OfferStatus", expired_at = ${now}
      WHERE id = ANY(${candidateIds})
        AND status IN (${OfferStatus.ACTIVE}::"OfferStatus", ${OfferStatus.PENDING_VERIFICATION}::"OfferStatus")
      RETURNING id, merchant_id
    `;

    if (transitioned && transitioned.length > 0) {
      logger.info(`Expired ${transitioned.length} offers past deadlines.`, { count: transitioned.length });

      // Publish events ONLY for successfully transitioned records (guaranteed idempotency)
      for (const o of transitioned) {
        await publishEvent({
          eventId:    uuidv4(),
          type:       'offer.expired',
          occurredAt: now.toISOString(),
          payload:    { offerId: o.id, merchantId: o.merchant_id },
        });
      }
    }

    return transitioned ? transitioned.length : 0;
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
