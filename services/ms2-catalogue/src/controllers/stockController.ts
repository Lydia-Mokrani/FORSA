
// src/controllers/stockController.ts
// Internal endpoints for stock reservation and release.
// These endpoints are protected by INTERNAL_API_KEY
// and must NEVER be exposed through Traefik.

import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, OfferStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { Errors } from '../utils/apiError';
import { logger } from '../config/logger';
import { publishEvent } from '../messaging/publisher';
import { v4 as uuidv4 } from 'uuid';

// ─── Validation ──────────────────────────────────────────────────────────────

const ReserveSchema = z.object({
  quantity: z.number().int().positive(),
  reservationId: z.string().uuid(),
});

const ReleaseSchema = z.object({
  quantity: z.number().int().positive(),
  reservationId: z.string().uuid(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function movementMatches(
  movement: { offer_id: string; quantity: number },
  offerId: string,
  quantity: number
): boolean {
  return movement.offer_id === offerId && movement.quantity === quantity;
}

// ─── RESERVE STOCK ───────────────────────────────────────────────────────────

/**
 * POST /internal/offers/:id/reserve
 *
 * Called by MS3 when a customer confirms a reservation.
 *
 * Guarantees:
 * - Atomic stock reduction.
 * - Stock update and movement record are one transaction.
 * - Duplicate reservation requests cannot reduce stock twice.
 * - Insufficient stock is rejected.
 */

export async function reserveStock(
  req: Request,
  res: Response
): Promise<void> {
  const offerId = req.params.id as string;

  const parsed = ReserveSchema.safeParse(req.body);

  if (!parsed.success) {
    Errors.badRequest(res, 'Invalid request body', {
      issues: parsed.error.flatten(),
    });
    return;
  }

  const { quantity, reservationId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check whether this reservation was already processed.
      const existingMovement = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: 'RESERVE',
          },
        },
      });

      if (existingMovement) {
        return {
          kind: 'duplicate' as const,
          matches: movementMatches(
            existingMovement,
            offerId,
            quantity
          ),
        };
      }

      // 2. Atomically reduce stock only if enough stock exists
      // and the offer is currently active.
      const updatedRows = await tx.$executeRaw`
        UPDATE offers
        SET quantity_available = quantity_available - ${quantity}
        WHERE id = ${offerId}
          AND quantity_available >= ${quantity}
          AND status = ${OfferStatus.ACTIVE}
      `;

      if (updatedRows === 0) {
        const offer = await tx.offer.findUnique({
          where: { id: offerId },
        });

        return {
          kind: 'unavailable' as const,
          offer,
        };
      }

      // 3. Record the reservation in the SAME transaction.
      await tx.stockMovement.create({
        data: {
          offer_id: offerId,
          reservation_id: reservationId,
          movement_type: 'RESERVE',
          quantity,
        },
      });

      // 4. Check whether the offer has become sold out.
      const updatedOffer = await tx.offer.findUnique({
        where: { id: offerId },
      });

      let becameSoldOut = false;

      if (
        updatedOffer &&
        updatedOffer.quantity_available === 0 &&
        updatedOffer.status === OfferStatus.ACTIVE
      ) {
        await tx.offer.update({
          where: { id: offerId },
          data: { status: OfferStatus.SOLD_OUT },
        });

        becameSoldOut = true;
      }

      return {
        kind: 'reserved' as const,
        becameSoldOut,
        merchantId: updatedOffer?.merchant_id,
      };
    });

    // 5. Handle transaction results.
    if (result.kind === 'duplicate') {
      if (!result.matches) {
        Errors.conflict(
          res,
          'This reservation ID was already used with different offer or quantity details.'
        );
        return;
      }

      res.json({
        data: {
          reserved: true,
          idempotent: true,
        },
      });
      return;
    }

    if (result.kind === 'unavailable') {
      if (!result.offer) {
        Errors.notFound(res, 'Offer not found.');
      } else if (result.offer.status !== OfferStatus.ACTIVE) {
        Errors.conflict(
          res,
          `Offer is not active (status: ${result.offer.status}).`
        );
      } else {
        Errors.conflict(res, 'Insufficient stock available.');
      }
      return;
    }

    // 6. Publish the event only after the database transaction commits.
    if (result.becameSoldOut) {
      await publishEvent({
        eventId: uuidv4(),
        type: 'offer.sold_out',
        occurredAt: new Date().toISOString(),
        payload: {
          offerId,
          merchantId: result.merchantId,
        },
      });
    }

    logger.info('Stock reserved successfully', {
      offerId,
      reservationId,
      quantity,
    });

    res.json({
      data: {
        reserved: true,
        idempotent: false,
      },
    });
  } catch (error) {
    // A concurrent duplicate request can reach the unique constraint.
    // The failed transaction rolls back its stock update.
    if (isUniqueConstraintError(error)) {
      const existingMovement = await prisma.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: 'RESERVE',
          },
        },
      });

      if (existingMovement) {
        if (!movementMatches(existingMovement, offerId, quantity)) {
          Errors.conflict(
            res,
            'This reservation ID was already used with different offer or quantity details.'
          );
          return;
        }

        res.json({
          data: {
            reserved: true,
            idempotent: true,
          },
        });
        return;
      }
    }

    logger.error('reserveStock error', { error });
    Errors.internal(res);
  }
}

