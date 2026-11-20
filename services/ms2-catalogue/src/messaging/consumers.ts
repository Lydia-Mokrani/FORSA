// src/messaging/consumers.ts
// MS2 consumes events from RabbitMQ to stay in sync with the platform state.
// All consumers are idempotent — processing the same event twice must be safe.

import { getChannel } from './connection';
import { prisma } from '../config/prisma';
import { publishEvent } from './publisher';
import { logger } from '../config/logger';
import { DomainEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { OfferStatus } from '@prisma/client';

export async function startConsumers(): Promise<void> {
  const ch = await getChannel();

  // ── merchant.approved ──────────────────────────────────────────────────────
  // When MS1 approves a merchant, their DRAFT offers can be published.
  // (They still need to submit the offer themselves — approval just unlocks the ability.)
  ch.consume('ms2.merchant.events', async (msg) => {
    if (!msg) return;
    try {
      const event: DomainEvent<{ merchantId: string; shopId?: string; name?: string; address?: string; latitude?: number; longitude?: number; status?: string; }> = JSON.parse(msg.content.toString());
      const { type, payload } = event;

      if (type === 'merchant.suspended') {
        // Hide ALL active/pending offers for this merchant
        await prisma.offer.updateMany({
          where:  { merchant_id: payload.merchantId, status: { in: [OfferStatus.ACTIVE, OfferStatus.PENDING_VERIFICATION] } },
          data:   { status: OfferStatus.HIDDEN },
        });
        logger.info('Offers hidden due to merchant suspension', { merchantId: payload.merchantId });
      }

      if (type === 'merchant.reactivated') {
        // Restore only offers that were HIDDEN (suspended), not expired/rejected/sold-out
        // and whose deadline has not yet passed
        await prisma.offer.updateMany({
          where: {
            merchant_id: payload.merchantId,
            status:      OfferStatus.HIDDEN,
            expires_at:  { gt: new Date() },
          },
          data: { status: OfferStatus.ACTIVE },
        });
        logger.info('Eligible offers restored after merchant reactivation', { merchantId: payload.merchantId });
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

  // ── offer.date_verified / offer.date_verified.rejected ────────────────────
  ch.consume('ms2.offer.verified', async (msg) => {
    if (!msg) return;
    try {
      const event: DomainEvent<{ offerId: string; verified: boolean; rejectionReason?: string }> = JSON.parse(msg.content.toString());
      const { type, payload } = event;

      if (type === 'offer.date_verified') {
        await prisma.offer.update({
          where: { id: payload.offerId },
          data:  { status: OfferStatus.ACTIVE, published_at: new Date() },
        });
        await publishEvent({
          eventId:    uuidv4(),
          type:       'offer.published',
          occurredAt: new Date().toISOString(),
          payload:    { offerId: payload.offerId },
        });
        logger.info('Offer activated after date verification', { offerId: payload.offerId });
      }

      if (type === 'offer.date_verified.rejected') {
        await prisma.offer.update({
          where: { id: payload.offerId },
          data:  { status: OfferStatus.REJECTED, rejection_reason: payload.rejectionReason },
        });
        logger.info('Offer rejected after date verification', { offerId: payload.offerId });
      }

      if (type === 'offer.manual_review') {
        // Keep in PENDING_VERIFICATION — MS4 flags it for human review
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
      // When a customer picks up their order, increment the shop's sales count snapshot
      const event: DomainEvent<{ shopId: string; offerId: string }> = JSON.parse(msg.content.toString());
      if (event.type === 'reservation.picked_up') {
        await prisma.shopSnapshot.update({
          where: { id: event.payload.shopId },
          data:  { sales_count: { increment: 1 } },
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
