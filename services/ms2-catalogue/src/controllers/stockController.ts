// src/controllers/stockController.ts
// Internal endpoints for stock reservation, release, and pickup.
// These endpoints are protected by INTERNAL_API_KEY
// and must NEVER be exposed through Traefik.

import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, OfferStatus, MovementType } from '@prisma/client';
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

const PickupSchema = z.object({
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
 * - Cannot reserve expired, withdrawn, suspended, or unverified offers.
 * - Cannot reserve after pickup deadline or product expiry date.
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
            movement_type: MovementType.RESERVE,
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

      // 2. Fetch offer and verify eligibility
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { shop: true },
      });

      if (!offer) {
        return { kind: 'not_found' as const };
      }

      const now = new Date();
      if (offer.status !== OfferStatus.ACTIVE) {
        return { kind: 'ineligible_status' as const, status: offer.status };
      }
      if (offer.expires_at <= now) {
        return { kind: 'deadline_passed' as const };
      }
      if (offer.product_expiry_date && offer.product_expiry_date <= now) {
        return { kind: 'product_expired' as const };
      }
      if (offer.shop?.status !== 'ACTIVE') {
        return { kind: 'shop_inactive' as const };
      }

      // 3. Atomically reduce stock only if enough stock exists
      const updatedRows = await tx.$executeRaw`
        UPDATE offers
        SET quantity_available = quantity_available - ${quantity}
        WHERE id = ${offerId}
          AND quantity_available >= ${quantity}
          AND status = ${OfferStatus.ACTIVE}
      `;

      if (updatedRows === 0) {
        return { kind: 'insufficient_stock' as const };
      }

      // 4. Record the reservation in the SAME transaction.
      await tx.stockMovement.create({
        data: {
          offer_id: offerId,
          reservation_id: reservationId,
          movement_type: MovementType.RESERVE,
          quantity,
        },
      });

      // 5. Check whether the offer has become sold out.
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

    // Handle transaction results.
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

    if (result.kind === 'not_found') {
      Errors.notFound(res, 'Offer not found.');
      return;
    }

    if (result.kind === 'ineligible_status') {
      Errors.conflict(res, `Offer is not active (status: ${result.status}).`);
      return;
    }

    if (result.kind === 'deadline_passed') {
      Errors.conflict(res, 'The pickup deadline for this offer has already passed.');
      return;
    }

    if (result.kind === 'product_expired') {
      Errors.conflict(res, 'The product has expired.');
      return;
    }

    if (result.kind === 'shop_inactive') {
      Errors.conflict(res, 'The merchant shop is currently not active.');
      return;
    }

    if (result.kind === 'insufficient_stock') {
      Errors.conflict(res, 'Insufficient stock available.');
      return;
    }

    // Publish event only after transaction commits
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
    if (isUniqueConstraintError(error)) {
      const existingMovement = await prisma.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: MovementType.RESERVE,
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
            movement_type: MovementType.RELEASE,
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

      // 2. Verify original reservation exists.
      const reserveMovement = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: MovementType.RESERVE,
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
          movement_type: MovementType.RELEASE,
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

    // Handle transaction results.
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
    if (isUniqueConstraintError(error)) {
      const existingRelease = await prisma.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: MovementType.RELEASE,
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

// ─── RECORD PICKUP ───────────────────────────────────────────────────────────

export async function recordPickup(
  req: Request,
  res: Response
): Promise<void> {
  const offerId = req.params.id as string;

  const parsed = PickupSchema.safeParse(req.body);

  if (!parsed.success) {
    Errors.badRequest(res, 'Invalid request body', {
      issues: parsed.error.flatten(),
    });
    return;
  }

  const { quantity, reservationId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Guard: check whether this reservation was already released (cannot pick up after release)
      const existingRelease = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: MovementType.RELEASE,
          },
        },
      });

      if (existingRelease) {
        return { kind: 'already_released' as const };
      }

      // 2. Check whether pickup was already recorded
      const existingPickup = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: MovementType.PICKUP,
          },
        },
      });

      if (existingPickup) {
        return {
          kind: 'duplicate' as const,
          matches: movementMatches(existingPickup, offerId, quantity),
        };
      }

      // 3. Verify original reservation exists
      const reserveMovement = await tx.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: MovementType.RESERVE,
          },
        },
      });

      if (!reserveMovement) {
        return { kind: 'reservation_not_found' as const };
      }

      if (!movementMatches(reserveMovement, offerId, quantity)) {
        return { kind: 'reservation_mismatch' as const };
      }

      // 4. Record pickup movement
      await tx.stockMovement.create({
        data: {
          offer_id: offerId,
          reservation_id: reservationId,
          movement_type: MovementType.PICKUP,
          quantity,
        },
      });

      // 5. Increment shop snapshot sales count
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        select: { shop_id: true },
      });

      if (offer?.shop_id) {
        await tx.shopSnapshot.update({
          where: { id: offer.shop_id },
          data: { sales_count: { increment: 1 } },
        });
      }

      return { kind: 'picked_up' as const };
    });

    if (result.kind === 'already_released') {
      Errors.conflict(res, 'This reservation was already cancelled and released; pickup cannot be recorded.');
      return;
    }

    if (result.kind === 'duplicate') {
      if (!result.matches) {
        Errors.conflict(
          res,
          'This reservation ID was already recorded with different pickup details.'
        );
        return;
      }

      res.json({
        data: {
          pickedUp: true,
          idempotent: true,
        },
      });
      return;
    }

    if (result.kind === 'reservation_not_found') {
      Errors.badRequest(
        res,
        'No matching reservation exists for this pickup.'
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

    logger.info('Stock pickup recorded successfully', {
      offerId,
      reservationId,
      quantity,
    });

    res.json({
      data: {
        pickedUp: true,
        idempotent: false,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingPickup = await prisma.stockMovement.findUnique({
        where: {
          reservation_id_movement_type: {
            reservation_id: reservationId,
            movement_type: MovementType.PICKUP,
          },
        },
      });

      if (existingPickup) {
        res.json({
          data: {
            pickedUp: true,
            idempotent: true,
          },
        });
        return;
      }
    }

    logger.error('recordPickup error', { error });
    Errors.internal(res);
  }
}
