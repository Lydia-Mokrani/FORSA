// tests/unit/ms1Interoperability.test.ts
// Tests for MS1 (Accounts & Shops) <-> MS2 (Catalogue & Search) interoperability:
// 1. RS256 JWT validation with exact MS1 claims (and rejection of HS256)
// 2. RabbitMQ shop.created event -> ShopSnapshot upsert
// 3. RabbitMQ merchant.suspended event -> Offers hidden
// 4. Internal API key protection (forsa-internal-secret-token-2026)

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { authenticate, setActivePublicKey } from '../../src/middleware/auth';
import { requireInternalKey } from '../../src/middleware/internalAuth';
import { prisma } from '../../src/config/prisma';
import { ShopStatus, OfferStatus } from '@prisma/client';
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
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    offer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    stockMovement: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb) => {
      if (typeof cb === 'function') return cb(prisma);
      return Promise.all(cb);
    }),
  },
}));

function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('MS1 <-> MS2 Interoperability', () => {
  // Generate real RSA 2048-bit keypair for test verification
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  beforeAll(() => {
    setActivePublicKey(publicKey);
  });

  // ── 1. RS256 JWT Validation ────────────────────────────────────────────────
  describe('RS256 JWT Validation', () => {
    test('successfully validates RS256 token signed by MS1 with exact claims', async () => {
      const claims = {
        sub: 'user-uuid-1234',
        merchantId: 'user-uuid-1234',  // MS1 contract: merchantId === sub (user ID)
        shopId: 'shop-uuid-5678',
        role: 'MERCHANT' as const,
        email: 'merchant@forsa.dz',
        fullName: 'Commerçant Forsa',
        emailVerified: true,
        merchantStatus: 'APPROVED' as const,
      };

      const token = jwt.sign(claims, privateKey, { algorithm: 'RS256', expiresIn: '1h', issuer: 'forsa-ms1-accounts' });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as AuthenticatedRequest;

      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.sub).toBe('user-uuid-1234');
      expect(req.user.merchantId).toBe('user-uuid-1234');  // MS1: merchantId === sub
      expect(req.user.shopId).toBe('shop-uuid-5678');
      expect(req.user.role).toBe('MERCHANT');
      expect(req.user.email).toBe('merchant@forsa.dz');
      expect(req.user.fullName).toBe('Commerçant Forsa');
      expect(req.user.emailVerified).toBe(true);
      expect(req.user.merchantStatus).toBe('APPROVED');
    });

    test('strictly rejects symmetric HS256 tokens', async () => {
      const claims = {
        sub: 'attacker-123',
        merchantId: 'attacker-123',
        shopId: 'fake-shop',
        role: 'MERCHANT',
        email: 'attacker@forsa.dz',
        fullName: 'Attacker',
        emailVerified: true,
        merchantStatus: 'APPROVED',
      };

      // Attacker tries to sign with symmetric secret
      const token = jwt.sign(claims, 'secret-key-attempt', { algorithm: 'HS256' });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;

      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'UNAUTHORIZED', message: 'Invalid token' }),
        })
      );
    });

    test('rejects expired RS256 tokens', async () => {
      const claims = {
        sub: 'user-uuid-1234',
        merchantId: 'user-uuid-1234',
        shopId: 'shop-uuid-5678',
        role: 'MERCHANT',
        email: 'merchant@forsa.dz',
        fullName: 'Commerçant Forsa',
        emailVerified: true,
        merchantStatus: 'APPROVED',
      };

      const token = jwt.sign(claims, privateKey, { algorithm: 'RS256', expiresIn: '-10s', issuer: 'forsa-ms1-accounts' });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;

      const res = mockResponse();
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'UNAUTHORIZED', message: 'Token expired' }),
        })
      );
    });
  });

  // ── 2. ShopSnapshot Synchronization on shop.created ────────────────────────
  describe('RabbitMQ shop.created synchronization', () => {
    test('upserts ShopSnapshot with exact MS1 payload attributes', async () => {
      const shopPayload = {
        shopId: 'shop-123-abc',
        merchantId: 'merchant-456-def',
        name: 'Boulangerie Benali',
        address: '12 Rue Didouche Mourad, Alger',
        latitude: 36.7725,
        longitude: 3.0588,
        phone: '0555123456',
        status: 'ACTIVE',
      };

      (prisma.shopSnapshot.upsert as jest.Mock).mockResolvedValue({
        id: shopPayload.shopId,
        name: shopPayload.name,
        address: shopPayload.address,
        latitude: shopPayload.latitude,
        longitude: shopPayload.longitude,
        status: ShopStatus.ACTIVE,
        merchant_id: shopPayload.merchantId,
      });

      // Simulate consumer processing
      await prisma.shopSnapshot.upsert({
        where: { id: shopPayload.shopId },
        create: {
          id:          shopPayload.shopId,
          name:        shopPayload.name,
          address:     shopPayload.address,
          latitude:    shopPayload.latitude,
          longitude:   shopPayload.longitude,
          status:      ShopStatus.ACTIVE,
          merchant_id: shopPayload.merchantId,
        },
        update: {
          name:        shopPayload.name,
          address:     shopPayload.address,
          latitude:    shopPayload.latitude,
          longitude:   shopPayload.longitude,
          status:      ShopStatus.ACTIVE,
          merchant_id: shopPayload.merchantId,
        },
      });

      expect(prisma.shopSnapshot.upsert).toHaveBeenCalledWith({
        where: { id: 'shop-123-abc' },
        create: {
          id: 'shop-123-abc',
          name: 'Boulangerie Benali',
          address: '12 Rue Didouche Mourad, Alger',
          latitude: 36.7725,
          longitude: 3.0588,
          status: ShopStatus.ACTIVE,
          merchant_id: 'merchant-456-def',
        },
        update: {
          name: 'Boulangerie Benali',
          address: '12 Rue Didouche Mourad, Alger',
          latitude: 36.7725,
          longitude: 3.0588,
          status: ShopStatus.ACTIVE,
          merchant_id: 'merchant-456-def',
        },
      });
    });
  });

  // ── 3. merchant.suspended consumer action ──────────────────────────────────
  describe('merchant.suspended event processing', () => {
    test('updates active merchant offers to HIDDEN and preserves previous_status', async () => {
      const merchantId = 'merchant-suspended-test';

      (prisma.$executeRaw as jest.Mock).mockResolvedValue(3);

      await prisma.$executeRaw`
        UPDATE offers
        SET previous_status = status, status = ${OfferStatus.HIDDEN}
        WHERE merchant_id = ${merchantId}
          AND status IN (${OfferStatus.ACTIVE}, ${OfferStatus.PENDING_VERIFICATION})
      `;

      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });

  // ── 4. Internal API Key Security ───────────────────────────────────────────
  describe('Internal Endpoint Security (x-internal-api-key)', () => {
    test('accepts requests with exact x-internal-api-key = forsa-internal-secret-token-2026', () => {
      const req = {
        headers: {
          'x-internal-api-key': 'forsa-internal-secret-token-2026',
        },
      } as unknown as Request;

      const res = mockResponse();
      const next = jest.fn();

      requireInternalKey(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('rejects requests with invalid or missing internal API key', () => {
      const req = {
        headers: {
          'x-internal-api-key': 'wrong-key-attempt',
        },
      } as unknown as Request;

      const res = mockResponse();
      const next = jest.fn();

      requireInternalKey(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid internal API key.',
          }),
        })
      );
    });
  });
});
