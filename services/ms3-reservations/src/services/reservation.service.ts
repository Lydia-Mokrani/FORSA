// Reservation service encapsulating business logic for MS3
import { prisma } from '../config/prisma';
import { MS2Service } from './ms2.service';
import { BadRequestError, ForbiddenError, ApiError } from '@forsa/common';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { publishReservationEvent } from './rabbitmq.service';
import { ReservationStatus } from '@prisma/client';

/**
 * Core service for reservations (MS3).
 *
 * • Concurrency‑safe status transitions using a conditional `updateMany`.
 * • No‑show increment is performed only when an ACCEPTED reservation expires –
 *   the transition guard prevents double counting.
 * • Stock‑release retries are limited to three attempts. Persistent failures are
 *   bubbled up; without an outbox we cannot guarantee eventual release – this is
 *   documented.
 * • Quantity and unitPrice are validated before any MS2 interaction.
 * • Pickup‑code uniqueness is enforced by the DB; on unique‑constraint violations
 *   the generation loop retries.
 * • MS2 contract is respected – pickupStart is mandatory, pickupEnd may fall
 *   back to expiresAt, but no dates are fabricated.
 */
export class ReservationService {
  // ---------------------------------------------------------------------------
  // Helper: generate a unique pickup code like "FRS-XXXXXX"
  private static generatePickupCode(): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      const idx = crypto.randomInt(0, charset.length);
      code += charset[idx];
    }
    return `FRS-${code}`;
  }

  // ---------------------------------------------------------------------------
  // Helper: ensure the customer is not blocked (blockedUntil validation)
  private static async canCreateReservation(customerId: string): Promise<void> {
    const record = await prisma.customerNoShow.findUnique({ where: { customerId } });
    if (
      record &&
      record.totalNoShows >= 5 &&
      record.blockedUntil &&
      record.blockedUntil > new Date()
    ) {
      throw new ForbiddenError('Customer is suspended from creating reservations');
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: increment no‑show counter and apply 7‑day block when threshold is met
  private static async incrementNoShow(customerId: string): Promise<void> {
    const now = new Date();
    const existing = await prisma.customerNoShow.findUnique({ where: { customerId } });
    if (existing) {
      const updates: any = { totalNoShows: { increment: 1 }, lastNoShowAt: now };
      if (existing.totalNoShows + 1 >= 5) {
        updates.blockedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      await prisma.customerNoShow.update({ where: { customerId }, data: updates });
    } else {
      await prisma.customerNoShow.create({ data: { customerId, totalNoShows: 1, lastNoShowAt: now } });
    }
  }

  // ---------------------------------------------------------------------------
  // Create a reservation (status PENDING). Must not fabricate pickup dates.
  static async createReservation(data: {
    customerId: string;
    customerEmail: string;
    shopId: string;
    offerId: string;
    quantity: number;
    unitPrice: string; // Decimal string
  }) {
    const { customerId, customerEmail, shopId, offerId, quantity, unitPrice } = data;

    // 0. Validate numeric inputs
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestError('Quantity must be a positive number');
    }
    const priceNum = Number(unitPrice);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      throw new BadRequestError('unitPrice must be a non‑negative decimal string');
    }

    // 1. Validate customer block status
    await this.canCreateReservation(customerId);

    // 2. Fetch offer – pickupStart is mandatory, pickupEnd may be missing (fallback to expiresAt)
    const offer = await MS2Service.fetchOffer(offerId);
    if (!offer.pickupStart) {
      throw new BadRequestError('MS2 does not provide pickupStart – integration blocker');
    }
    const pickupEndRaw = offer.pickupEnd ?? offer.expiresAt;
    if (!pickupEndRaw) {
      throw new BadRequestError('MS2 does not provide pickupEnd or expiresAt – integration blocker');
    }
    const pickupStart = new Date(offer.pickupStart);
    const pickupEnd = new Date(pickupEndRaw);

    // 3. Reserve stock in MS2 (idempotent)
    const reservationId = crypto.randomUUID();
    try {
      await MS2Service.reserveStock(offerId, reservationId, quantity);
    } catch (e) {
      throw new BadRequestError('Failed to reserve stock in MS2: ' + (e as any).message);
    }

    // 4. Generate a unique pickup code – loop until DB uniqueness confirmed
    let pickupCode: string | undefined;
    for (let i = 0; i < 5; i++) {
      const candidate = this.generatePickupCode();
      const exists = await prisma.reservation.findUnique({ where: { pickupCode: candidate } });
      if (!exists) {
        pickupCode = candidate;
        break;
      }
    }
    if (!pickupCode) {
      await MS2Service.releaseStock(offerId, reservationId, quantity);
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Unable to generate unique pickup code');
    }

    // 5. Generate QR code – failure aborts creation and releases stock
    let qrCodeData: string;
    try {
      qrCodeData = await QRCode.toDataURL(pickupCode);
    } catch (e) {
      await MS2Service.releaseStock(offerId, reservationId, quantity);
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'QR code generation failed');
    }

    // 6. Persist reservation (status PENDING). Retry on unique‑constraint collisions.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const reservation = await prisma.reservation.create({
          data: {
            id: reservationId,
            customerId,
            customerEmail,
            shopId,
            offerId,
            quantity,
            totalPrice: (priceNum * quantity).toFixed(2),
            status: 'PENDING',
            pickupCode,
            qrCodeData,
            pickupStart,
            pickupEnd,
          },
        });
        // Emit creation event (best‑effort)
        try {
          await publishReservationEvent('reservation.created', {
            reservationId,
            customerId,
            shopId,
            offerId,
            quantity,
            code: pickupCode,
          });
        } catch (_) { }
        return reservation;
      } catch (e: any) {
        if (e?.code === 'P2002' && e?.meta?.target?.includes('pickupCode')) {
          // Collision – generate a new code and retry
          pickupCode = this.generatePickupCode();
          continue;
        }
        // Other DB error – roll back stock
        try {
          await MS2Service.releaseStock(offerId, reservationId, quantity);
        } catch (_) { }
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Database error while creating reservation');
      }
    }
    // Exhausted retries – cleanup and fail
    await MS2Service.releaseStock(offerId, reservationId, quantity);
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create reservation after retries');
  }

  // ---------------------------------------------------------------------------
  // Change reservation status, record history, handle stock release and no‑show logic.
  static async changeStatus(params: {
    reservationId: string;
    toStatus: ReservationStatus;
    actorId: string;
    actorRole: string;
    reason?: string;
  }) {
    const { reservationId, toStatus, actorId, actorRole, reason } = params;

    // Fetch current reservation (needed for validation and data)
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new BadRequestError('Reservation not found');

    // Validate allowed transitions
    const allowed: Record<string, ReservationStatus[]> = {
      PENDING: ['ACCEPTED', 'REFUSED', 'CANCELLED', 'EXPIRED'],
      ACCEPTED: ['PICKED_UP', 'CANCELLED', 'EXPIRED'],
    };
    const current = reservation.status;
    if (!allowed[current] || !allowed[current].includes(toStatus)) {
      throw new ForbiddenError(`Transition from ${current} to ${toStatus} not allowed`);
    }

    const now = new Date();
    const updateData: any = { status: toStatus };
    if (toStatus === 'ACCEPTED') updateData.acceptedAt = now;
    if (toStatus === 'REFUSED') updateData.refusedAt = now;
    if (toStatus === 'CANCELLED') updateData.cancelledAt = now;
    if (toStatus === 'PICKED_UP') updateData.pickedUpAt = now;
    if (toStatus === 'EXPIRED') updateData.expiredAt = now;
    if (reason) updateData.refusalReason = reason;

    // Perform the conditional status update, status‑history creation, and no‑show increment inside a Prisma transaction.
    await prisma.$transaction(async (tx: any) => {
      // Conditional status update ensures we only modify if the current status matches expected
      const updateResult = await tx.reservation.updateMany({
        where: { id: reservationId, status: current },
        data: updateData,
      });
      if (updateResult.count !== 1) {
        // Another concurrent update changed the status – abort transaction
        throw new BadRequestError('Reservation status changed concurrently');
      }

      // Record status history after successful status change
      await tx.reservationStatusHistory.create({
        data: {
          reservationId,
          fromStatus: current,
          toStatus,
          reason,
          actorId,
          actorRole,
        },
      });

      // Increment no‑show only when transitioning from ACCEPTED to EXPIRED
      if (toStatus === 'EXPIRED' && current === 'ACCEPTED') {
        const now = new Date();
        const existing = await tx.customerNoShow.findUnique({ where: { customerId: reservation.customerId } });
        if (existing) {
          const updates: any = { totalNoShows: { increment: 1 }, lastNoShowAt: now };
          if (existing.totalNoShows + 1 >= 5) {
            updates.blockedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          }
          await tx.customerNoShow.update({ where: { customerId: reservation.customerId }, data: updates });
        } else {
          await tx.customerNoShow.create({ data: { customerId: reservation.customerId, totalNoShows: 1, lastNoShowAt: now } });
        }
      }
    });

    // Emit event (best‑effort) after the transaction has committed
    try {
      await publishReservationEvent(`reservation.${toStatus.toLowerCase()}`, {
        reservationId,
        customerId: reservation.customerId,
        shopId: reservation.shopId,
        offerId: reservation.offerId,
      });
    } catch (_) { }

    // Release stock for terminal states – retry up to 3 times (idempotent).
    // Persistent failures are bubbled; we cannot guarantee eventual release without an outbox.
    if (['REFUSED', 'CANCELLED', 'EXPIRED'].includes(toStatus)) {
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          await MS2Service.releaseStock(reservation.offerId, reservation.id, reservation.quantity);
          break; // success
        } catch (e) {
          if (attempt === maxAttempts - 1) {
            throw e; // bubble after final attempt
          }
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
        }
      }
    }

    return true;
  }
  // Validate pickup using the QR code / pickup code
  // Expire overdue PENDING/ACCEPTED reservations past pickupEnd
  static async expireOverdueReservations(): Promise<number> {
    const now = new Date();
    const overdue = await prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'ACCEPTED'] },
        pickupEnd: { lt: now },
      },
    });

    let expired = 0;
    for (const reservation of overdue) {
      try {
        await this.changeStatus({
          reservationId: reservation.id,
          toStatus: 'EXPIRED',
          actorId: 'ms3-reservations',
          actorRole: 'SYSTEM',
          reason: 'DEADLINE_PASSED',
        });
        expired++;
      } catch (e) {
        console.error(`Failed to expire reservation ${reservation.id}:`, e);
      }
    }
    return expired;
  }

  static async pickupByCode(pickupCode: string, merchantId: string) {
    if (!pickupCode || typeof pickupCode !== 'string') {
      throw new BadRequestError('Pickup code is required');
    }

    const reservation = await prisma.reservation.findUnique({
      where: { pickupCode },
    });

    if (!reservation) {
      throw new BadRequestError('Invalid pickup code');
    }

    if (reservation.shopId !== merchantId) {
      throw new ForbiddenError('Reservation does not belong to this shop');
    }

    return this.pickup(reservation.id, merchantId);
  }


  // ---------------------------------------------------------------------------
  // Pick‑up endpoint – only ACCEPTED reservations may be picked up.
  static async pickup(reservationId: string, merchantId: string) {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new BadRequestError('Reservation not found');
    if (reservation.shopId !== merchantId) throw new ForbiddenError('Reservation does not belong to this shop');
    if (reservation.status !== 'ACCEPTED') throw new ForbiddenError('Only ACCEPTED reservations can be picked up');

    if (!reservation.pickupStart || !reservation.pickupEnd) {
      throw new BadRequestError('Pickup window not defined – integration blocker');
    }
    const now = new Date();
    if (now < reservation.pickupStart) throw new ForbiddenError('Pickup not yet allowed');
    if (now > reservation.pickupEnd) throw new ForbiddenError('Pickup window has passed');

    await this.changeStatus({
      reservationId,
      toStatus: 'PICKED_UP',
      actorId: merchantId,
      actorRole: 'MERCHANT',
    });
    return true;
  }
}
