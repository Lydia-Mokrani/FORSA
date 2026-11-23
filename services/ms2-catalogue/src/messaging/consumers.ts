// src/messaging/consumers.ts
// MS2 consumes events from RabbitMQ to stay in sync with the platform state.
// All consumers are idempotent — processing the same event twice must be safe.
// Follows Binding Decisions D3 (Status Mapping) and D4 (Ack/DLQ policy).

import { getChannel } from './connection';
import { prisma } from '../config/prisma';
import { publishEvent } from './publisher';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { OfferStatus, MovementType, ProductType, ShopStatus } from '@prisma/client';
import { getAlgiersCalendarDate } from '../utils/timezone';
import { mapShopStatus } from '../utils/statusMapper';

export { mapShopStatus };

// ── Event Handlers (exported for modular testing) ──────────────────────────

export async function handleMerchantEvent(event: any): Promise<void> {
  const type = event.type || event.event || event.eventType;
  const payload = event.payload ?? event.data ?? {};

  const merchantId = payload.merchantId ?? payload.userId;
  const shopId     = payload.shopId;

  if (type === 'merchant.approved') {
    if (!shopId) {
      throw new Error('merchant.approved missing required shopId');
    }
    const snapshot = await prisma.shopSnapshot.findUnique({ where: { id: shopId } });
    if (!snapshot) {
      logger.warn('merchant.approved: shop snapshot not found (out-of-order)', { shopId });
      // Out-of-order event is DLQ'd per D4 if unhandled
      throw new Error(`Shop snapshot not found for approved merchant: ${shopId}`);
    }
    await prisma.shopSnapshot.update({
      where: { id: shopId },
      data: {
        status: ShopStatus.ACTIVE,
        merchant_id: snapshot.merchant_id || merchantId || undefined,
      },
    });
    logger.info('Shop snapshot set to ACTIVE on merchant.approved', { shopId });
    return;
  }

  if (type === 'merchant.rejected') {
    if (!shopId) {
      throw new Error('merchant.rejected missing required shopId');
    }
    await prisma.shopSnapshot.updateMany({
      where: { id: shopId },
      data: { status: ShopStatus.CLOSED },
    });
    logger.info('Shop snapshot set to CLOSED on merchant.rejected', { shopId });
    return;
  }

  if (type === 'merchant.suspended') {
    if (!merchantId && !shopId) {
      throw new Error('merchant.suspended missing both merchantId/userId and shopId');
    }
    // Store existing status in previous_status, then set status to HIDDEN
    if (merchantId && shopId) {
      await prisma.$executeRaw`
        UPDATE offers
        SET previous_status = status, status = ${OfferStatus.HIDDEN}::"OfferStatus"
        WHERE (merchant_id = ${merchantId} OR shop_id = ${shopId})
          AND status IN (${OfferStatus.ACTIVE}::"OfferStatus", ${OfferStatus.PENDING_VERIFICATION}::"OfferStatus")
      `;
    } else if (merchantId) {
      await prisma.$executeRaw`
        UPDATE offers
        SET previous_status = status, status = ${OfferStatus.HIDDEN}::"OfferStatus"
        WHERE merchant_id = ${merchantId}
          AND status IN (${OfferStatus.ACTIVE}::"OfferStatus", ${OfferStatus.PENDING_VERIFICATION}::"OfferStatus")
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE offers
        SET previous_status = status, status = ${OfferStatus.HIDDEN}::"OfferStatus"
        WHERE shop_id = ${shopId}
          AND status IN (${OfferStatus.ACTIVE}::"OfferStatus", ${OfferStatus.PENDING_VERIFICATION}::"OfferStatus")
      `;
    }
    logger.info('Offers hidden with previous_status preserved due to merchant suspension', { merchantId, shopId });
    return;
  }

  if (type === 'merchant.reactivated') {
    if (!merchantId && !shopId) {
      throw new Error('merchant.reactivated missing both merchantId/userId and shopId');
    }
    const now = new Date();
    const targetFilter = merchantId && shopId
      ? { OR: [{ merchant_id: merchantId }, { shop_id: shopId }] }
      : merchantId
        ? { merchant_id: merchantId }
        : { shop_id: shopId! };

    // 1. Restore only previously ACTIVE offers whose pickup deadline AND product expiry date haven't passed,
    // and whose shop is currently ACTIVE.
    const eligibleActiveOffers = await prisma.offer.findMany({
      where: {
        ...targetFilter,
        status:              OfferStatus.HIDDEN,
        previous_status:     OfferStatus.ACTIVE,
        expires_at:          { gt: now },
        product_expiry_date: { gt: now },
        shop:                { status: ShopStatus.ACTIVE },
      },
      select: { id: true },
    });

    if (eligibleActiveOffers.length > 0) {
      await prisma.offer.updateMany({
        where: { id: { in: eligibleActiveOffers.map(o => o.id) } },
        data: {
          status:          OfferStatus.ACTIVE,
          previous_status: null,
        },
      });
    }

    // 2. Restore previously PENDING_VERIFICATION offers back to PENDING_VERIFICATION (never directly to ACTIVE)
    const eligiblePendingOffers = await prisma.offer.findMany({
      where: {
        ...targetFilter,
        status:              OfferStatus.HIDDEN,
        previous_status:     OfferStatus.PENDING_VERIFICATION,
        expires_at:          { gt: now },
        product_expiry_date: { gt: now },
        shop:                { status: ShopStatus.ACTIVE },
      },
      select: { id: true },
    });

    if (eligiblePendingOffers.length > 0) {
      await prisma.offer.updateMany({
        where: { id: { in: eligiblePendingOffers.map(o => o.id) } },
        data: {
          status:          OfferStatus.PENDING_VERIFICATION,
          previous_status: null,
        },
      });
    }

    logger.info('Eligible offers accurately restored according to previous_status after merchant reactivation', {
      merchantId,
      shopId,
      restoredActive: eligibleActiveOffers.length,
      restoredPending: eligiblePendingOffers.length,
    });
    return;
  }
}