// ─── RELEASE STOCK ───────────────────────────────────────────────────────────

/**
 * POST /internal/offers/:id/release
 *
 * Called by MS3 when a reservation is cancelled or otherwise
 * requires stock restoration, according to the agreed workflow.
 *
 * Guarantees:
 * - A matching original reservation must exist.
 * - Released quantity must match the original reservation.
 * - A reservation cannot be released twice.
 * - Available stock cannot exceed initial stock.
 * - Stock update and movement record are one transaction.
 */

export async function releaseStock(
  req: Request,
  res: Response
): Promise<void> {
  const offerId = req.params.id as string;

  const parsed = ReleaseSchema.safeParse(req.body);

  if (!parsed.success) {
    Errors.badRequest(res, 'Invalid request body', {
      issues: parsed.error.flatten(),
    });
    return;
  }

  const { quantity, reservationId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check whether this reservation was already released.
      const existingRelease = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: 'RELEASE',
          },
        },
      });

      if (existingRelease) {
        return {
          kind: 'duplicate' as const,
          matches: movementMatches(
            existingRelease,
            offerId,
            quantity
          ),
        };
      }

      // 2. Verify the original reservation exists.
      const reserveMovement = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: 'RESERVE',
          },
        },
      });

      if (!reserveMovement) {
        return { kind: 'reservation_not_found' as const };
      }

      // 3. Ensure the release refers to the exact original reservation.
      if (!movementMatches(reserveMovement, offerId, quantity)) {
        return { kind: 'reservation_mismatch' as const };
      }

      // 4. Restore stock atomically, without exceeding initial stock.
      const updatedRows = await tx.$executeRaw`
        UPDATE offers
        SET quantity_available = quantity_available + ${quantity}
        WHERE id = ${offerId}
          AND quantity_available + ${quantity} <= quantity_initial
      `;

      if (updatedRows === 0) {
        const offer = await tx.offer.findUnique({
          where: { id: offerId },
        });

        return {
          kind: 'cannot_restore' as const,
          offer,
        };
      }

      // 5. Record the release in the SAME transaction.
      await tx.stockMovement.create({
        data: {
          offer_id: offerId,
          reservation_id: reservationId,
          movement_type: 'RELEASE',
          quantity,
        },
      });

      // 6. Restore SOLD_OUT offers only if their deadline has not passed.
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
      });

      let reactivated = false;

      if (
        offer &&
        offer.status === OfferStatus.SOLD_OUT &&
        offer.expires_at > new Date() &&
        offer.quantity_available + quantity > 0
      ) {
        await tx.offer.update({
          where: { id: offerId },
          data: { status: OfferStatus.ACTIVE },
        });

        reactivated = true;
      }

      return {
        kind: 'released' as const,
        reactivated,
      };
    });

    // 7. Handle transaction results.
    if (result.kind === 'duplicate') {
      if (!result.matches) {
        Errors.conflict(
          res,
          'This reservation ID was already released with different offer or quantity details.'
        );
        return;
      }

      res.json({
        data: {
          released: true,
          idempotent: true,
        },
      });
      return;
    }

    if (result.kind === 'reservation_not_found') {
      Errors.badRequest(
        res,
        'No matching reservation exists to release.'
      );
      return;
    }

    if (result.kind === 'reservation_mismatch') {
      Errors.conflict(
        res,
        'The offer ID or quantity does not match the original reservation.'
      );
      return;
    }

    if (result.kind === 'cannot_restore') {
      if (!result.offer) {
        Errors.notFound(res, 'Offer not found.');
      } else {
        Errors.conflict(
          res,
          'Releasing this quantity would exceed the offer initial stock.'
        );
      }
      return;
    }

    logger.info('Stock released successfully', {
      offerId,
      reservationId,
      quantity,
      reactivated: result.reactivated,
    });

    res.json({
      data: {
        released: true,
        idempotent: false,
      },
    });
  } catch (error) {
    // If two duplicate release requests race, the unique constraint
    // rejects one transaction and rolls back its stock update.
    if (isUniqueConstraintError(error)) {
      const existingRelease = await prisma.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: 'RELEASE',
          },
        },
      });

      if (existingRelease) {
        if (!movementMatches(existingRelease, offerId, quantity)) {
          Errors.conflict(
            res,
            'This reservation ID was already released with different offer or quantity details.'
          );
          return;
        }

        res.json({
          data: {
            released: true,
            idempotent: true,
          },
        });
        return;
      }
    }

    logger.error('releaseStock error', { error });
    Errors.internal(res);
  }
}
