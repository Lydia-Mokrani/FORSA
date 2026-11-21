// src/messaging/consumers.ts
// MS2 consumes events from RabbitMQ to stay in sync with the platform state.
// All consumers are idempotent — processing the same event twice must be safe.

import { getChannel } from './connection';
import { prisma } from '../config/prisma';
import { publishEvent } from './publisher';
import { logger } from '../config/logger';
import { DomainEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { OfferStatus, MovementType, ProductType, ShopStatus } from '@prisma/client';
import { getAlgiersCalendarDate } from '../utils/timezone';

// ── Event Handlers (exported for modular testing) ──────────────────────────

export async function handleMerchantEvent(event: any): Promise<void> {
  const type = event.type || event.event || event.eventType;
  const payload = event.payload ?? event.data ?? {};

  const merchantId = payload.merchantId ?? payload.userId;
  const shopId     = payload.shopId;

  if (!merchantId && !shopId) {
    logger.warn('merchant event missing both merchantId/userId and shopId; skipping', { payload });
    return;
  }

  if (type === 'merchant.suspended') {
    // Store existing status in previous_status, then set status to HIDDEN
    // Uses merchantId (userId) or falls back to shopId
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
  }

  if (type === 'merchant.reactivated') {
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
      logger.warn('Skipping shop.created event missing shopId or merchantId/userId', { payload });
      return;
    }

    // Respect status from MS1 (do not force ACTIVE if shop is PENDING or unapproved)
    const initialStatus: ShopStatus = (status && Object.values(ShopStatus).includes(status as ShopStatus))
      ? (status as ShopStatus)
      : ShopStatus.ACTIVE;

    await prisma.shopSnapshot.upsert({
      where: { id: targetShopId },
      create: {
        id:             targetShopId,
        name:           name || 'Boutique',
        address:        address || '',
        latitude:       Number(latitude) || 0,
        longitude:      Number(longitude) || 0,
        status:         initialStatus,
        merchant_id:    ownerMerchantId,
        average_rating: 0,
        sales_count:    0,
      },
      update: {
        name:        name !== undefined ? name : undefined,
        address:     address !== undefined ? address : undefined,
        latitude:    latitude !== undefined ? Number(latitude) : undefined,
        longitude:   longitude !== undefined ? Number(longitude) : undefined,
        status:      initialStatus,
        merchant_id: ownerMerchantId,
      },
    });
    logger.info('Shop snapshot created/upserted on shop.created event', { shopId: targetShopId, ownerMerchantId, status: initialStatus });
  } else if (type === 'shop.updated') {
    const { shopId, id, name, address, latitude, longitude, status, merchantId, userId } = payload;
    const targetId = shopId || id;
    const ownerMerchantId = merchantId || userId;

    if (!targetId) {
      logger.warn('Skipping shop.updated event missing shopId', { payload });
      return;
    }

    const existing = await prisma.shopSnapshot.findUnique({ where: { id: targetId } });
    if (!existing && !ownerMerchantId) {
      logger.warn('Skipping shop.updated: snapshot does not exist yet and merchantId is missing', { targetId });
      return;
    }

    await prisma.shopSnapshot.upsert({
      where: { id: targetId },
      create: {
        id:             targetId,
        name:           name || 'Boutique',
        address:        address || '',
        latitude:       Number(latitude) || 0,
        longitude:      Number(longitude) || 0,
        status:         (status as ShopStatus) || ShopStatus.ACTIVE,
        merchant_id:    ownerMerchantId!,
        average_rating: 0,
        sales_count:    0,
      },
      update: {
        name:        name !== undefined ? name : undefined,
        address:     address !== undefined ? address : undefined,
        latitude:    latitude !== undefined ? Number(latitude) : undefined,
        longitude:   longitude !== undefined ? Number(longitude) : undefined,
        status:      status !== undefined ? (status as ShopStatus) : undefined,
        merchant_id: ownerMerchantId !== undefined ? ownerMerchantId : undefined,
      },
    });
    logger.info('Shop snapshot updated on shop.updated event', { shopId: targetId });
  } else if (type === 'shop.rating_updated') {
    const { shopId, averageRating, salesCount } = payload;
    if (shopId) {
      // Use updateMany so out-of-order events do not throw if the snapshot does not exist yet
      const result = await prisma.shopSnapshot.updateMany({
        where: { id: shopId },
        data: {
          average_rating: averageRating,
          sales_count:    salesCount,
        },
      });
      if (result.count === 0) {
        logger.warn('Received shop.rating_updated for non-existent shop snapshot (out-of-order)', { shopId });
      } else {
        logger.info('Shop snapshot rating updated', { shopId, averageRating, salesCount });
      }
    }
  } else if (type === 'shop.status_changed') {
    const { shopId, status } = payload;
    if (shopId && status) {
      // Use updateMany so out-of-order events do not throw
      const result = await prisma.shopSnapshot.updateMany({
        where: { id: shopId },
        data: { status: status as ShopStatus },
      });
      if (result.count === 0) {
        logger.warn('Received shop.status_changed for non-existent shop snapshot (out-of-order)', { shopId });
      } else {
        logger.info('Shop snapshot status changed', { shopId, status });
      }
    }
  }
}