export async function handleShopEvent(event: any): Promise<void> {
  const type = event.type || event.event || event.eventType;
  const payload = event.payload ?? event.data ?? {};

  if (type === 'shop.created') {
    const { shopId, merchantId, userId, name, address, latitude, longitude, status } = payload;
    const targetShopId = shopId || payload.id;
    const ownerMerchantId = merchantId || userId;

    if (!targetShopId || !ownerMerchantId) {
      throw new Error(`shop.created missing required shopId (${targetShopId}) or merchantId/userId (${ownerMerchantId})`);
    }

    if (status === undefined || status === null) {
      throw new Error(`shop.created event missing status for shop ${targetShopId}`);
    }

    const mappedStatus = mapShopStatus(status);
    if (!mappedStatus) {
      throw new Error(`Unknown shop status '${status}' in shop.created for shop ${targetShopId}`);
    }

    // Idempotent upsert: On update, DO NOT overwrite status or merchant_id (Item D)
    await prisma.shopSnapshot.upsert({
      where: { id: targetShopId },
      create: {
        id:             targetShopId,
        name:           name || 'Boutique',
        address:        address || '',
        latitude:       Number(latitude) || 0,
        longitude:      Number(longitude) || 0,
        status:         mappedStatus,
        merchant_id:    ownerMerchantId,
        average_rating: 0,
        sales_count:    0,
      },
      update: {}, // Empty update branch preserves newer status and data on redelivery
    });
    logger.info('Shop snapshot created/upserted on shop.created event', { shopId: targetShopId, ownerMerchantId, status: mappedStatus });
    return;
  }

  if (type === 'shop.updated') {
    const { shopId, id, name, address, latitude, longitude, status, merchantId, userId } = payload;
    const targetId = shopId || id;
    const ownerMerchantId = merchantId || userId;

    if (!targetId) {
      throw new Error('shop.updated missing required shopId');
    }

    let mappedStatus: ShopStatus | undefined;
    if (status !== undefined && status !== null) {
      const mapped = mapShopStatus(status);
      if (!mapped) {
        throw new Error(`Unknown shop status '${status}' in shop.updated for shop ${targetId}`);
      }
      mappedStatus = mapped;
    }

    const existing = await prisma.shopSnapshot.findUnique({ where: { id: targetId } });
    if (!existing) {
      if (!ownerMerchantId) {
        logger.warn('Skipping shop.updated: snapshot does not exist yet and merchantId is missing', { targetId });
        return;
      }
      // Create as CLOSED if status was absent (Item B.3)
      await prisma.shopSnapshot.create({
        data: {
          id:             targetId,
          name:           name || 'Boutique',
          address:        address || '',
          latitude:       Number(latitude) || 0,
          longitude:      Number(longitude) || 0,
          status:         mappedStatus || ShopStatus.CLOSED,
          merchant_id:    ownerMerchantId,
          average_rating: 0,
          sales_count:    0,
        },
      });
      logger.info('Created previously non-existent shop snapshot from shop.updated', { targetId });
      return;
    }

    // Snapshot exists: update fields, keeping existing status if absent
    await prisma.shopSnapshot.update({
      where: { id: targetId },
      data: {
        name:        name !== undefined ? name : undefined,
        address:     address !== undefined ? address : undefined,
        latitude:    latitude !== undefined ? Number(latitude) : undefined,
        longitude:   longitude !== undefined ? Number(longitude) : undefined,
        status:      mappedStatus !== undefined ? mappedStatus : undefined,
        merchant_id: ownerMerchantId !== undefined ? ownerMerchantId : undefined,
      },
    });
    logger.info('Shop snapshot updated on shop.updated event', { shopId: targetId });
    return;
  }

  if (type === 'shop.rating_updated') {
    const { shopId, averageRating, salesCount } = payload;
    if (!shopId) {
      throw new Error('shop.rating_updated missing required shopId');
    }
    const result = await prisma.shopSnapshot.updateMany({
      where: { id: shopId },
      data: {
        average_rating: averageRating,
        sales_count:    salesCount,
      },
    });
    if (result.count === 0) {
      logger.warn('Received shop.rating_updated for non-existent shop snapshot (out-of-order)', { shopId });
    }
    return;
  }

  if (type === 'shop.status_changed') {
    const { shopId, status } = payload;
    if (!shopId) {
      throw new Error('shop.status_changed missing required shopId');
    }
    if (status === undefined || status === null) {
      throw new Error(`shop.status_changed missing status for shop ${shopId}`);
    }
    const mappedStatus = mapShopStatus(status);
    if (!mappedStatus) {
      throw new Error(`Unknown shop status '${status}' in shop.status_changed for shop ${shopId}`);
    }
    const result = await prisma.shopSnapshot.updateMany({
      where: { id: shopId },
      data: { status: mappedStatus },
    });
    if (result.count === 0) {
      logger.warn('Received shop.status_changed for non-existent shop snapshot (out-of-order)', { shopId });
    }
    return;
  }
}

