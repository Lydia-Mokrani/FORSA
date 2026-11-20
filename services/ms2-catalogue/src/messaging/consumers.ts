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

export async function startConsumers(): Promise<void> {
  const ch = await getChannel();

  // ── merchant.suspended / merchant.reactivated ──────────────────────────────
  ch.consume('ms2.merchant.events', async (msg) => {
    if (!msg) return;
    try {
      const event: DomainEvent<{ merchantId: string; reason?: string }> = JSON.parse(msg.content.toString());
      const { type, payload } = event;

      if (type === 'merchant.suspended') {
        // Store existing status in previous_status, then set status to HIDDEN
        // This ensures PENDING_VERIFICATION offers are never mistakenly activated upon reactivation
        await prisma.$executeRaw`
          UPDATE offers
          SET previous_status = status, status = ${OfferStatus.HIDDEN}
          WHERE merchant_id = ${payload.merchantId}
            AND status IN (${OfferStatus.ACTIVE}, ${OfferStatus.PENDING_VERIFICATION})
        `;
        logger.info('Offers hidden with previous_status preserved due to merchant suspension', { merchantId: payload.merchantId });
      }

      if (type === 'merchant.reactivated') {
        const now = new Date();

        // 1. Restore only previously ACTIVE offers whose pickup deadline AND product expiry date haven't passed,
        // and whose shop is currently ACTIVE.
        const eligibleActiveOffers = await prisma.offer.findMany({
          where: {
            merchant_id:         payload.merchantId,
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
        // only if their deadline and product expiry haven't passed and shop is ACTIVE.
        const eligiblePendingOffers = await prisma.offer.findMany({
          where: {
            merchant_id:         payload.merchantId,
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
          merchantId: payload.merchantId,
          restoredActive: eligibleActiveOffers.length,
          restoredPending: eligiblePendingOffers.length,
        });
      }

      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing merchant event', { err });
      ch.nack(msg, false, false); // send to DLQ
    }
  }, { noAck: false });

  // ── shop.events ────────────────────────────────────────────────────────────
  ch.consume('ms2.shop.events', async (msg) => {
    if (!msg) return;
    try {
      const event: DomainEvent<any> = JSON.parse(msg.content.toString());

      if (event.type === 'shop.rating_updated') {
        const { shopId, averageRating, salesCount } = event.payload;
        await prisma.shopSnapshot.update({
          where: { id: shopId },
          data: {
            average_rating: averageRating,
            sales_count:    salesCount,
          },
        });
        logger.info('Shop snapshot rating updated', { shopId, averageRating, salesCount });
      } else if (event.type === 'shop.created' || event.type === 'shop.updated') {
        const { shopId, id, name, address, latitude, longitude, status, merchantId } = event.payload;
        const targetId = shopId || id;
        if (targetId) {
          await prisma.shopSnapshot.upsert({
            where: { id: targetId },
            create: {
              id: targetId,
              name: name || 'Shop',
              address: address || '',
              latitude: Number(latitude) || 0,
              longitude: Number(longitude) || 0,
              status: status || ShopStatus.ACTIVE,
              merchant_id: merchantId,
            },
            update: {
              name: name !== undefined ? name : undefined,
              address: address !== undefined ? address : undefined,
              latitude: latitude !== undefined ? Number(latitude) : undefined,
              longitude: longitude !== undefined ? Number(longitude) : undefined,
              status: status !== undefined ? status : undefined,
            },
          });
          logger.info('Shop snapshot created/updated', { shopId: targetId });
        }
      } else if (event.type === 'shop.status_changed') {
        const { shopId, status } = event.payload;
        if (shopId && status) {
          await prisma.shopSnapshot.update({
            where: { id: shopId },
            data: { status },
          });
          logger.info('Shop snapshot status changed', { shopId, status });
        }
      }

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
      const event: DomainEvent<{ offerId: string; verified: boolean; verifiedDate?: string; rejectionReason?: string; reason?: string }> = JSON.parse(msg.content.toString());
      const { type, payload } = event;

      const offer = await prisma.offer.findUnique({
        where: { id: payload.offerId },
        include: { shop: true },
      });

      // Guard: Ignore verification events if offer does not exist or is not in PENDING_VERIFICATION
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

      const now = new Date();

      // Guard: Pickup deadline or product expiry must not have passed
      if (offer.expires_at <= now || offer.product_expiry_date <= now) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: { status: OfferStatus.EXPIRED, expired_at: now },
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
              status:           OfferStatus.REJECTED,
              rejection_reason: payload.rejectionReason || 'Verification check failed.',
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
                status:           OfferStatus.REJECTED,
                rejection_reason: 'Packaged product verification rejected: missing OCR verified date from label.',
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
                status:           OfferStatus.REJECTED,
                rejection_reason: `Date on package label (${verifiedDateStr}) does not match entered expiry date (${expectedDateStr}).`,
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

        // Verification approved -> transition to ACTIVE
        const updated = await prisma.offer.update({
          where: { id: offer.id },
          data: {
            status:           OfferStatus.ACTIVE,
            published_at:     new Date(),
            rejection_reason: null,
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
            status:           OfferStatus.REJECTED,
            rejection_reason: payload.rejectionReason || 'Date verification rejected',
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
      const event: DomainEvent<{ shopId: string; offerId: string; reservationId?: string; quantity?: number }> = JSON.parse(msg.content.toString());
      if (event.type === 'reservation.picked_up') {
        const { shopId, offerId, reservationId } = event.payload;

        if (!reservationId || !offerId) {
          logger.warn('Missing reservationId or offerId in reservation.picked_up event', { payload: event.payload });
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

          // Record PICKUP movement using exact reserved quantity
          await tx.stockMovement.create({
            data: {
              offer_id:       offerId,
              reservation_id: reservationId,
              movement_type:  MovementType.PICKUP,
              quantity:       reserveMovement.quantity,
            },
          });

          // Increment shop sales count in the EXACT SAME transaction
          if (shopId) {
            await tx.shopSnapshot.update({
              where: { id: shopId },
              data:  { sales_count: { increment: 1 } },
            });
          }
        });
      }
      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing reservation.picked_up event', { err });
      ch.nack(msg, false, false);
    }
  }, { noAck: false });

  logger.info('MS2 RabbitMQ consumers started.');
}
