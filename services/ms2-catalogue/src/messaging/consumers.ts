// src/messaging/consumers.ts
// MS2 consumes events from RabbitMQ to stay in sync with the platform state.
// All consumers are idempotent — processing the same event twice must be safe.

import { getChannel } from './connection';
import { prisma } from '../config/prisma';
import { publishEvent } from './publisher';
import { logger } from '../config/logger';
import { DomainEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { OfferStatus, MovementType, ProductType } from '@prisma/client';

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

        // 1. Restore only previously ACTIVE offers whose deadlines haven't expired
        await prisma.offer.updateMany({
          where: {
            merchant_id:     payload.merchantId,
            status:          OfferStatus.HIDDEN,
            previous_status: OfferStatus.ACTIVE,
            expires_at:      { gt: now },
          },
          data: {
            status:          OfferStatus.ACTIVE,
            previous_status: null,
          },
        });

        // 2. Restore previously PENDING_VERIFICATION offers back to PENDING_VERIFICATION (never directly to ACTIVE)
        await prisma.offer.updateMany({
          where: {
            merchant_id:     payload.merchantId,
            status:          OfferStatus.HIDDEN,
            previous_status: OfferStatus.PENDING_VERIFICATION,
            expires_at:      { gt: now },
          },
          data: {
            status:          OfferStatus.PENDING_VERIFICATION,
            previous_status: null,
          },
        });

        logger.info('Eligible offers accurately restored according to previous_status after merchant reactivation', { merchantId: payload.merchantId });
      }

      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing merchant event', { err });
      ch.nack(msg, false, false); // send to DLQ
    }
  }, { noAck: false });

  // ── shop.rating_updated ────────────────────────────────────────────────────
  ch.consume('ms2.shop.events', async (msg) => {
    if (!msg) return;
    try {
      const event: DomainEvent<{ shopId: string; averageRating: number; salesCount: number }> = JSON.parse(msg.content.toString());
      if (event.type === 'shop.rating_updated') {
        await prisma.shopSnapshot.update({
          where: { id: event.payload.shopId },
          data: {
            average_rating: event.payload.averageRating,
            sales_count:    event.payload.salesCount,
          },
        });
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
      const event: DomainEvent<{ offerId: string; verified: boolean; verifiedDate?: string; rejectionReason?: string }> = JSON.parse(msg.content.toString());
      const { type, payload } = event;

      if (type === 'offer.date_verified') {
        const offer = await prisma.offer.findUnique({ where: { id: payload.offerId } });

        if (offer && offer.status === OfferStatus.PENDING_VERIFICATION) {
          const now = new Date();

          // Guard: deadline or product expiry must not have already passed
          if (offer.expires_at <= now || (offer.product_expiry_date && offer.product_expiry_date <= now)) {
            await prisma.offer.update({
              where: { id: offer.id },
              data:  { status: OfferStatus.EXPIRED, expired_at: now },
            });
            logger.warn('Offer expired while awaiting verification', { offerId: offer.id });
            ch.ack(msg);
            return;
          }

          // Guard for PACKAGED: verify OCR extracted date matches merchant entered expiry date
          if (offer.product_type === ProductType.PACKAGED && payload.verifiedDate && offer.product_expiry_date) {
            const verifiedDateStr = new Date(payload.verifiedDate).toISOString().slice(0, 10);
            const expectedDateStr = offer.product_expiry_date.toISOString().slice(0, 10);

            if (verifiedDateStr !== expectedDateStr) {
              await prisma.offer.update({
                where: { id: offer.id },
                data:  {
                  status:           OfferStatus.REJECTED,
                  rejection_reason: `Date on package label (${verifiedDateStr}) does not match entered expiry date (${expectedDateStr}).`,
                },
              });
              logger.warn('Offer rejected due to OCR date mismatch', { offerId: offer.id });
              ch.ack(msg);
              return;
            }
          }

          // Verification approved -> transition to ACTIVE
          const updated = await prisma.offer.update({
            where: { id: payload.offerId },
            data:  {
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
          logger.info('Offer activated after verification', { offerId: payload.offerId });
        }
      }

      if (type === 'offer.date_verified.rejected') {
        await prisma.offer.update({
          where: { id: payload.offerId },
          data:  {
            status:           OfferStatus.REJECTED,
            rejection_reason: payload.rejectionReason || 'Date verification rejected',
          },
        });
        logger.info('Offer rejected after verification', { offerId: payload.offerId });
      }

      if (type === 'offer.manual_review') {
        // Retain PENDING_VERIFICATION for human operator review
        logger.info('Offer flagged for manual review', { offerId: payload.offerId });
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
        const { shopId, offerId, reservationId, quantity } = event.payload;

        if (reservationId && offerId) {
          // Guard: Pickup cannot be accepted if reservation was already released
          const releaseMovement = await prisma.stockMovement.findUnique({
            where: {
              reservation_id_movement_type: {
                reservation_id: reservationId,
                movement_type:  MovementType.RELEASE,
              },
            },
          });

          if (releaseMovement) {
            logger.warn('Ignoring pickup event for already released reservation', { reservationId });
            ch.ack(msg);
            return;
          }

          // Idempotent pickup movement recording
          const existingPickup = await prisma.stockMovement.findUnique({
            where: {
              reservation_id_movement_type: {
                reservation_id: reservationId,
                movement_type:  MovementType.PICKUP,
              },
            },
          });

          if (!existingPickup) {
            const reserveMovement = await prisma.stockMovement.findUnique({
              where: {
                reservation_id_movement_type: {
                  reservation_id: reservationId,
                  movement_type:  MovementType.RESERVE,
                },
              },
            });

            await prisma.stockMovement.create({
              data: {
                offer_id:       offerId,
                reservation_id: reservationId,
                movement_type:  MovementType.PICKUP,
                quantity:       reserveMovement ? reserveMovement.quantity : (quantity || 1),
              },
            });

            // Increment shop sales count only once upon genuine first pickup
            await prisma.shopSnapshot.update({
              where: { id: shopId },
              data:  { sales_count: { increment: 1 } },
            });
          }
        }
      }
      ch.ack(msg);
    } catch (err) {
      logger.error('Error processing reservation.picked_up event', { err });
      ch.nack(msg, false, false);
    }
  }, { noAck: false });

  logger.info('MS2 RabbitMQ consumers started.');
}
