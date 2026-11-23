import { normalizeToE164, isValidE164Algerian, phoneE164Schema } from '../../src/utils/phone';
import { hashString, constantTimeCompare, verifyAuthChallenge } from '../../src/services/challenge.service';
import { rotateRefreshToken } from '../../src/services/session.service';
import { jwtService } from '../../src/services/jwt.service';
import { prisma } from '../../src/config/prisma';
import { ChallengeStatus } from '@prisma/client';

// Mock du client Prisma pour tests unitaires isolés
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    authChallenge: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock du jwtService pour la rotation
jest.mock('../../src/services/jwt.service', () => ({
  jwtService: {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    hashToken: jest.fn(),
  },
}));

describe('Lot 2A — Authentification Telegram & Sécurité (Unit Tests)', () => {
  beforeEach(() => {
    (jwtService.generateRefreshToken as jest.Mock).mockReturnValue({
      token: 'mock-refresh-token-new',
      hash: 'mock-hash-new',
    });
    (jwtService.generateAccessToken as jest.Mock).mockReturnValue('mock-jwt-access-token');
    (jwtService.hashToken as jest.Mock).mockImplementation((t: string) => `hashed_${t}`);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  // ─── 1. Normalisation E.164 ───────────────────────────────────────────────
  describe('1. Normalisation E.164 (Algérie +213)', () => {
    it('doit normaliser les formats locaux 05/06/07 en E.164', () => {
      expect(normalizeToE164('0550123456')).toBe('+213550123456');
      expect(normalizeToE164('0661451740')).toBe('+213661451740');
      expect(normalizeToE164('0770987654')).toBe('+213770987654');
    });

    it('doit nettoyer les espaces, tirets et points', () => {
      expect(normalizeToE164('05 50 12 34 56')).toBe('+213550123456');
      expect(normalizeToE164('06-61-45-17-40')).toBe('+213661451740');
      expect(normalizeToE164('07.70.98.76.54')).toBe('+213770987654');
    });

    it('doit accepter les numéros déjà au format international', () => {
      expect(normalizeToE164('+213550123456')).toBe('+213550123456');
      expect(normalizeToE164('00213550123456')).toBe('+213550123456');
      expect(normalizeToE164('213550123456')).toBe('+213550123456');
    });

    it('doit rejeter les numéros invalides (trop courts, mauvais préfixe)', () => {
      expect(normalizeToE164('0123456789')).toBeNull();
      expect(normalizeToE164('021123456')).toBeNull(); // Fixe algérois (non mobile)
      expect(normalizeToE164('12345')).toBeNull();
      expect(normalizeToE164('abc')).toBeNull();
    });

    it('isValidE164Algerian valide uniquement le format international strict', () => {
      expect(isValidE164Algerian('+213550123456')).toBe(true);
      expect(isValidE164Algerian('+213661451740')).toBe(true);
      expect(isValidE164Algerian('+213770987654')).toBe(true);
      expect(isValidE164Algerian('0550123456')).toBe(false);
      expect(isValidE164Algerian('+33612345678')).toBe(false);
    });

    it('phoneE164Schema valide et normalise les entrées via Zod', () => {
      const res1 = phoneE164Schema.safeParse('0550123456');
      expect(res1.success).toBe(true);
      if (res1.success) expect(res1.data).toBe('+213550123456');

      const resInvalid = phoneE164Schema.safeParse('invalid-phone');
      expect(resInvalid.success).toBe(false);
    });
  });

  // ─── 2. Hachage SHA-256 et comparaison à temps constant ───────────────────
  describe('2. Hachage SHA-256 et comparaison à temps constant', () => {
    it('doit générer un hash SHA-256 hexadécimal de 64 caractères', () => {
      const code = '123456';
      const hash = hashString(code);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
      expect(hashString(code)).toBe(hash);
      expect(hashString('654321')).not.toBe(hash);
    });

    it('constantTimeCompare retourne true pour des hashes identiques', () => {
      const hashA = hashString('123456');
      const hashB = hashString('123456');
      expect(constantTimeCompare(hashA, hashB)).toBe(true);
    });

    it('constantTimeCompare retourne false pour des hashes différents ou invalides', () => {
      const hashA = hashString('123456');
      const hashB = hashString('999999');
      expect(constantTimeCompare(hashA, hashB)).toBe(false);
      expect(constantTimeCompare('', hashA)).toBe(false);
      expect(constantTimeCompare(hashA, 'short')).toBe(false);
    });
  });

  // ─── 3. Expiration du défi (TTL) ──────────────────────────────────────────
  describe('3. Expiration du défi (TTL)', () => {
    it('doit rejeter un défi expiré (expiresAt dépassé)', async () => {
      const expiredChallenge = {
        id: 'chal-expired-1',
        status: ChallengeStatus.PENDING,
        codeHash: hashString('123456'),
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
      };

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue(expiredChallenge);
      (prisma.authChallenge.update as jest.Mock).mockResolvedValue({
        ...expiredChallenge,
        status: ChallengeStatus.EXPIRED,
      });

      await expect(verifyAuthChallenge('chal-expired-1', '123456')).rejects.toThrow(
        'Ce code a expiré. Veuillez relancer la vérification.'
      );

      expect(prisma.authChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'chal-expired-1' },
          data: { status: ChallengeStatus.EXPIRED },
        })
      );
    });
  });

  // ─── 4. Limite des essais (max 5) ─────────────────────────────────────────
  describe('4. Limite de tentatives (max 5)', () => {
    it('doit incrémenter les tentatives lors d\'un code erroné', async () => {
      const activeChallenge = {
        id: 'chal-attempts-1',
        status: ChallengeStatus.PENDING,
        codeHash: hashString('123456'),
        attempts: 2,
        expiresAt: new Date(Date.now() + 60000),
      };

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue(activeChallenge);
      (prisma.authChallenge.update as jest.Mock).mockResolvedValue({
        ...activeChallenge,
        attempts: 3,
      });

      await expect(verifyAuthChallenge('chal-attempts-1', '000000')).rejects.toThrow(
        'Code incorrect. 2 essai(s) restant(s).'
      );

      expect(prisma.authChallenge.update).toHaveBeenCalledWith({
        where: { id: 'chal-attempts-1' },
        data: {
          attempts: 3,
          status: ChallengeStatus.PENDING,
        },
      });
    });

    it('doit verrouiller le défi (FAILED) au 5ème essai infructueux', async () => {
      const activeChallenge = {
        id: 'chal-attempts-5',
        status: ChallengeStatus.PENDING,
        codeHash: hashString('123456'),
        attempts: 4,
        expiresAt: new Date(Date.now() + 60000),
      };

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue(activeChallenge);
      (prisma.authChallenge.update as jest.Mock).mockResolvedValue({
        ...activeChallenge,
        attempts: 5,
        status: ChallengeStatus.FAILED,
      });

      await expect(verifyAuthChallenge('chal-attempts-5', '000000')).rejects.toThrow(
        'Code incorrect. Trop de tentatives : défi verrouillé.'
      );

      expect(prisma.authChallenge.update).toHaveBeenCalledWith({
        where: { id: 'chal-attempts-5' },
        data: {
          attempts: 5,
          status: ChallengeStatus.FAILED,
        },
      });
    });

    it('doit refuser toute tentative sur un défi déjà verrouillé (FAILED)', async () => {
      const lockedChallenge = {
        id: 'chal-locked',
        status: ChallengeStatus.FAILED,
        codeHash: hashString('123456'),
        attempts: 5,
        expiresAt: new Date(Date.now() + 60000),
      };

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue(lockedChallenge);

      await expect(verifyAuthChallenge('chal-locked', '123456')).rejects.toThrow(
        'Ce défi a été verrouillé suite à un trop grand nombre d\'essais.'
      );
    });
  });

  // ─── 5. Usage unique du défi ──────────────────────────────────────────────
  describe('5. Usage unique du défi (single-use)', () => {
    it('doit marquer le défi comme VERIFIED en cas de succès', async () => {
      const code = '789123';
      const validChallenge = {
        id: 'chal-valid-1',
        status: ChallengeStatus.PENDING,
        codeHash: hashString(code),
        attempts: 1,
        expiresAt: new Date(Date.now() + 60000),
      };

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue(validChallenge);
      (prisma.authChallenge.update as jest.Mock).mockResolvedValue({
        ...validChallenge,
        status: ChallengeStatus.VERIFIED,
      });

      const result = await verifyAuthChallenge('chal-valid-1', code);
      expect(result.success).toBe(true);

      expect(prisma.authChallenge.update).toHaveBeenCalledWith({
        where: { id: 'chal-valid-1' },
        data: {
          status: ChallengeStatus.VERIFIED,
          attempts: 2,
        },
      });
    });

    it('doit refuser un défi déjà validé (déjà consommé)', async () => {
      const alreadyVerified = {
        id: 'chal-used',
        status: ChallengeStatus.VERIFIED,
        codeHash: hashString('123456'),
        attempts: 1,
        expiresAt: new Date(Date.now() + 60000),
      };

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue(alreadyVerified);

      await expect(verifyAuthChallenge('chal-used', '123456')).rejects.toThrow(
        'Ce défi a déjà été validé et consommé.'
      );
    });
  });

  // ─── 6. Rotation et réutilisation de refresh token (Replay attack) ────────
  describe('6. Rotation & Détection de rejeu du Refresh Token (Replay Attack)', () => {
    it('doit réussir la rotation d\'un refresh token valide non révoqué', async () => {
      const validToken = {
        id: 'rt-valid-1',
        tokenHash: 'hashed_valid-token',
        userId: 'user-123',
        revoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        ipAddress: null,
        userAgent: null,
        device: null,
        user: {
          id: 'user-123',
          roles: ['CLIENT'],
          activeMode: 'client',
          status: 'ACTIVE',
          email: null,
          phoneE164: null,
          fullName: 'Test User',
          shop: null,
        },
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(validToken);
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({ ...validToken, revoked: true });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'rt-new-1',
        userId: 'user-123',
        tokenHash: 'mock-hash-new',
      });

      const result = await rotateRefreshToken('valid-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');

      // L'ancien token doit être révoqué
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-valid-1' },
        data: { revoked: true },
      });

      // Un nouveau token doit être créé
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('doit révoquer TOUTES les sessions en cas de rejeu d\'un refresh token révoqué', async () => {
      const reusedToken = {
        id: 'rt-reused-1',
        tokenHash: 'hashed_already-used-token',
        userId: 'user-victim-123',
        revoked: true, // Déjà révoqué => REPLAY ATTACK
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        ipAddress: null,
        userAgent: null,
        device: null,
        user: {
          id: 'user-victim-123',
          roles: ['CLIENT'],
          activeMode: 'client',
          status: 'ACTIVE',
          shop: null,
        },
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(reusedToken);
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 4 });

      await expect(rotateRefreshToken('already-used-token')).rejects.toThrow(
        'Session compromise. Toutes vos sessions ont été invalidées.'
      );

      // Toutes les sessions (sans filtre revoked) doivent être révoquées
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-victim-123' },
        data: { revoked: true },
      });
    });
  });
});
