import { ChallengePurpose, ChallengeStatus } from '@prisma/client';
import { prisma } from '../../src/config/prisma';
import { eventBus } from '../../src/services/event-bus';
import { rabbitMQ } from '../../src/services/rabbitmq.service';
import { UserController } from '../../src/controllers/user.controller';
import { ShopController } from '../../src/controllers/shop.controller';
import { ConflictError } from '@forsa/common';
import { initAuthEventListeners } from '../../src/events/auth-events.listener';
import { hashString } from '../../src/services/challenge.service';

// Mock du client Prisma
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    authChallenge: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    userPreferences: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    shop: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock du bus d'événements
jest.mock('../../src/services/event-bus', () => ({
  eventBus: {
    publish: jest.fn(),
    subscribe: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
    isBrokerUp: jest.fn().mockReturnValue(true),
  },
}));

// Mock du service RabbitMQ
jest.mock('../../src/services/rabbitmq.service', () => ({
  rabbitMQ: {
    publish: jest.fn(),
    subscribe: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
  },
  initRabbitMQ: jest.fn(),
}));

describe('Lot 2B — Changement de numéro, Profil & Horaires Boutique', () => {
  let eventHandlers: Record<string, Function> = {};

  beforeEach(() => {
    eventHandlers = {};

    (eventBus.subscribe as jest.Mock).mockImplementation((topic: string, handler: Function) => {
      eventHandlers[topic] = handler;
      return Promise.resolve();
    });

    // Configuration par défaut des mocks Prisma (nécessaire à cause de resetMocks: true)
    (prisma.authChallenge.update as jest.Mock).mockResolvedValue({});
    (prisma.authChallenge.create as jest.Mock).mockResolvedValue({});
    (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.authChallenge.findFirst as jest.Mock).mockResolvedValue(null);

    (prisma.user.update as jest.Mock).mockResolvedValue({});
    (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    (prisma.shop.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.shop.create as jest.Mock).mockResolvedValue({});
    (prisma.shop.update as jest.Mock).mockResolvedValue({});

    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    (prisma.$transaction as jest.Mock).mockImplementation((actions) => {
      if (Array.isArray(actions)) {
        return Promise.all(actions);
      }
      if (typeof actions === 'function') {
        return actions(prisma);
      }
      return Promise.resolve(actions);
    });

    (eventBus.publish as jest.Mock).mockResolvedValue(undefined);

    (rabbitMQ.publish as jest.Mock).mockResolvedValue(undefined);
    (rabbitMQ.subscribe as jest.Mock).mockResolvedValue(undefined);
  });

  // ─── 1. ÉCOUTEUR CONTACT REÇU (Flux Connexion / Inscription) ────────────────
  describe('1. Écouteur d\'événements telegram.contact.received (Cas LOGIN)', () => {
    it('doit générer un code OTP 6 chiffres, lier telegramChatId et publier telegram.send.otp', async () => {
      await initAuthEventListeners();
      const handler = eventHandlers['telegram.contact.received'];
      expect(handler).toBeDefined();

      const challengeId = 'chal-auth-1';
      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        phone: '+213555889900',
        purpose: ChallengePurpose.LOGIN,
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await handler({
        eventId: 'evt-contact-1',
        name: 'telegram.contact.received',
        type: 'telegram.contact.received',
        occurredAt: new Date().toISOString(),
        payload: {
          challengeId,
          phone: '+213555889900',
          telegramUserId: '888888',
          chatId: '777777',
        },
      });

      expect(prisma.authChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: challengeId },
          data: expect.objectContaining({
            codeHash: expect.any(String),
          }),
        })
      );

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { phoneE164: '+213555889900' },
        data: expect.objectContaining({
          telegramUserId: '888888',
          telegramChatId: '777777',
          telegramBlocked: false,
        }),
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'telegram.send.otp',
        expect.objectContaining({
          chatId: '777777',
          code: expect.stringMatching(/^[0-9]{6}$/),
          challengeId,
        })
      );
    });
  });

  // ─── 2. NUMÉRO DÉJÀ PRIS (Changement de numéro) ──────────────────────────────
  describe('2. Changement de numéro — Numéro déjà pris', () => {
    it('doit refuser le changement avec ConflictError si le nouveau numéro appartient déjà à un autre utilisateur', async () => {
      const currentUserId = 'user-current-id';
      const otherUserId = 'user-other-id';

      (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === currentUserId) {
          return Promise.resolve({
            id: currentUserId,
            phoneE164: '+213555111111',
            telegramUserId: 'telegram-user-1',
          });
        }
        if (where.phoneE164 === '+213555222222') {
          return Promise.resolve({
            id: otherUserId,
            phoneE164: '+213555222222',
          });
        }
        return Promise.resolve(null);
      });

      const challengeId = '00000000-0000-0000-0000-000000000001';

      const req: any = {
        user: { sub: currentUserId },
        body: {
          challengeId,
          code: '123456',
          newPhone: '0555222222',
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await UserController.changePhoneVerify(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(409);
    });

    it('doit refuser si le nouveau numéro est strictement identique au numéro actuel', async () => {
      const currentUserId = 'user-current-id';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: currentUserId,
        phoneE164: '+213555111111',
        telegramUserId: 'telegram-user-1',
      });

      const challengeId = '00000000-0000-0000-0000-000000000002';

      const req: any = {
        user: { sub: currentUserId },
        body: {
          challengeId,
          code: '123456',
          newPhone: '+213555111111',
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await UserController.changePhoneVerify(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.anything());
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('différent');
    });
  });

  // ─── 3. TRANSACTION ATOMIQUE (Changement de numéro réussi ou conflits) ───────
  describe('3. Transaction Atomique (Changement de numéro via telegram.contact.received)', () => {
    it('doit exécuter la transaction atomique (user update, challenge VERIFIED, auditLog) lors de la confirmation', async () => {
      await initAuthEventListeners();
      const handler = eventHandlers['telegram.contact.received'];

      const challengeId = 'chal-change-success';
      const userId = 'user-to-update';

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        purpose: ChallengePurpose.CHANGE_PHONE,
        userId,
        newPhone: '+213555998877',
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        user: {
          id: userId,
          phoneE164: '+213555112233',
          telegramUserId: 'old-tg-user',
        },
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}, {}]);

      await handler({
        eventId: 'evt-tx-success',
        name: 'telegram.contact.received',
        type: 'telegram.contact.received',
        occurredAt: new Date().toISOString(),
        payload: {
          challengeId,
          phone: '+213555998877',
          telegramUserId: 'new-tg-user',
          chatId: 'new-chat-id',
        },
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            phoneE164: '+213555998877',
            telegramUserId: 'new-tg-user',
            telegramChatId: 'new-chat-id',
          }),
        })
      );
      expect(prisma.authChallenge.update).toHaveBeenCalledWith({
        where: { id: challengeId },
        data: { status: ChallengeStatus.VERIFIED },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            action: 'USER_PHONE_CHANGED',
          }),
        })
      );
    });

    it('doit marquer le défi FAILED et créer un auditLog d\'échec si un compte Telegram est déjà lié à un autre utilisateur (P2002)', async () => {
      await initAuthEventListeners();
      const handler = eventHandlers['telegram.contact.received'];

      const challengeId = 'chal-change-conflict-tg';
      const userId = 'user-to-update';

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        purpose: ChallengePurpose.CHANGE_PHONE,
        userId,
        newPhone: '+213555998877',
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        user: {
          id: userId,
          phoneE164: '+213555112233',
          telegramUserId: 'old-tg-user',
        },
      });

      const uniqueConstraintError: any = new Error('Unique constraint failed on the fields: (`telegram_user_id`)');
      uniqueConstraintError.code = 'P2002';
      uniqueConstraintError.meta = { target: ['telegram_user_id'] };

      (prisma.$transaction as jest.Mock).mockRejectedValue(uniqueConstraintError);

      await handler({
        eventId: 'evt-conflict-tg',
        name: 'telegram.contact.received',
        type: 'telegram.contact.received',
        occurredAt: new Date().toISOString(),
        payload: {
          challengeId,
          phone: '+213555998877',
          telegramUserId: 'already-linked-tg-user',
          chatId: 'new-chat-id',
        },
      });

      expect(prisma.authChallenge.update).toHaveBeenCalledWith({
        where: { id: challengeId },
        data: { status: ChallengeStatus.FAILED },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            action: 'PHONE_CHANGE_FAILED',
            metadata: expect.objectContaining({
              reason: 'TELEGRAM_ACCOUNT_ALREADY_LINKED',
            }),
          }),
        })
      );
    });
  });

  // ─── 4. HORAIRES BOUTIQUE (openingHours JSON) ──────────────────────────────────
  describe('4. Horaires Boutique (openingHours JSON typage Prisma)', () => {
    it('doit persister openingHours en JSON valide lors de createShop', async () => {
      const userId = 'merchant-user-1';
      const openingHours = {
        monday: { open: '08:30', close: '18:00', closed: false },
        friday: { closed: true },
      };

      (prisma.shop.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.shop.create as jest.Mock).mockResolvedValue({
        id: 'shop-uuid-1',
        name: 'Superette El Bahdja',
        userId,
        openingHours,
        verificationStatus: 'PENDING',
      });

      const req: any = {
        user: { sub: userId, roles: ['MERCHANT'], role: 'MERCHANT' },
        body: {
          name: 'Superette El Bahdja',
          address: '12 Boulevard des Martyrs, Alger',
          latitude: 36.75,
          longitude: 3.05,
          phone: '+213555112233',
          openingHours,
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await ShopController.createShop(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prisma.shop.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Superette El Bahdja',
            openingHours,
            userId,
          }),
        })
      );
    });

    it('doit mettre à jour openingHours en JSON lors de updateMyShop', async () => {
      const userId = 'merchant-user-1';
      const newOpeningHours = {
        saturday: { open: '09:00', close: '20:00' },
      };

      (prisma.shop.findUnique as jest.Mock).mockResolvedValue({
        id: 'shop-uuid-1',
        userId,
        verificationStatus: 'PENDING',
      });
      (prisma.shop.update as jest.Mock).mockResolvedValue({
        id: 'shop-uuid-1',
        openingHours: newOpeningHours,
        verificationStatus: 'PENDING',
      });

      const req: any = {
        user: { sub: userId },
        body: {
          openingHours: newOpeningHours,
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await ShopController.updateMyShop(req, res, next);

      expect(prisma.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop-uuid-1' },
          data: expect.objectContaining({
            openingHours: newOpeningHours,
          }),
        })
      );
    });
  });
});
