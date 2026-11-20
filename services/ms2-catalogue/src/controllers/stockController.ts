// src/controllers/stockController.ts
// Internal endpoints for stock reservation and release.
// These endpoints are ONLY accessible via the internal Docker network
// and protected by INTERNAL_API_KEY.
// They must NEVER be exposed through Traefik.

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { Errors } from '../utils/apiError';
import { logger } from '../config/logger';
import { publishEvent } from '../messaging/publisher';
import { v4 as uuidv4 } from 'uuid';
import { OfferStatus } from '@prisma/client';

const ReserveSchema = z.object({
  quantity:      z.number().int().positive(),
  reservationId: z.string().uuid(),
});

const ReleaseSchema = z.object({
  quantity:      z.number().int().positive(),
  reservationId: z.string().uuid(),
});

/**
 * POST /internal/offers/:id/reserve
 * Called by MS3 when a customer confirms a reservation.
 * Uses an atomic SQL UPDATE to prevent overselling.
 */
export async function reserveStock(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = ReserveSchema.safeParse(req.body);
    if (!parsed.success) {
      Errors.badRequest(res, 'Invalid request body', { issues: parsed.error.flatten() });
      return;
    }

    const { quantity, reservationId } = parsed.data;

    // Check idempotency: same reservationId + RESERVE must not exist
    const existing = await prisma.stockMovement.findUnique({
      where: { reservation_id_movement_type: { reservation_id: reservationId, movement_type: 'RESERVE' } },
    });
    if (existing) {
      // Already reserved — return success (idempotent)
      res.json({ data: { reserved: true, idempotent: true } });
      return;
    }

    // Atomic stock reduction using raw SQL — this is the critical safety operation
    const result = await prisma.$executeRaw`
      UPDATE offers
      SET    quantity_available = quantity_available - ${quantity}
      WHERE  id = ${id}
        AND  quantity_available >= ${quantity}
        AND  status = ${OfferStatus.ACTIVE}
    `;

    // If 0 rows updated → insufficient stock or offer not active
    if (result === 0) {
      const offer = await prisma.offer.findUnique({ where: { id } });
      if (!offer) {
        Errors.notFound(res, 'Offer not found.');
      } else if (offer.status !== OfferStatus.ACTIVE) {
        Errors.conflict(res, `Offer is not active (status: ${offer.status}).`);
      } else {
        Errors.conflict(res, 'Insufficient stock available.');
      }
      return;
    }

    // Record the movement
    await prisma.stockMovement.create({
      data: {
        offer_id:       id,
        reservation_id: reservationId,
        movement_type:  'RESERVE',
        quantity,
      },
    });

    // Check if offer is now sold out
    const updatedOffer = await prisma.offer.findUnique({ where: { id } });
    if (updatedOffer?.quantity_available === 0) {
      await prisma.offer.update({
        where: { id },
        data:  { status: OfferStatus.SOLD_OUT },
      });
      await publishEvent({
        eventId:    uuidv4(),
        type:       'offer.sold_out',
        occurredAt: new Date().toISOString(),
        payload:    { offerId: id, merchantId: updatedOffer.merchant_id },
      });
    }

    logger.info('Stock reserved', { offerId: id, reservationId, quantity });
    res.json({ data: { reserved: true } });
  } catch (error) {
    logger.error('reserveStock error', { error });
    Errors.internal(res);
  }
}

/**
 * POST /internal/offers/:id/release
 * Called by MS3 when a reservation is cancelled or picked up.
 * Prevents double-release via unique constraint on (reservationId, RELEASE).
 */
export async function releaseStock(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = ReleaseSchema.safeParse(req.body);
    if (!parsed.success) {
      Errors.badRequest(res, 'Invalid request body', { issues: parsed.error.flatten() });
      return;
    }

    const { quantity, reservationId } = parsed.data;

    // Check idempotency
    const existing = await prisma.stockMovement.findUnique({
      where: { reservation_id_movement_type: { reservation_id: reservationId, movement_type: 'RELEASE' } },
    });
    if (existing) {
      res.json({ data: { released: true, idempotent: true } });
      return;
    }

    // Verify the original RESERVE movement exists
    const reserveMovement = await prisma.stockMovement.findUnique({
      where: { reservation_id_movement_type: { reservation_id: reservationId, movement_type: 'RESERVE' } },
    });
    if (!reserveMovement) {
      Errors.badRequest(res, 'No matching reservation found to release.');
      return;
    }

    // Add back to stock
    await prisma.$executeRaw`
      UPDATE offers
      SET    quantity_available = quantity_available + ${quantity}
      WHERE  id = ${id}
    `;

    // Record the movement
    await prisma.stockMovement.create({
      data: {
        offer_id:       id,
        reservation_id: reservationId,
        movement_type:  'RELEASE',
        quantity,
      },
    });

    // If the offer was SOLD_OUT, restore it to ACTIVE (if not expired)
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (offer?.status === OfferStatus.SOLD_OUT && offer.expires_at > new Date()) {
      await prisma.offer.update({
        where: { id },
        data:  { status: OfferStatus.ACTIVE },
      });
    }

    logger.info('Stock released', { offerId: id, reservationId, quantity });
    res.json({ data: { released: true } });
  } catch (error) {
    logger.error('releaseStock error', { error });
    Errors.internal(res);
  }
}
