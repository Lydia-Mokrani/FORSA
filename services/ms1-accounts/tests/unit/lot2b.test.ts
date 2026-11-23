import { ChallengePurpose, ChallengeStatus } from '@prisma/client';
import { prisma } from '../../src/config/prisma';
import { eventBus } from '../../src/services/event-bus';
import { rabbitMQ } from '../../src/services/rabbitmq.service';
import {
  handleTelegramUpdate,
  handleBotBlockedByUser,
  chatToChallengeMap,
  sendTelegramMessage,
} from '../../src/services/telegram.service';
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

// Mock fetch global pour Telegram Bot API
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Lot 2B — Bot Telegram, Changement de numéro, Profil & Horaires Boutique', () => {
  let eventHandlers: Record<string, Function[]> = {};

  beforeEach(() => {
    eventHandlers = {};
    chatToChallengeMap.clear();

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
      return actions(prisma);
    });

    // Configuration par défaut du bus d'événements
    (eventBus.subscribe as jest.Mock).mockImplementation(async (key: string, handler: Function) => {
      if (!eventHandlers[key]) eventHandlers[key] = [];
      eventHandlers[key].push(handler);
    });

    (eventBus.publish as jest.Mock).mockImplementation(async (key: string, data: any) => {
      if (eventHandlers[key]) {
        for (const h of eventHandlers[key]) {
          await h({ data, payload: data });
        }
      }
    });

    (rabbitMQ.publish as jest.Mock).mockResolvedValue(undefined);
    (rabbitMQ.subscribe as jest.Mock).mockResolvedValue(undefined);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
  });

  // ─── 1. CONTACT QUI NE CORRESPOND PAS ──────────────────────────────────────────
  describe('1. Sécurité Contact Telegram (Mismatches)', () => {
    it('doit marquer le défi FAILED si le contact partagé n\'appartient pas à l\'utilisateur (contact.user_id !== from.id)', async () => {
      const challengeId = 'chal-security-1';
      chatToChallengeMap.set(123456, challengeId);

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        phone: '+213555112233',
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const update = {
        message: {
          chat: { id: 123456 },
          from: { id: 9999 }, // Émetteur Telegram
          contact: {
            user_id: 8888, // Différent de from.id (carte de contact tiers partagée !)
            phone_number: '0555112233',
          },
        },
      };

      await handleTelegramUpdate(update);

      // Le défi doit être verrouillé en FAILED
      expect(prisma.authChallenge.update).toHaveBeenCalledWith({
        where: { id: challengeId },
        data: { status: ChallengeStatus.FAILED },
      });

      // Aucun événement contact.received ne doit être publié
      expect(eventBus.publish).not.toHaveBeenCalledWith(
        'telegram.contact.received',
        expect.anything()
      );
    });

    it('doit marquer le défi FAILED si le numéro du contact ne correspond pas au numéro demandé', async () => {
      const challengeId = 'chal-security-2';
      chatToChallengeMap.set(123456, challengeId);

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        phone: '+213555112233', // Numéro attendu
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const update = {
        message: {
          chat: { id: 123456 },
          from: { id: 9999 },
          contact: {
            user_id: 9999,
            phone_number: '0666998877', // Numéro différent (+213666998877)
          },
        },
      };

      await handleTelegramUpdate(update);

      // Le défi doit être mis en FAILED
      expect(prisma.authChallenge.update).toHaveBeenCalledWith({
        where: { id: challengeId },
        data: { status: ChallengeStatus.FAILED },
      });

      expect(eventBus.publish).not.toHaveBeenCalledWith(
        'telegram.contact.received',
        expect.anything()
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
            phoneE164: '+213555112233',
            telegramChatId: 'chat-111',
          });
        }
        if (where.phoneE164 === '+213666778899') {
          return Promise.resolve({
            id: otherUserId,
            phoneE164: '+213666778899',
          });
        }
        return Promise.resolve(null);
      });

      const req: any = {
        user: { sub: currentUserId },
        body: {
          challengeId: '00000000-0000-0000-0000-000000000001',
          code: '123456',
          newPhone: '0666778899',
        },
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await UserController.changePhoneVerify(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
      expect(next.mock.calls[0][0].message).toContain('déjà associé à un autre compte');
    });
  });

  // ─── 3. ATOMICITÉ DE LA TRANSACTION (Changement de numéro) ────────────────────
  describe('3. Atomicité de la transaction Prisma', () => {
    it('doit exécuter atomiquement la mise à jour du numéro, la validation du défi et l\'audit log dans $transaction', async () => {
      await initAuthEventListeners();

      const challengeId = 'chal-change-phone';
      const userId = 'user-test-atomic';

      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        userId,
        purpose: ChallengePurpose.CHANGE_PHONE,
        phone: '+213666001122',
        newPhone: '+213666001122',
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        user: {
          id: userId,
          phoneE164: '+213555000000',
          telegramUserId: 'old-tg-id',
          telegramChatId: 'old-chat-id',
        },
      });

      (prisma.user.update as jest.Mock).mockResolvedValue({ id: userId });
      (prisma.authChallenge.update as jest.Mock).mockResolvedValue({ id: challengeId });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      // Émission de telegram.contact.received
      await eventBus.publish('telegram.contact.received', {
        challengeId,
        phone: '+213666001122',
        telegramUserId: 'new-tg-id',
        chatId: 'new-chat-id',
      });

      // Vérifie que prisma.$transaction a bien été appelé
      expect(prisma.$transaction).toHaveBeenCalled();

      // Vérifie que l'utilisateur a été mis à jour avec son nouveau numéro et ses nouveaux identifiants TG
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            phoneE164: '+213666001122',
            telegramUserId: 'new-tg-id',
            telegramChatId: 'new-chat-id',
            telegramBlocked: false,
          }),
        })
      );

      // Vérifie que le défi a été marqué VERIFIED
      expect(prisma.authChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: challengeId },
          data: { status: ChallengeStatus.VERIFIED },
        })
      );

      // Vérifie la création de l'audit log
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            action: 'USER_PHONE_CHANGED',
          }),
        })
      );
    });

    it('doit annuler l\'ensemble si l\'une des opérations de la transaction échoue', async () => {
      await initAuthEventListeners();
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('DB_DEADLOCK_ROLLBACK'));

      const challengeId = 'chal-rollback';
      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        userId: 'u1',
        purpose: ChallengePurpose.CHANGE_PHONE,
        phone: '+213666001122',
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        eventBus.publish('telegram.contact.received', {
          challengeId,
          phone: '+213666001122',
          telegramUserId: 'tg-1',
          chatId: 'chat-1',
        })
      ).resolves.not.toThrow();
    });
  });

  // ─── 4. BOT BLOQUÉ PAR L'UTILISATEUR ──────────────────────────────────────────
  describe('4. Détection du blocage du bot (telegram_blocked = true)', () => {
    it('doit passer telegramBlocked à true si Telegram renvoie une erreur 403 Forbidden', async () => {
      mockFetch.mockResolvedValue({
        status: 403,
        json: async () => ({
          ok: false,
          error_code: 403,
          description: 'Forbidden: bot was blocked by the user',
        }),
      });

      const chatId = 987654321;
      const sent = await sendTelegramMessage(chatId, 'Test message');

      expect(sent).toBe(false);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { telegramChatId: String(chatId) },
        data: { telegramBlocked: true },
      });
    });

    it('handleBotBlockedByUser met à jour la table users avec telegramBlocked=true', async () => {
      await handleBotBlockedByUser(11223344);

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { telegramChatId: '11223344' },
        data: { telegramBlocked: true },
      });
    });
  });

  // ─── 5. HORAIRES BOUTIQUE (openingHours JSON) ──────────────────────────────────
  describe('5. Horaires Boutique (openingHours JSON typage Prisma)', () => {
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

  // ─── 6. TEST DE BOUT EN BOUT (Simulé) ─────────────────────────────────────────
  describe('6. Test de bout en bout (Simulé avec faux client Telegram)', () => {
    it('déroule le flux complet : /start -> partage contact -> contact.received -> OTP -> verify', async () => {
      await initAuthEventListeners();

      // Étape A : Défi initialisé (ex. par POST /auth/telegram/start)
      const nonce = 'abcdef0123456789abcdef0123456789';
      const nonceHash = hashString(nonce);
      const challengeId = 'chal-e2e-1';

      (prisma.authChallenge.findFirst as jest.Mock).mockResolvedValue({
        id: challengeId,
        phone: '+213555889900',
        purpose: ChallengePurpose.LOGIN,
        nonceHash,
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      (prisma.authChallenge.findUnique as jest.Mock).mockResolvedValue({
        id: challengeId,
        phone: '+213555889900',
        purpose: ChallengePurpose.LOGIN,
        status: ChallengeStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

      // 1. L'utilisateur envoie /start <nonce> au bot
      await handleTelegramUpdate({
        message: {
          chat: { id: 777777 },
          from: { id: 888888 },
          text: `/start ${nonce}`,
        },
      });

      // Le bot a bien envoyé le message avec le bouton de contact
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          body: expect.stringContaining('Partager mon contact'),
        })
      );

      // 2. L'utilisateur partage son contact
      await handleTelegramUpdate({
        message: {
          chat: { id: 777777 },
          from: { id: 888888 },
          contact: {
            user_id: 888888, // Concordant avec from.id
            phone_number: '0555889900', // Concordant avec le défi
          },
        },
      });

      // Le bot a publié telegram.contact.received
      expect(eventBus.publish).toHaveBeenCalledWith(
        'telegram.contact.received',
        expect.objectContaining({
          challengeId,
          phone: '+213555889900',
          telegramUserId: '888888',
          chatId: '777777',
        })
      );

      // L'écouteur MS1 a mis à jour le défi avec un codeHash
      expect(prisma.authChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: challengeId },
          data: expect.objectContaining({
            codeHash: expect.any(String),
          }),
        })
      );

      // Et MS1 a publié telegram.send.otp
      expect(eventBus.publish).toHaveBeenCalledWith(
        'telegram.send.otp',
        expect.objectContaining({
          chatId: '777777',
          code: expect.stringMatching(/^[0-9]{6}$/),
        })
      );
    });
  });
});
