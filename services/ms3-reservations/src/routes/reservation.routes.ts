// Full reservation router (customer & merchant)
import { Router, Request, Response } from 'express';
import { requireAuth, requireRole, BadRequestError, ForbiddenError, NotFoundError } from '@forsa/common';
import { prisma } from '../config/prisma';
import { ReservationService } from '../services/reservation.service';

export const createReservationRouter = (publicKey: string) => {
  const reservationRouter = Router();

  // Health check (already present in scaffold)
  reservationRouter.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'ms3-reservations', message: 'Reservation router mounted' });
  });

  // ------------------- Customer endpoints -------------------
  // Create reservation (customer)
  reservationRouter.post(
    '/',
    requireAuth(publicKey),
    requireRole('CUSTOMER'),
    async (req: Request, res: Response, next) => {
      try {
        const { shopId, offerId, quantity, unitPrice } = req.body;
        const user = req.user!;
        const reservation = await ReservationService.createReservation({
          customerId: user.sub,
          customerEmail: user.email,
          shopId,
          offerId,
          quantity,
          unitPrice,
        });
        res.status(201).json(reservation);
      } catch (err) {
        next(err);
      }
    },
  );

  // List customer's reservations
  reservationRouter.get(
    '/mine',
    requireAuth(publicKey),
    requireRole('CUSTOMER'),
    async (req: Request, res: Response, next) => {
      try {
        const user = req.user!;
        const reservations = await prisma.reservation.findMany({ where: { customerId: user.sub } });
        res.json(reservations);
      } catch (err) {
        next(err);
      }
    },
  );

  // Get a specific reservation (ownership check)
  reservationRouter.get(
    '/:id',
    requireAuth(publicKey),
    requireRole('CUSTOMER'),
    async (req: Request, res: Response, next) => {
      try {
        const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation) throw new NotFoundError('Reservation not found');
        if (reservation.customerId !== req.user!.sub) throw new ForbiddenError('Access denied');
        res.json(reservation);
      } catch (err) {
        next(err);
      }
    },
  );

  // Customer cancel reservation (allowed from PENDING or ACCEPTED)
  reservationRouter.post(
    '/:id/cancel',
    requireAuth(publicKey),
    requireRole('CUSTOMER'),
    async (req: Request, res: Response, next) => {
      try {
        const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation) throw new NotFoundError('Reservation not found');
        if (reservation.customerId !== req.user!.sub) throw new ForbiddenError('Access denied');
        await ReservationService.changeStatus({
          reservationId: reservation.id,
          toStatus: 'CANCELLED',
          actorId: req.user!.sub,
          actorRole: 'CUSTOMER',
        });
        res.sendStatus(204);
      } catch (err) {
        next(err);
      }
    },
  );

  // ------------------- Merchant endpoints -------------------
  // List reservations for merchant's shop
  reservationRouter.get(
    '/shop',
    requireAuth(publicKey),
    requireRole('MERCHANT'),
    async (req: Request, res: Response, next) => {
      try {
        const shopId = req.user!.shopId;
        if (!shopId) throw new BadRequestError('Merchant has no shopId');
        const reservations = await prisma.reservation.findMany({ where: { shopId } });
        res.json(reservations);
      } catch (err) {
        next(err);
      }
    },
  );

  // Shop reservation history (includes status history)
  reservationRouter.get(
    '/shop/history',
    requireAuth(publicKey),
    requireRole('MERCHANT'),
    async (req: Request, res: Response, next) => {
      try {
        const shopId = req.user!.shopId;
        if (!shopId) throw new BadRequestError('Merchant has no shopId');
        const reservations = await prisma.reservation.findMany({
          where: { shopId },
          include: { statusHistory: true },
        });
        res.json(reservations);
      } catch (err) {
        next(err);
      }
    },
  );

  // Merchant accept reservation
  reservationRouter.post(
    '/:id/accept',
    requireAuth(publicKey),
    requireRole('MERCHANT'),
    async (req: Request, res: Response, next) => {
      try {
        const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation) throw new NotFoundError('Reservation not found');
        if (reservation.shopId !== req.user!.shopId) throw new ForbiddenError('Reservation does not belong to this shop');
        await ReservationService.changeStatus({
          reservationId: reservation.id,
          toStatus: 'ACCEPTED',
          actorId: req.user!.shopId!,
          actorRole: 'MERCHANT',
        });
        res.sendStatus(204);
      } catch (err) {
        next(err);
      }
    },
  );

  // Merchant refuse reservation (optional reason)
  reservationRouter.post(
    '/:id/refuse',
    requireAuth(publicKey),
    requireRole('MERCHANT'),
    async (req: Request, res: Response, next) => {
      try {
        const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation) throw new NotFoundError('Reservation not found');
        if (reservation.shopId !== req.user!.shopId) throw new ForbiddenError('Reservation does not belong to this shop');
        const { reason } = req.body;
        await ReservationService.changeStatus({
          reservationId: reservation.id,
          toStatus: 'REFUSED',
          actorId: req.user!.shopId!,
          actorRole: 'MERCHANT',
          reason,
        });
        res.sendStatus(204);
      } catch (err) {
        next(err);
      }
    },
  );

  // Merchant pickup (canonical endpoint)
  reservationRouter.post(
    '/:id/pickup',
    requireAuth(publicKey),
    requireRole('MERCHANT'),
    async (req: Request, res: Response, next) => {
      try {
        const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
        if (!reservation) throw new NotFoundError('Reservation not found');
        if (reservation.shopId !== req.user!.shopId) throw new ForbiddenError('Reservation does not belong to this shop');
        await ReservationService.pickup(reservation.id, req.user!.shopId!);
        res.sendStatus(204);
      } catch (err) {
        next(err);
      }
    },
  );

  // Compatibility endpoint – reservationId in body
  reservationRouter.post(
    '/pickup',
    requireAuth(publicKey),
    requireRole('MERCHANT'),
    async (req: Request, res: Response, next) => {
      try {
        const { reservationId } = req.body;
        if (!reservationId) throw new BadRequestError('reservationId required');
        const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
        if (!reservation) throw new NotFoundError('Reservation not found');
        if (reservation.shopId !== req.user!.shopId) throw new ForbiddenError('Reservation does not belong to this shop');
        await ReservationService.pickup(reservation.id, req.user!.shopId!);
        res.sendStatus(204);
      } catch (err) {
        next(err);
      }
    },
  );
  return reservationRouter;
};

