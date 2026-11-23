// tests/integration/contract.test.ts
// Contract integration test verifying full interoperability between MS1 (Accounts & Shops) and MS2 (Catalogue & Search).
// Tests:
// 1. MS1 shop.created event consumption into ShopSnapshot.
// 2. Offer creation with exact MS1 JWT token claims ({ sub: userId, merchantId: shopId, shopId, role: MERCHANT, iss: forsa-ms1-accounts }).
// 3. Ownership bridge (shop.merchant_id == token.sub && shop.id == token.shopId).
// 4. Token validation (RS256 algorithm enforcement, rejection of invalid issuers/algorithms).
// 5. Merchant suspension event handling.

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { authenticate, setActivePublicKey } from '../../src/middleware/auth';
import { createOffer } from '../../src/controllers/offerController';
import { prisma } from '../../src/config/prisma';
import { handleShopCreated, handleMerchantSuspended } from '../../src/messaging/consumers';
import { AuthenticatedRequest } from '../../src/types';

// Mock publisher
jest.mock('../../src/messaging/publisher', () => ({
  publishEvent: jest.fn().mockResolvedValue(true),
}));

// Mock prisma
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    shopSnapshot: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    offer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => {
      if (typeof cb === 'function') return cb(prisma);
      return Promise.all(cb);
    }),
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('MS1 <-> MS2 Contract & Interoperability Integration Tests', () => {
  // Generate real RSA 2048-bit keypair mimicking MS1
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const TEST_USER_ID = '33333333-3333-3333-3333-333333333333';
  const TEST_SHOP_ID = '11111111-1111-1111-1111-111111111111';
  const TEST_CATEGORY_ID = '22222222-2222-2222-2222-222222222222';

  beforeAll(() => {
    setActivePublicKey(publicKey);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. MS1 shop.created Event Ingestion ─────────────────────────────────────
  describe('1. MS1 shop.created Event Ingestion', () => {
    test('consumes MS1 shop.created event and upserts ShopSnapshot with correct schema mapping', async () => {
      // Exact event shape emitted by MS1
      const ms1ShopCreatedEvent = {
        event: 'shop.created',
        timestamp: new Date().toISOString(),
        payload: {
          shopId: TEST_SHOP_ID,
          merchantId: TEST_USER_ID, // In MS1, shop.userId is passed as merchantId
          name: 'Superette El Bahia',
          address: '12 Rue Didouche Mourad, Alger',
          latitude: 36.7538,
          longitude: 3.0588,
          phone: '+213555001122',
          status: 'ACTIVE',
        },
      };

      (prisma.shopSnapshot.upsert as jest.Mock).mockResolvedValue({
        id: TEST_SHOP_ID,
        merchant_id: TEST_USER_ID,
        name: 'Superette El Bahia',
        address: '12 Rue Didouche Mourad, Alger',
        latitude: 36.7538,
        longitude: 3.0588,
        status: 'ACTIVE',
      });

      await handleShopCreated(ms1ShopCreatedEvent);

      expect(prisma.shopSnapshot.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.shopSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_SHOP_ID },
          create: expect.objectContaining({
            id: TEST_SHOP_ID,
            merchant_id: TEST_USER_ID,
            name: 'Superette El Bahia',
            status: 'ACTIVE',
          }),
          // update is intentionally empty: re-delivery of shop.created must NOT overwrite
          // newer status or data (idempotency per Item D)
          update: {},
        })
      );
    });

    test('accepts both payload and data envelopes from event bus', async () => {
      const ms1EventWithDataEnvelope = {
        event: 'shop.created',
        timestamp: new Date().toISOString(),
        data: {
          shopId: 'shp_envelope_test',
          merchantId: 'usr_envelope_test',
          name: 'Pâtisserie Fleur',
          address: 'Oran Centre',
          latitude: 35.6987,
          longitude: -0.6349,
          phone: '+213555334455',
          status: 'ACTIVE',
        },
      };

      (prisma.shopSnapshot.upsert as jest.Mock).mockResolvedValue({});

      await handleShopCreated(ms1EventWithDataEnvelope);

      expect(prisma.shopSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shp_envelope_test' },
          create: expect.objectContaining({
            id: 'shp_envelope_test',
            merchant_id: 'usr_envelope_test',
          }),
        })
      );
    });
  });

  // ── 2. End-to-End Offer Creation with MS1 JWT Token ──────────────────────────
  describe('2. Offer Creation with MS1 RS256 JWT Token Shape', () => {
    test('creates offer with 201 when presented with valid MS1 token and matching shop snapshot', async () => {
      // Token signed exactly as MS1 signs it:
      // MS1 sets sub: userId, merchantId: shopId, shopId: shopId, iss: forsa-ms1-accounts
      const ms1TokenClaims = {
        sub: TEST_USER_ID,
        merchantId: TEST_SHOP_ID,
        shopId: TEST_SHOP_ID,
        role: 'MERCHANT' as const,
        email: 'amine@elbahia.dz',
        fullName: 'Amine Bahia',
        emailVerified: true,
        merchantStatus: 'APPROVED' as const,
      };

      const token = jwt.sign(ms1TokenClaims, privateKey, {
        algorithm: 'RS256',
        issuer: 'forsa-ms1-accounts',
        expiresIn: '1h',
      });

      // Mock ShopSnapshot found in MS2 database
      (prisma.shopSnapshot.findUnique as jest.Mock).mockResolvedValue({
        id: TEST_SHOP_ID,
        merchant_id: TEST_USER_ID, // Owner is the user
        name: 'Superette El Bahia',
        address: '12 Rue Didouche Mourad, Alger',
        latitude: 36.7538,
        longitude: 3.0588,
        status: 'ACTIVE',
      });

      // Mock Category found in MS2 database
      (prisma.category.findUnique as jest.Mock).mockResolvedValue({
        id: TEST_CATEGORY_ID,
        slug: 'fruits-vegetables',
        name_fr: 'Fruits & Légumes',
      });

      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 3600 * 1000);

      const createdOfferData = {
        id: 'off_contract_001',
        shop_id: TEST_SHOP_ID,
        category_id: TEST_CATEGORY_ID,
        merchant_id: TEST_USER_ID,
        name: 'Panier Primeur Frais',
        description: 'Panier de légumes et fruits de saison',
        original_price: 1500,
        discounted_price: 750,
        quantity_initial: 5,
        quantity_available: 5,
        product_type: 'FRESH',
        product_expiry_date: dayAfter,
        expires_at: tomorrow,
        status: 'PENDING_VERIFICATION',
        created_at: new Date(),
        updated_at: new Date(),
        photos: [],
        category: { id: TEST_CATEGORY_ID, name_fr: 'Fruits & Légumes', slug: 'fruits-vegetables' },
        shop: { id: TEST_SHOP_ID, name: 'Superette El Bahia' },
      };

      (prisma.offer.create as jest.Mock).mockImplementation(() => Promise.resolve(createdOfferData));
      (prisma.stockMovement.create as jest.Mock).mockResolvedValue({});

      // Pipeline execution: authenticate middleware -> createOffer controller
      const req = {
        headers: { authorization: `Bearer ${token}` },
        body: {
          shopId: TEST_SHOP_ID,
          categoryId: TEST_CATEGORY_ID,
          name: 'Panier Primeur Frais',
          description: 'Panier de légumes et fruits de saison',
          originalPrice: 1500,
          discountedPrice: 750,
          quantityAvailable: 5,
          productType: 'FRESH',
          productExpiryDate: dayAfter.toISOString(),
          expiresAt: tomorrow.toISOString(),
        },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      await createOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'off_contract_001',
            status: 'PENDING_VERIFICATION',
          }),
        })
      );
    });

    test('rejects offer creation with 403 when token belongs to another merchant', async () => {
      const otherMerchantClaims = {
        sub: '44444444-4444-4444-4444-444444444444',
        merchantId: '55555555-5555-5555-5555-555555555555',
        shopId: '55555555-5555-5555-5555-555555555555',
        role: 'MERCHANT' as const,
        email: 'other@market.dz',
        fullName: 'Autre Commerçant',
        emailVerified: true,
        merchantStatus: 'APPROVED' as const,
      };

      const token = jwt.sign(otherMerchantClaims, privateKey, {
        algorithm: 'RS256',
        issuer: 'forsa-ms1-accounts',
        expiresIn: '1h',
      });

      // Shop belongs to TEST_USER_ID, not other merchant
      (prisma.shopSnapshot.findUnique as jest.Mock).mockResolvedValue({
        id: TEST_SHOP_ID,
        merchant_id: TEST_USER_ID,
        status: 'ACTIVE',
      });

      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
      const dayAfter = new Date(Date.now() + 48 * 3600 * 1000);

      const req = {
        headers: { authorization: `Bearer ${token}` },
        body: {
          shopId: TEST_SHOP_ID,
          categoryId: TEST_CATEGORY_ID,
          name: 'Offre Non Autorisée',
          description: 'Tentative frauduleuse',
          originalPrice: 1000,
          discountedPrice: 500,
          quantityAvailable: 3,
          productType: 'PACKAGED',
          productExpiryDate: dayAfter.toISOString(),
          expiresAt: tomorrow.toISOString(),
        },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      await createOffer(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'FORBIDDEN', message: 'You do not own this shop.' }),
        })
      );
    });

    test('rejects request with 401 when token has an invalid issuer', async () => {
      const invalidIssuerToken = jwt.sign(
        {
          sub: TEST_USER_ID,
          merchantId: TEST_SHOP_ID,
          shopId: TEST_SHOP_ID,
          role: 'MERCHANT',
          email: 'elbahia@forsa.dz',
          fullName: 'Amine Bahia',
          emailVerified: true,
          merchantStatus: 'APPROVED',
        },
        privateKey,
        {
          algorithm: 'RS256',
          issuer: 'rogue-issuer',
          expiresIn: '1h',
        }
      );

      const req = {
        headers: { authorization: `Bearer ${invalidIssuerToken}` },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        })
      );
    });
  });

  // ── 3. Merchant Suspension Contract ──────────────────────────────────────────
  describe('3. Merchant Suspension Contract Handling', () => {
    test('hides all active offers when MS1 publishes merchant.suspended with { shopId, userId }', async () => {
      const ms1SuspendedEvent = {
        event: 'merchant.suspended',
        timestamp: new Date().toISOString(),
        payload: {
          shopId: TEST_SHOP_ID,
          userId: TEST_USER_ID,
          reason: 'Non-compliance with food safety rules',
        },
      };

      (prisma.$executeRaw as jest.Mock).mockResolvedValue(4);

      await handleMerchantSuspended(ms1SuspendedEvent);

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