export async function handleOfferVerifiedEvent(event: any): Promise<void> {
  const type = event.type || event.event || event.eventType;
  const payload = event.payload ?? event.data ?? {};

  if (!payload.offerId) {
    throw new Error('Verification event missing required offerId');
  }

  // Guard 1: verificationEventId is strictly required (Item I.1)
  if (!payload.verificationEventId) {
    throw new Error(`Verification event missing required verificationEventId for offer ${payload.offerId}`);
  }

  const offer = await prisma.offer.findUnique({
    where: { id: payload.offerId },
    include: { shop: true },
  });

  if (!offer) {
    logger.warn('Received verification event for non-existent offer', { offerId: payload.offerId });
    return; // Harmless stale event (ack)
  }

  if (offer.status !== OfferStatus.PENDING_VERIFICATION) {
    logger.warn('Ignoring verification event for offer not in PENDING_VERIFICATION status', {
      offerId: offer.id,
      currentStatus: offer.status,
    });
    return; // Harmless stale event (ack)
  }

  // Guard 2: Correlation check (stored value must match event verificationEventId)
  if (offer.verification_event_id !== payload.verificationEventId) {
    logger.warn('Stale verification event: verificationEventId mismatch', {
      offerId: offer.id,
      eventVerificationId: payload.verificationEventId,
      currentVerificationId: offer.verification_event_id,
    });
    return; // Stale event: log and ack without changing state
  }

  const now = new Date();

  // Guard 3: Pickup deadline or product expiry must not have passed
  if (offer.expires_at <= now || offer.product_expiry_date <= now) {
    const res = await prisma.offer.updateMany({
      where: {
        id: offer.id,
        status: OfferStatus.PENDING_VERIFICATION,
        verification_event_id: payload.verificationEventId,
      },
      data: {
        status:                OfferStatus.EXPIRED,
        expired_at:            now,
        verification_event_id: null,
      },
    });
    if (res.count === 1) {
      logger.warn('Offer expired while awaiting verification', { offerId: offer.id });
      await publishEvent({
        eventId:    uuidv4(),
        type:       'offer.expired',
        occurredAt: now.toISOString(),
        payload: {
          offerId:    offer.id,
          merchantId: offer.merchant_id,
        },
      });
    }
    return;
  }

  if (type === 'offer.date_verified') {
    // Enforce verified === true
    if (payload.verified !== true) {
      const res = await prisma.offer.updateMany({
        where: {
          id: offer.id,
          status: OfferStatus.PENDING_VERIFICATION,
          verification_event_id: payload.verificationEventId,
        },
        data: {
          status:                OfferStatus.REJECTED,
          rejection_reason:      payload.rejectionReason || 'Verification check failed.',
          verification_event_id: null,
        },
      });
      if (res.count === 1) {
        logger.warn('Offer rejected because verified flag was not true', { offerId: offer.id });
      }
      return;
    }

    // Requirements for PACKAGED products
    if (offer.product_type === ProductType.PACKAGED) {
      if (!payload.verifiedDate) {
        const res = await prisma.offer.updateMany({
          where: {
            id: offer.id,
            status: OfferStatus.PENDING_VERIFICATION,
            verification_event_id: payload.verificationEventId,
          },
          data: {
            status:                OfferStatus.REJECTED,
            rejection_reason:      'Packaged product verification rejected: missing OCR verified date from label.',
            verification_event_id: null,
          },
        });
        if (res.count === 1) {
          logger.warn('Packaged offer rejected: missing verifiedDate in event payload', { offerId: offer.id });
        }
        return;
      }

      // Compare using Africa/Algiers calendar date strings (YYYY-MM-DD)
      const verifiedDateStr = getAlgiersCalendarDate(new Date(payload.verifiedDate));
      const expectedDateStr = getAlgiersCalendarDate(offer.product_expiry_date);

      if (verifiedDateStr !== expectedDateStr) {
        const res = await prisma.offer.updateMany({
          where: {
            id: offer.id,
            status: OfferStatus.PENDING_VERIFICATION,
            verification_event_id: payload.verificationEventId,
          },
          data: {
            status:                OfferStatus.REJECTED,
            rejection_reason:      `Date on package label (${verifiedDateStr}) does not match entered expiry date (${expectedDateStr}).`,
            verification_event_id: null,
          },
        });
        if (res.count === 1) {
          logger.warn('Offer rejected due to Algerian calendar date mismatch', {
            offerId: offer.id,
            verifiedDateStr,
            expectedDateStr,
          });
        }
        return;
      }
    }

    // Conditional atomic transition to ACTIVE (Item I.2)
    const res = await prisma.offer.updateMany({
      where: {
        id: offer.id,
        status: OfferStatus.PENDING_VERIFICATION,
        verification_event_id: payload.verificationEventId,
      },
      data: {
        status:                OfferStatus.ACTIVE,
        published_at:          now,
        rejection_reason:      null,
        verification_event_id: null,
      },
    });

    // Publish offer.published ONLY after count === 1 (Item I.3)
    if (res.count === 1) {
      await publishEvent({
        eventId:    uuidv4(),
        type:       'offer.published',
        occurredAt: now.toISOString(),
        payload: {
          offerId:    offer.id,
          merchantId: offer.merchant_id,
          shopId:     offer.shop_id,
          categoryId: offer.category_id,
        },
      });
      logger.info('Offer activated after successful verification', { offerId: offer.id });
    } else {
      logger.info('Offer state changed concurrently during verification; published nothing', { offerId: offer.id });
    }
    return;
  }

  if (type === 'offer.date_verified.rejected') {
    const res = await prisma.offer.updateMany({
      where: {
        id: offer.id,
        status: OfferStatus.PENDING_VERIFICATION,
        verification_event_id: payload.verificationEventId,
      },
      data: {
        status:                OfferStatus.REJECTED,
        rejection_reason:      payload.rejectionReason || 'Date verification rejected',
        verification_event_id: null,
      },
    });
    if (res.count === 1) {
      logger.info('Offer rejected after verification', { offerId: offer.id });
    }
    return;
  }

  if (type === 'offer.manual_review') {
    logger.info('Offer flagged for manual review, remains PENDING_VERIFICATION', {
      offerId: offer.id,
      reason: payload.reason,
    });
    return;
  }
}

