// tests/unit/offerLifecycle.test.ts
// Tests exercising actual production schemas, controllers, and domain logic

import { Request, Response } from 'express';
import { OfferStatus, ProductType, MovementType } from '@prisma/client';
import { prisma } from '../../src/config/prisma';
import * as offerController from '../../src/controllers/offerController';
import * as stockController from '../../src/controllers/stockController';
import { AuthenticatedRequest } from '../../src/types';

// Mock publisher so no network or RabbitMQ is required
jest.mock('../../src/messaging/publisher', () => ({
  publishEvent: jest.fn().mockResolvedValue(true),
}));

// Mock prisma client methods
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
      create: jest.fn(),
    },
    stockMovement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    shopSnapshot: {
      findUnique: jest.fn(),
      update: jest.fn(),
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
  },
}));

function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('Offer Lifecycle, Stock & Verification Production Logic', () => {
  const dummyShopId = '11111111-1111-1111-1111-111111111111';
  const dummyCategoryId = '22222222-2222-2222-2222-222222222222';
  const dummyMerchantId = 'merchant-test-123';
  const dummyOfferId = 'offer-test-456';
  const dummyReservationId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Offer Creation & Draft Lifecycle ──────────────────────────────────────
  describe('createOffer controller', () => {
    test('creates offer in DRAFT status with valid input', async () => {
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
      const dayAfterTomorrow = new Date(Date.now() + 48 * 3600 * 1000);

      const req = {
        user: { merchantId: dummyMerchantId },
        body: {
          shopId: dummyShopId,
          categoryId: dummyCategoryId,
          name: 'Croissants artisanaux',
          description: 'Délicieux croissants pur beurre préparés le matin.',
          productType: 'FRESH',
          sameDayExpiry: false,
          originalPrice: 400,
          discountedPrice: 200,
          quantityAvailable: 5,
          expiresAt: tomorrow.toISOString(),
          productExpiryDate: dayAfterTomorrow.toISOString(),
        },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();

      (prisma.shopSnapshot.findUnique as jest.Mock).mockResolvedValue({
        id: dummyShopId,
        merchant_id: dummyMerchantId,
        status: 'ACTIVE',
      });
      (prisma.category.findUnique as jest.Mock).mockResolvedValue({
        id: dummyCategoryId,
        slug: 'bakeries',
      });
      (prisma.offer.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({
        id: dummyOfferId,
        merchant_id: dummyMerchantId,
        ...data,
        photos: [],
        category: { id: dummyCategoryId, slug: 'bakeries', name_fr: 'Boulangeries' },
        shop: { id: dummyShopId, name: 'Boulangerie Test' },
      }));

      await offerController.createOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prisma.offer.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: OfferStatus.DRAFT,
          product_type: ProductType.FRESH,
          discount_percent: 50,
        }),
      }));
    });

    test('rejects creation when discounted price is higher than original price', async () => {
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
      const req = {
        user: { merchantId: dummyMerchantId },
        body: {
          shopId: dummyShopId,
          categoryId: dummyCategoryId,
          name: 'Croissants artisanaux',
          description: 'Délicieux croissants pur beurre préparés le matin.',
          productType: 'FRESH',
          originalPrice: 200,
          discountedPrice: 300,
          quantityAvailable: 5,
          expiresAt: tomorrow.toISOString(),
          productExpiryDate: tomorrow.toISOString(),
        },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      await offerController.createOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'Discounted price must be strictly lower than the original price.',
        }),
      }));
    });

    test('rejects creation when pickup deadline is in the past', async () => {
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
      const req = {
        user: { merchantId: dummyMerchantId },
        body: {
          shopId: dummyShopId,
          categoryId: dummyCategoryId,
          name: 'Croissants artisanaux',
          description: 'Délicieux croissants pur beurre préparés le matin.',
          productType: 'FRESH',
          originalPrice: 400,
          discountedPrice: 200,
          quantityAvailable: 5,
          expiresAt: yesterday.toISOString(),
          productExpiryDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      await offerController.createOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── 2. Offer Submission Workflow ─────────────────────────────────────────────
  describe('submitOffer controller', () => {
    test('submitting PACKAGED offer without date label photo is rejected', async () => {
      const req = {
        params: { id: dummyOfferId },
        user: { merchantId: dummyMerchantId },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        merchant_id: dummyMerchantId,
        status: OfferStatus.DRAFT,
        product_type: ProductType.PACKAGED,
        date_photo_url: null, // missing date photo
        photos: [{ id: 'photo-1', url: 'http://img.jpg' }],
      });

      await offerController.submitOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'A date label photo is required for packaged products before submission.',
        }),
      }));
    });

    test('submitting offer without any product photos is rejected', async () => {
      const req = {
        params: { id: dummyOfferId },
        user: { merchantId: dummyMerchantId },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        merchant_id: dummyMerchantId,
        status: OfferStatus.DRAFT,
        product_type: ProductType.FRESH,
        photos: [], // 0 photos
      });

      await offerController.submitOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'At least one product photo must be uploaded before submitting.',
        }),
      }));
    });

    test('submitting valid FRESH offer transitions to PENDING_VERIFICATION', async () => {
      const req = {
        params: { id: dummyOfferId },
        user: { merchantId: dummyMerchantId },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        merchant_id: dummyMerchantId,
        status: OfferStatus.DRAFT,
        product_type: ProductType.FRESH,
        photos: [{ id: 'p1', url: 'http://img.jpg', sort_order: 0 }],
      });

      (prisma.offer.update as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        merchant_id: dummyMerchantId,
        status: OfferStatus.PENDING_VERIFICATION,
        product_type: ProductType.FRESH,
        photos: [{ id: 'p1', url: 'http://img.jpg', sort_order: 0 }],
      });

      await offerController.submitOffer(req, res);

      expect(prisma.offer.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: dummyOfferId },
        data: expect.objectContaining({
          status: OfferStatus.PENDING_VERIFICATION,
        }),
      }));
    });
  });

  // ── 3. Public Detail Visibility Filter ───────────────────────────────────────
  describe('getOfferById public visibility', () => {
    test('returns 404 for DRAFT offers to public visitors', async () => {
      const req = { params: { id: dummyOfferId } } as unknown as Request;
      const res = mockResponse();

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        status: OfferStatus.DRAFT,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      });

      await offerController.getOfferById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 404 for PENDING_VERIFICATION offers to public visitors', async () => {
      const req = { params: { id: dummyOfferId } } as unknown as Request;
      const res = mockResponse();

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        status: OfferStatus.PENDING_VERIFICATION,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      });

      await offerController.getOfferById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 404 for WITHDRAWN offers to public visitors', async () => {
      const req = { params: { id: dummyOfferId } } as unknown as Request;
      const res = mockResponse();

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        status: OfferStatus.WITHDRAWN,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
      });

      await offerController.getOfferById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('allows public access to ACTIVE future offers', async () => {
      const req = { params: { id: dummyOfferId } } as unknown as Request;
      const res = mockResponse();

      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        status: OfferStatus.ACTIVE,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        photos: [],
      });

      await offerController.getOfferById(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  // ── 4. Stock Reservation & Pickup Guards ─────────────────────────────────────
  describe('reserveStock controller', () => {
    test('rejects reservation if offer pickup deadline has passed', async () => {
      const pastDeadline = new Date(Date.now() - 3600 * 1000);
      const req = {
        params: { id: dummyOfferId },
        body: {
          quantity: 2,
          reservationId: '11111111-2222-3333-4444-555555555555',
        },
      } as unknown as Request;

      const res = mockResponse();

      (prisma.stockMovement.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
        id: dummyOfferId,
        status: OfferStatus.ACTIVE,
        expires_at: pastDeadline, // passed!
        product_expiry_date: new Date(Date.now() + 24 * 3600 * 1000),
        shop: { status: 'ACTIVE' },
      });

      await stockController.reserveStock(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'The pickup deadline for this offer has already passed.',
        }),
      }));
    });
  });

  describe('recordPickup controller', () => {
    test('rejects pickup when reservation was already released', async () => {
      const req = {
        params: { id: dummyOfferId },
        body: {
          quantity: 2,
          reservationId: dummyReservationId,
        },
      } as unknown as Request;

      const res = mockResponse();

      // Return a matching RELEASE movement
      (prisma.stockMovement.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.reservation_id_movement_type?.movement_type === MovementType.RELEASE) {
          return Promise.resolve({ id: 'rel-1', reservation_id: dummyReservationId });
        }
        return Promise.resolve(null);
      });

      await stockController.recordPickup(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          message: 'This reservation was already cancelled and released; pickup cannot be recorded.',
        }),
      }));
    });
  });
});
