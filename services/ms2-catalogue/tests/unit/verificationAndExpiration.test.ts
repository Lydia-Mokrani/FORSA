// tests/unit/verificationAndExpiration.test.ts
// Unit tests for timezone calculations, expiration job, stock adjustments, and verification rules

import { getAlgiersCalendarDate, isSameDayInAlgiers, getAlgiersEndOfDay } from '../../src/utils/timezone';
import { checkAndExpireOffers } from '../../src/jobs/expirationJob';
import { prisma } from '../../src/config/prisma';
import { OfferStatus, MovementType, ShopStatus } from '@prisma/client';
import * as offerController from '../../src/controllers/offerController';
import * as stockController from '../../src/controllers/stockController';
import { AuthenticatedRequest } from '../../src/types';
import { Response } from 'express';

// Mock publisher
jest.mock('../../src/messaging/publisher', () => ({
  publishEvent: jest.fn().mockResolvedValue(true),
}));

// Mock prisma
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    offer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    offerPhoto: {
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    stockMovement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
      create: jest.fn(),
    },
    shopSnapshot: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(prisma);
      }
      return Promise.all(callback);
    }),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('Timezone, Expiration & Advanced Business Rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Africa/Algiers Timezone Utilities', () => {
    test('formats dates according to Africa/Algiers timezone (UTC+1)', () => {
      // 2026-11-20 23:30 UTC is 2026-11-21 00:30 in Algeria
      const dateUtcLate = new Date('2026-11-20T23:30:00.000Z');
      expect(getAlgiersCalendarDate(dateUtcLate)).toBe('2026-11-21');

      // 2026-11-20 22:30 UTC is 2026-11-20 23:30 in Algeria
      const dateUtcEarlier = new Date('2026-11-20T22:30:00.000Z');
      expect(getAlgiersCalendarDate(dateUtcEarlier)).toBe('2026-11-20');
    });

    test('isSameDayInAlgiers accurately detects dates crossing UTC midnight', () => {
      // Both correspond to 2026-11-21 in Algeria
      const d1 = new Date('2026-11-20T23:30:00.000Z'); // 00:30 in Algeria on Nov 21
      const d2 = new Date('2026-11-21T10:00:00.000Z'); // 11:00 in Algeria on Nov 21
      expect(isSameDayInAlgiers(d1, d2)).toBe(true);

      // d3 is 2026-11-20 in Algeria
      const d3 = new Date('2026-11-20T21:00:00.000Z'); // 22:00 in Algeria on Nov 20
      expect(isSameDayInAlgiers(d1, d3)).toBe(false);
    });

    test('getAlgiersEndOfDay returns 22:59:59.999Z for that Algerian day', () => {
      const date = new Date('2026-11-20T12:00:00.000Z');
      const endOfDay = getAlgiersEndOfDay(date);
      expect(endOfDay.toISOString()).toBe('2026-11-20T22:59:59.999Z');
    });
  });

  describe('Expiration Job', () => {
    test('expires offers past their pickup deadline or product expiry date', async () => {
      const now = new Date('2026-11-20T15:00:00.000Z');

      (prisma.offer.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'offer-1', merchant_id: 'merchant-1' },
        ])
        .mockResolvedValueOnce([]); // No additional same-day candidates

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'offer-1', merchant_id: 'merchant-1' },
      ]);

      const expiredCount = await checkAndExpireOffers(now);
      expect(expiredCount).toBe(1);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    test('expires same-day offers past end of day in Algeria', async () => {
      // 23:05 UTC on Nov 20 is 00:05 on Nov 21 in Algeria (end of Nov 20 day has passed)
      const now = new Date('2026-11-20T23:05:00.000Z');

      (prisma.offer.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // Standard query finds none
        .mockResolvedValueOnce([
          // Same day offer set for Nov 20
          {
            id: 'same-day-offer',
            merchant_id: 'merchant-2',
            product_expiry_date: new Date('2026-11-20T21:00:00.000Z'),
          },
        ]);

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'same-day-offer', merchant_id: 'merchant-2' },
      ]);

      const count = await checkAndExpireOffers(now);
      expect(count).toBe(1);
    });
  });

  describe('Stock Adjustment Validation & Edge Cases', () => {
    test('rejects stock adjustment when reason is missing', async () => {
      const req = {
        params: { id: 'offer-1' },
        user: { merchantId: 'merchant-1' },
        body: {
          quantityDelta: 3,
          // reason omitted
        },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      await offerController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'BAD_REQUEST' }),
        })
      );
    });

    test('rejects stock adjustment when both quantityDelta and newQuantity are provided', async () => {
      const req = {
        params: { id: 'offer-1' },
        user: { merchantId: 'merchant-1' },
        body: {
          quantityDelta: 2,
          newQuantity: 5,
          reason: 'Restocked shelf',
        },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      await offerController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rejects stock adjustment with zero change', async () => {
      const req = {
        params: { id: 'offer-1' },
        user: { merchantId: 'merchant-1' },
        body: {
          quantityDelta: 0,
          reason: 'No change count',
        },
      } as unknown as AuthenticatedRequest;

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          id: 'offer-1',
          merchant_id: 'merchant-1',
          quantity_available: 5,
          quantity_initial: 5,
          status: OfferStatus.ACTIVE,
          expires_at: new Date(Date.now() + 3600000),
          product_expiry_date: new Date(Date.now() + 3600000),
          shop_id: 'shop-1',
        },
      ]);

      const res = mockResponse();
      await offerController.adjustStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Stock adjustment must result in a change to available quantity.',
          }),
        })
      );
    });
  });

  describe('Stock Release & Reactivation Safeguards', () => {
    test('rejects stock release if reservation was already picked up', async () => {
      const req = {
        params: { id: 'offer-1' },
        body: {
          reservationId: '11111111-1111-1111-1111-111111111111',
          quantity: 2,
        },
      } as any;

      (prisma.stockMovement.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // existingRelease: none
        .mockResolvedValueOnce({
          offer_id: 'offer-1',
          quantity: 2,
          movement_type: MovementType.PICKUP,
        }); // existingPickup: exists!

      const res = mockResponse();
      await stockController.releaseStock(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'This reservation was already confirmed as picked up; stock cannot be released.',
          }),
        })
      );
    });

    test('does not reactivate SOLD_OUT offer upon release if product expiry date has passed', async () => {
      const past = new Date(Date.now() - 3600 * 1000);
      const future = new Date(Date.now() + 24 * 3600 * 1000);

      const req = {
        params: { id: 'offer-1' },
        body: {
          reservationId: '11111111-1111-1111-1111-111111111111',
          quantity: 2,
        },
      } as any;

      (prisma.stockMovement.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // existingRelease: none
        .mockResolvedValueOnce(null) // existingPickup: none
        .mockResolvedValueOnce({
          offer_id: 'offer-1',
          quantity: 2,
          movement_type: MovementType.RESERVE,
        }); // reserveMovement: matches

      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: 'offer-1',
        status: OfferStatus.SOLD_OUT,
        expires_at: future,
        product_expiry_date: past, // Expired product!
        shop: { status: ShopStatus.ACTIVE },
        quantity_available: 0,
      });

      const res = mockResponse();
      await stockController.releaseStock(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: {
          released: true,
          idempotent: false,
        },
      });

      // Status must NOT have been updated to ACTIVE because product expired
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });

    test('does not reactivate SOLD_OUT offer upon release if merchant shop is inactive', async () => {
      const future = new Date(Date.now() + 24 * 3600 * 1000);

      const req = {
        params: { id: 'offer-1' },
        body: {
          reservationId: '11111111-1111-1111-1111-111111111111',
          quantity: 2,
        },
      } as any;

      (prisma.stockMovement.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // existingRelease: none
        .mockResolvedValueOnce(null) // existingPickup: none
        .mockResolvedValueOnce({
          offer_id: 'offer-1',
          quantity: 2,
          movement_type: MovementType.RESERVE,
        });

      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: 'offer-1',
        status: OfferStatus.SOLD_OUT,
        expires_at: future,
        product_expiry_date: future,
        shop: { status: ShopStatus.SUSPENDED }, // Shop suspended!
        quantity_available: 0,
      });

      const res = mockResponse();
      await stockController.releaseStock(req, res);

      expect(res.json).toHaveBeenCalledWith({
        data: {
          released: true,
          idempotent: false,
        },
      });

      // Status must NOT be updated to ACTIVE because shop is not ACTIVE
      expect(prisma.offer.update).not.toHaveBeenCalled();
    });
  });
});