export async function handleReservationEvent(event: any): Promise<void> {
  const payload = event.payload ?? event.data ?? {};
  const { shopId, offerId, reservationId } = payload;

  if (!reservationId || !offerId) {
    throw new Error('reservation.picked_up event missing required reservationId or offerId');
  }

  await prisma.$transaction(async (tx) => {
    // Check if a PICKUP movement already exists for this reservation (Item J.1)
    const existingPickup = await tx.stockMovement.findUnique({
      where: {
        reservation_id_movement_type: {
          reservation_id: reservationId,
          movement_type:  MovementType.PICKUP,
        },
      },
    });

    if (existingPickup) {
      const reserveMovement = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type:  MovementType.RESERVE,
          },
        },
      });
      const expectedQty = reserveMovement ? reserveMovement.quantity : existingPickup.quantity;

      if (
        existingPickup.offer_id === offerId &&
        existingPickup.quantity === expectedQty
      ) {
        logger.info('Harmless duplicate reservation.picked_up received; already processed', { reservationId });
        return; // ack
      }

      // Conflicting duplicate → integrity error (DLQ)
      throw new Error(
        `Conflicting duplicate pickup for reservation ${reservationId}: existing offer=${existingPickup.offer_id}, qty=${existingPickup.quantity}; event offer=${offerId}`
      );
    }

    // Guard 1: Reservation must not have been released (Item J.2)
    const releaseMovement = await tx.stockMovement.findUnique({
      where: {
        reservation_id_movement_type: {
          reservation_id: reservationId,
          movement_type:  MovementType.RELEASE,
        },
      },
    });
    if (releaseMovement) {
      throw new Error(`Integrity error: Cannot record pickup for released reservation ${reservationId}`);
    }

    // Guard 2: Matching RESERVE movement must exist (Item J.2)
    const reserveMovement = await tx.stockMovement.findUnique({
      where: {
        reservation_id_movement_type: {
          reservation_id: reservationId,
          movement_type:  MovementType.RESERVE,
        },
      },
    });
    if (!reserveMovement) {
      throw new Error(`Integrity error: No matching RESERVE movement found for reservation ${reservationId}`);
    }

    if (reserveMovement.offer_id !== offerId) {
      throw new Error(`Integrity error: Mismatch between event offerId ${offerId} and reserveMovement offer_id ${reserveMovement.offer_id}`);
    }

    // Guard 3: Validate that the offer exists and belongs to the shop specified in the event
    const offer = await tx.offer.findUnique({
      where: { id: offerId },
      select: { id: true, shop_id: true },
    });
    if (!offer) {
      throw new Error(`Integrity error: Offer ${offerId} not found`);
    }

    if (shopId && shopId !== offer.shop_id) {
      throw new Error(`Integrity error: Event shopId ${shopId} does not match offer.shop_id ${offer.shop_id}`);
    }

    try {
      // Record PICKUP movement using exact reserved quantity
      await tx.stockMovement.create({
        data: {
          offer_id:       offerId,
          reservation_id: reservationId,
          movement_type:  MovementType.PICKUP,
          quantity:       reserveMovement.quantity,
        },
      });

      // Increment shop sales count strictly on the offer's verified shop_id
      await tx.shopSnapshot.update({
        where: { id: offer.shop_id },
        data:  { sales_count: { increment: 1 } },
      });
    } catch (err: any) {
      // Handle unique constraint violation from concurrent duplicate deliveries (Item J.3)
      if (err?.code === 'P2002') {
        logger.info('Concurrent duplicate pickup delivery caught via unique constraint', { reservationId });
        return;
      }
      throw err;
    }
  });
}

