import { jwtService, TokenPayload } from '../../src/services/jwt.service';
import crypto from 'crypto';

describe('JwtService - Unit Tests', () => {
  const sampleMerchantPayload: TokenPayload = {
    sub: 'usr_test_merchant_123',
    email: 'boulangerie.forsa@test.dz',
    role: 'MERCHANT',
    fullName: 'Ahmed Boulanger',
    emailVerified: true,
    phoneVerified: true,
    shopId: 'shop_test_boulangerie_456',
    merchantId: 'shop_test_boulangerie_456',
    shopStatus: 'APPROVED',
    merchantStatus: 'APPROVED',
  };

  const sampleClientPayload: TokenPayload = {
    sub: 'usr_test_client_789',
    email: 'client.forsa@test.dz',
    role: 'CUSTOMER',
    fullName: 'Yacine Client',
    emailVerified: false,
    phoneVerified: false,
    shopId: null,
    merchantId: null,
    shopStatus: null,
    merchantStatus: null,
  };

  describe('getPublicKey', () => {
    it('doit retourner une clé publique RSA valide au format PEM', () => {
      const publicKey = jwtService.getPublicKey();
      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
    });
  });

  describe('generateAccessToken & verifyAccessToken', () => {
    it('doit générer un token RS256 valide contenant toutes les claims Commerçant (aligné avec MS2)', () => {
      const token = jwtService.generateAccessToken(sampleMerchantPayload);

      // Structure d'un JWT : header.payload.signature
      const parts = token.split('.');
      expect(parts.length).toBe(3);

      // Vérification et décodage
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded.sub).toBe(sampleMerchantPayload.sub);
      expect(decoded.email).toBe(sampleMerchantPayload.email);
      expect(decoded.role).toBe('MERCHANT');
      expect(decoded.fullName).toBe(sampleMerchantPayload.fullName);
      expect(decoded.emailVerified).toBe(true);
      expect(decoded.phoneVerified).toBe(true);

      // Vérification des claims d'intégration MS2
      expect(decoded.merchantId).toBe(sampleMerchantPayload.shopId);
      expect(decoded.shopId).toBe(sampleMerchantPayload.shopId);
      expect(decoded.merchantStatus).toBe('APPROVED');
      expect(decoded.shopStatus).toBe('APPROVED');
    });

    it('doit générer un token pour un Client avec des claims boutique nulles', () => {
      const token = jwtService.generateAccessToken(sampleClientPayload);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded.sub).toBe(sampleClientPayload.sub);
      expect(decoded.role).toBe('CUSTOMER');
      expect(decoded.merchantId).toBeNull();
      expect(decoded.shopId).toBeNull();
      expect(decoded.merchantStatus).toBeNull();
    });

    it('doit rejeter un token altéré (signature invalide)', () => {
      const token = jwtService.generateAccessToken(sampleMerchantPayload);
      const parts = token.split('.');

      // Modification malveillante du payload (Base64)
      const fakePayload = Buffer.from(
        JSON.stringify({ ...sampleMerchantPayload, role: 'ADMIN' })
      ).toString('base64url');

      const tamperedToken = `${parts[0]}.${fakePayload}.${parts[2]}`;

      expect(() => {
        jwtService.verifyAccessToken(tamperedToken);
      }).toThrow();
    });

    it('doit rejeter un token signé avec une autre clé RSA', () => {
      // Génération d'une paire de clés étrangère
      const otherKeyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const foreignJwt = require('jsonwebtoken').sign(
        sampleMerchantPayload,
        otherKeyPair.privateKey,
        { algorithm: 'RS256', issuer: 'forsa-ms1-accounts' }
      );

      expect(() => {
        jwtService.verifyAccessToken(foreignJwt);
      }).toThrow();
    });
  });

  describe('generateRefreshToken & hashToken', () => {
    it('doit générer un raw token aléatoire et son empreinte SHA-256 correspondante', () => {
      const { token, hash } = jwtService.generateRefreshToken();

      // 40 bytes aléatoires hex = 80 caractères
      expect(token).toBeDefined();
      expect(token.length).toBe(80);

      // Empreinte SHA-256 = 64 caractères hex
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);

      // Le hash doit correspondre exactement au SHA-256 du token
      const expectedHash = crypto.createHash('sha256').update(token).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('hashToken doit être déterministe', () => {
      const raw = 'test-refresh-token-fixed-string-12345';
      const hash1 = jwtService.hashToken(raw);
      const hash2 = jwtService.hashToken(raw);

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(crypto.createHash('sha256').update(raw).digest('hex'));
    });

    it('deux appels successifs à generateRefreshToken doivent donner des tokens distincts', () => {
      const r1 = jwtService.generateRefreshToken();
      const r2 = jwtService.generateRefreshToken();

      expect(r1.token).not.toBe(r2.token);
      expect(r1.hash).not.toBe(r2.hash);
    });
  });
});