export const handleShopCreated = (event: any) => handleShopEvent(event);
export const handleMerchantSuspended = (event: any) => handleMerchantEvent(event);

export async function startConsumers(): Promise<void> {
  const ch = await getChannel();

  // Fair dispatch: limit unacknowledged messages to 10
  await ch.prefetch(10);

  // ── merchant.suspended / merchant.reactivated ──────────────────────────────
  ch.consume('ms2.merchant.events', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      await handleMerchantEvent(event);
      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing merchant event', { err });
      ch.nack(msg, false, false); // send to DLQ
    }
  }, { noAck: false });

  // ── shop.events (MS1 -> MS2 shop snapshot synchronization) ──────────────────
  ch.consume('ms2.shop.events', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      await handleShopEvent(event);
      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing shop event', { err });
      ch.nack(msg, false, false);
    }
  }, { noAck: false });

  // ── offer.date_verified / offer.date_verified.rejected / offer.manual_review ─
  ch.consume('ms2.offer.verified', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      const type = event.type;
      const payload = event.payload ?? event.data ?? {};

      const offer = await prisma.offer.findUnique({
        where: { id: payload.offerId },
        include: { shop: true },
      });

      // Guard 1: Ignore verification events if offer does not exist or is not in PENDING_VERIFICATION
      if (!offer) {
        logger.warn('Received verification event for non-existent offer', { offerId: payload.offerId });
        ch.ack(msg);
        return;
      }

      if (offer.status !== OfferStatus.PENDING_VERIFICATION) {
        logger.warn('Ignoring verification event for offer not in PENDING_VERIFICATION status', {
          offerId: offer.id,
          currentStatus: offer.status,
          eventType: type,
        });
        ch.ack(msg);
        return;
      }

      // Guard 2: Correlation check via verification_event_id to prevent stale verification events
      if (
        payload.verificationEventId &&
        offer.verification_event_id &&
        payload.verificationEventId !== offer.verification_event_id
      ) {
        logger.warn('Ignoring stale verification event: verificationEventId mismatch', {
          offerId: offer.id,
          eventVerificationId: payload.verificationEventId,
          currentVerificationId: offer.verification_event_id,
        });
        ch.ack(msg);
        return;
      }

      const now = new Date();

      // Guard 3: Pickup deadline or product expiry must not have passed
      if (offer.expires_at <= now || offer.product_expiry_date <= now) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            status:                OfferStatus.EXPIRED,
            expired_at:            now,
            verification_event_id: null,
          },
        });
        logger.warn('Offer expired while awaiting verification', { offerId: offer.id });
        ch.ack(msg);
        return;
      }

      if (type === 'offer.date_verified') {
        // Enforce verified === true
        if (payload.verified !== true) {
          await prisma.offer.update({
            where: { id: offer.id },
            data: {
              status:                OfferStatus.REJECTED,
              rejection_reason:      payload.rejectionReason || 'Verification check failed.',
              verification_event_id: null,
            },
          });
          logger.warn('Offer rejected because verified flag was not true', { offerId: offer.id });
          ch.ack(msg);
          return;
        }

        // Requirements for PACKAGED products
        if (offer.product_type === ProductType.PACKAGED) {
          if (!payload.verifiedDate) {
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                status:                OfferStatus.REJECTED,
                rejection_reason:      'Packaged product verification rejected: missing OCR verified date from label.',
                verification_event_id: null,
              },
            });
            logger.warn('Packaged offer rejected: missing verifiedDate in event payload', { offerId: offer.id });
            ch.ack(msg);
            return;
          }

          // Compare using Africa/Algiers calendar date strings (YYYY-MM-DD)
          const verifiedDateStr = getAlgiersCalendarDate(new Date(payload.verifiedDate));
          const expectedDateStr = getAlgiersCalendarDate(offer.product_expiry_date);

          if (verifiedDateStr !== expectedDateStr) {
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                status:                OfferStatus.REJECTED,
                rejection_reason:      `Date on package label (${verifiedDateStr}) does not match entered expiry date (${expectedDateStr}).`,
                verification_event_id: null,
              },
            });
            logger.warn('Offer rejected due to Algerian calendar date mismatch', {
              offerId: offer.id,
              verifiedDateStr,
              expectedDateStr,
            });
            ch.ack(msg);
            return;
          }
        }

        // Verification approved -> transition to ACTIVE and clear correlation ID
        const updated = await prisma.offer.update({
          where: { id: offer.id },
          data: {
            status:                OfferStatus.ACTIVE,
            published_at:          new Date(),
            rejection_reason:      null,
            verification_event_id: null,
          },
        });

        await publishEvent({
          eventId:    uuidv4(),
          type:       'offer.published',
          occurredAt: new Date().toISOString(),
          payload: {
            offerId:    updated.id,
            merchantId: updated.merchant_id,
            shopId:     updated.shop_id,
            categoryId: updated.category_id,
          },
        });
        logger.info('Offer activated after successful verification', { offerId: offer.id });
      } else if (type === 'offer.date_verified.rejected') {
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            status:                OfferStatus.REJECTED,
            rejection_reason:      payload.rejectionReason || 'Date verification rejected',
            verification_event_id: null,
          },
        });
        logger.info('Offer rejected after verification', { offerId: offer.id });
      } else if (type === 'offer.manual_review') {
        // Retain PENDING_VERIFICATION for human operator review
        logger.info('Offer flagged for manual review, remains PENDING_VERIFICATION', {
          offerId: offer.id,
          reason: payload.reason,
        });
      }

      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing offer.verified event', { err });
      ch.nack(msg, false, false);
    }
  }, { noAck: false });

  // ── reservation.picked_up ─────────────────────────────────────────────────
  ch.consume('ms2.reservation.events', async (msg) => {
    if (!msg) return;
    try {
      const event: any = JSON.parse(msg.content.toString());
      const payload = event.payload ?? event.data ?? {};
      const { shopId, offerId, reservationId } = payload;

      if (!reservationId || !offerId) {
        logger.warn('Missing reservationId or offerId in reservation.picked_up event', { payload });
        ch.ack(msg);
        return;
      }

      await prisma.$transaction(async (tx) => {
        // Guard 1: Pickup cannot be accepted if reservation was already released
        const releaseMovement = await tx.stockMovement.findUnique({
          where: {
            reservation_id_movement_type: {
              reservation_id: reservationId,
              movement_type:  MovementType.RELEASE,
            },
          },
        });

        if (releaseMovement) {
          logger.warn('Ignoring pickup event for already released reservation', { reservationId });
          return;
        }

        // Guard 2: Idempotent check
        const existingPickup = await tx.stockMovement.findUnique({
          where: {
            reservation_id_movement_type: {
              reservation_id: reservationId,
              movement_type:  MovementType.PICKUP,
            },
          },
        });

        if (existingPickup) {
          logger.info('Pickup movement already recorded (idempotent)', { reservationId });
          return;
        }

        // Guard 3: Must find matching original RESERVE movement
        const reserveMovement = await tx.stockMovement.findUnique({
          where: {
            reservation_id_movement_type: {
              reservation_id: reservationId,
              movement_type:  MovementType.RESERVE,
            },
          },
        });

        if (!reserveMovement) {
          logger.warn('Cannot record pickup: no matching RESERVE movement found for reservation', { reservationId });
          return;
        }

        if (reserveMovement.offer_id !== offerId) {
          logger.warn('Mismatch between event offerId and reserveMovement offer_id', {
            reservationId,
            eventOfferId: offerId,
            reserveOfferId: reserveMovement.offer_id,
          });
          return;
        }

        // Guard 4: Validate that the offer belongs to the shop specified in the event
        const offer = await tx.offer.findUnique({
          where: { id: offerId },
          select: { id: true, shop_id: true },
        });

        if (!offer) {
          logger.warn('Cannot record pickup: offer not found', { offerId });
          return;
        }

        if (shopId && shopId !== offer.shop_id) {
          logger.warn('Mismatch between event shopId and offer shop_id; ignoring pickup', {
            reservationId,
            eventShopId: shopId,
            offerShopId: offer.shop_id,
          });
          return;
        }

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
      });

      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing reservation.picked_up event', { err });
      ch.nack(msg, false, false);
    }
  }, { noAck: false });

  logger.info('MS2 RabbitMQ consumers started with prefetch 10.');
}