export const handleShopCreated = (event: any) => handleShopEvent(event);
export const handleMerchantSuspended = (event: any) => handleMerchantEvent(event);

export async function startConsumers(): Promise<void> {
  const ch = await getChannel();

  // Fair dispatch: limit unacknowledged messages to 10
  await ch.prefetch(10);

  // ── merchant.events ────────────────────────────────────────────────────────
  ch.consume('ms2.merchant.events', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      await handleMerchantEvent(event);
      ch.ack(msg);
    } catch (err: any) {
      logger.error('Error processing merchant event', { err: err?.message });
      ch.nack(msg, false, false); // send to DLQ (Decision D4)
    }
  }, { noAck: false });

  // ── shop.events ────────────────────────────────────────────────────────────
  ch.consume('ms2.shop.events', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      await handleShopEvent(event);
      ch.ack(msg);
    } catch (err: any) {
      logger.error('Error processing shop event', { err: err?.message });
      ch.nack(msg, false, false); // send to DLQ (Decision D4)
    }
  }, { noAck: false });

  // ── offer.verified ─────────────────────────────────────────────────────────
  ch.consume('ms2.offer.verified', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      await handleOfferVerifiedEvent(event);
      ch.ack(msg);
    } catch (err: any) {
      logger.error('Error processing offer.verified event', { err: err?.message });
      ch.nack(msg, false, false); // send to DLQ (Decision D4)
    }
  }, { noAck: false });

  // ── reservation.events ─────────────────────────────────────────────────────
  ch.consume('ms2.reservation.events', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      await handleReservationEvent(event);
      ch.ack(msg);
    } catch (err: any) {
      logger.error('Error processing reservation event', { err: err?.message });
      ch.nack(msg, false, false); // send to DLQ (Decision D4)
    }
  }, { noAck: false });

  logger.info('MS2 RabbitMQ consumers started with prefetch 10.');
}
