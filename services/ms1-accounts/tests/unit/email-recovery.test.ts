import { EmailVerificationService } from '../../src/services/email-verification.service';
import { RecoveryService } from '../../src/services/recovery.service';
import { AuthController } from '../../src/controllers/auth.controller';
import { UserController } from '../../src/controllers/user.controller';
import { prisma } from '../../src/config/prisma';
import { eventBus } from '../../src/services/event-bus';
import { hashString } from '../../src/services/challenge.service';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';
import { BadRequestError, UnauthorizedError, ConflictError, RateLimitError } from '@forsa/common';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    authChallenge: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    recoveryAttempt: {
      create: jest.fn(),
      count: jest.fn(),
    },
    recoveryToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}));

jest.mock('../../src/services/event-bus', () => ({
  eventBus: {
    publish: jest.fn().mockResolvedValue(undefined),
    isBrokerUp: jest.fn().mockReturnValue(true),
  },
}));

describe('LOT E1: Email Verification & Recovery Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (eventBus.isBrokerUp as jest.Mock).mockReturnValue(true);
  });

  describe('1. EmailVerificationService', () => {
    it('initiateEmailVerification doit créer un défi EMAIL_VERIFY et publier email.send', async () => {
      (prisma.authChallenge.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.authChallenge.create as jest.Mock).mockResolvedValue({ id: 'ch-email-1' });

      await EmailVerificationService.initiateEmailVerification('user-1', 'test@forsa.dz', 'fr');

      expect(prisma.authChallenge.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            purpose: ChallengePurpose.EMAIL_VERIFY,
            status: ChallengeStatus.PENDING,
          }),
        })
      );

      expect(prisma.authChallenge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            email: 'test@forsa.dz',
            purpose: ChallengePurpose.EMAIL_VERIFY,
            status: ChallengeStatus.PENDING,
            maxAttempts: 5,
          }),
        })
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        'email.send',
        expect.objectContaining({
          to: 'test@forsa.dz',
          template: 'verify',
        })
      );
    });

    it('verifyEmail doit valider le code et mettre à jour emailVerifiedAt', async () => {
      const validCode = '123456';
      (prisma.authChallenge.findFirst as jest.Mock).mockResolvedValue({
        id: 'ch-email-1',
        userId: 'user-1',
        email: 'test@forsa.dz',
        codeHash: hashString(validCode),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        maxAttempts: 5,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        pendingEmail: null,
      });

      const res = await EmailVerificationService.verifyEmail('user-1', validCode);
      expect(res).toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            emailVerifiedAt: expect.any(Date),
          }),
        })
      );
    });

    it('verifyEmail met à jour l adresse email si pendingEmail est renseigné', async () => {
      const validCode = '654321';
      (prisma.authChallenge.findFirst as jest.Mock).mockResolvedValue({
        id: 'ch-email-2',
        userId: 'user-1',
        email: 'new@forsa.dz',
        codeHash: hashString(validCode),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        maxAttempts: 5,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        pendingEmail: 'new@forsa.dz',
      });

      await EmailVerificationService.verifyEmail('user-1', validCode);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            email: 'new@forsa.dz',
            pendingEmail: null,
            emailVerifiedAt: expect.any(Date),
          }),
        })
      );
    });

    it('verifyEmail incrémente les tentatives si le code est erroné', async () => {
      (prisma.authChallenge.findFirst as jest.Mock).mockResolvedValue({
        id: 'ch-email-1',
        userId: 'user-1',
        email: 'test@forsa.dz',
        codeHash: hashString('111111'),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 1,
        maxAttempts: 5,
      });

      await expect(EmailVerificationService.verifyEmail('user-1', '999999')).rejects.toThrow(
        BadRequestError
      );

      expect(prisma.authChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ch-email-1' },
          data: { attempts: { increment: 1 } },
        })
      );
    });

    it('resendVerification limite à 3 par heure (429 RateLimitError)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@forsa.dz',
      });

      (prisma.authChallenge.count as jest.Mock).mockResolvedValue(3);

      await expect(EmailVerificationService.resendVerification('user-1')).rejects.toThrow(
        RateLimitError
      );
    });
  });

  describe('2. RecoveryService', () => {
    it('startRecovery renvoie HTTP 202 synchrone avec message anti-énumération et limite max 3 par 24h', async () => {
      (prisma.recoveryAttempt.count as jest.Mock).mockResolvedValue(0);
      (prisma.recoveryAttempt.create as jest.Mock).mockResolvedValue({ id: 'att-1' });

      const res = await RecoveryService.startRecovery('user@forsa.dz');
      expect(res.message).toContain('Si un compte actif existe avec cet e-mail');
      expect(prisma.recoveryAttempt.create).toHaveBeenCalled();
    });

    it('startRecovery bloque si la limite de 3 tentatives par 24h est atteinte (429 RateLimitError)', async () => {
      (prisma.recoveryAttempt.count as jest.Mock).mockResolvedValue(3);

      await expect(RecoveryService.startRecovery('user@forsa.dz')).rejects.toThrow(RateLimitError);
      expect(prisma.recoveryAttempt.create).not.toHaveBeenCalled();
    });

    it('verifyRecovery émet un recoveryToken sécurisé de 15 min après code valide', async () => {
      const code = '789123';
      (prisma.authChallenge.findFirst as jest.Mock).mockResolvedValue({
        id: 'ch-rec-1',
        userId: 'user-rec-1',
        email: 'user@forsa.dz',
        codeHash: hashString(code),
        expiresAt: new Date(Date.now() + 60000),
        attempts: 0,
        maxAttempts: 5,
      });

      const res = await RecoveryService.verifyRecovery('user@forsa.dz', code);
      expect(res.recoveryToken).toBeDefined();
      expect(res.recoveryToken.length).toBe(64); // 32 bytes hex

      expect(prisma.recoveryToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-rec-1',
            scope: 'phone_recovery',
          }),
        })
      );
    });

    it('startRebindPhone publie telegram.challenge.created avec nonceHash (JAMAIS raw nonce)', async () => {
      const rawToken = 'dummy-recovery-token-12345678901234567890';
      (prisma.recoveryToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'tok-1',
        tokenHash: hashString(rawToken),
        userId: 'user-rec-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // Pas de conflit numéro
      (prisma.authChallenge.create as jest.Mock).mockResolvedValue({ id: 'ch-telegram-1' });

      const res = await RecoveryService.startRebindPhone(rawToken, '+213555998877');
      expect(res.challengeId).toBeDefined();

      expect(eventBus.publish).toHaveBeenCalledWith(
        'telegram.challenge.created',
        expect.objectContaining({
          nonceHash: expect.any(String),
          phone: '+213555998877',
        })
      );

      // S'assurer qu'aucun champ raw "nonce" n'est présent dans le payload publié
      const publishCall = (eventBus.publish as jest.Mock).mock.calls.find(
        (c) => c[0] === 'telegram.challenge.created'
      );
      expect(publishCall[1]).not.toHaveProperty('nonce');
    });

    it('startRebindPhone rejette si le nouveau numéro est déjà utilisé par un autre compte (409 Conflict)', async () => {
      const rawToken = 'dummy-recovery-token';
      (prisma.recoveryToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'tok-1',
        tokenHash: hashString(rawToken),
        userId: 'user-rec-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'another-user-2',
        phoneE164: '+213555998877',
      });

      await expect(
        RecoveryService.startRebindPhone(rawToken, '+213555998877')
      ).rejects.toThrow(ConflictError);
    });

    it('completePhoneRecovery applique un délai pour commerçant approuvé et révoque les sessions', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'merchant-1',
        roles: ['MERCHANT', 'CUSTOMER'],
        email: 'merchant@forsa.dz',
        shop: { id: 'shop-1', verificationStatus: 'APPROVED' },
      });

      const res = await RecoveryService.completePhoneRecovery('merchant-1', '+213666112233');

      expect(res.isMerchantDelay).toBe(true);
      expect(res.pendingPhoneActivateAt).toBeDefined();

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'merchant-1' },
          data: expect.objectContaining({
            pendingPhone: '+213666112233',
            pendingPhoneActivateAt: expect.any(Date),
          }),
        })
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        'email.send',
        expect.objectContaining({
          to: 'merchant@forsa.dz',
          template: 'phone-change-pending',
        })
      );

      // Révoque les sessions
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'merchant-1' },
          data: { revoked: true },
        })
      );
    });

    it('completePhoneRecovery applique le numéro immédiatement pour un client', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'client-1',
        roles: ['CUSTOMER'],
        email: 'client@forsa.dz',
        shop: null,
      });

      const res = await RecoveryService.completePhoneRecovery('client-1', '+213777445566');

      expect(res.isMerchantDelay).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'client-1' },
          data: expect.objectContaining({
            phoneE164: '+213777445566',
          }),
        })
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        'email.send',
        expect.objectContaining({
          to: 'client@forsa.dz',
          template: 'phone-changed',
        })
      );
    });

    it('checkAndApplyPendingPhone active le numéro en attente une fois la date échue', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'merchant-1',
        email: 'merchant@forsa.dz',
        pendingPhone: '+213666112233',
        pendingPhoneActivateAt: pastDate,
      });

      const activated = await RecoveryService.checkAndApplyPendingPhone('merchant-1');
      expect(activated).toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'merchant-1' },
          data: {
            phoneE164: '+213666112233',
            pendingPhone: null,
            pendingPhoneActivateAt: null,
          },
        })
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        'email.send',
        expect.objectContaining({
          to: 'merchant@forsa.dz',
          template: 'phone-changed',
        })
      );
    });
  });

  describe('3. Endpoints AuthController', () => {
    it('POST /auth/email/verify valide le code via req.user.sub', async () => {
      jest.spyOn(EmailVerificationService, 'verifyEmail').mockResolvedValue(true);

      const req: any = {
        user: { sub: 'user-1' },
        body: { code: '123456' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await AuthController.verifyEmail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: true })
      );
    });

    it('POST /auth/recovery/start renvoie HTTP 202', async () => {
      jest.spyOn(RecoveryService, 'startRecovery').mockResolvedValue({
        message: 'Si un compte actif existe avec cet e-mail, un code de récupération a été envoyé.',
      });

      const req: any = {
        body: { email: 'valid@forsa.dz' },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await AuthController.recoveryStart(req, res, next);
      expect(res.status).toHaveBeenCalledWith(202);
    });
  });
});
