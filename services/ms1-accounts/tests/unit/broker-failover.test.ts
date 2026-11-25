import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { eventBus } from '../../src/services/event-bus';
import { initAuthEventListeners } from '../../src/events/auth-events.listener';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    authChallenge: {
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('../../src/services/event-bus', () => ({
  eventBus: {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    isBrokerUp: jest.fn().mockReturnValue(true),
  },
}));

describe('LOT 5B-2: MS1 Failure Behaviour & Competing Consumer Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (eventBus.isBrokerUp as jest.Mock).mockReturnValue(true);
    (prisma.authChallenge.count as jest.Mock).mockResolvedValue(0);
  });

  describe('1. Broker Down Failure Behaviour', () => {
    it('doit renvoyer HTTP 503 BROKER_UNAVAILABLE immédiatement si le broker est déconnecté (isBrokerUp = false)', async () => {
      (eventBus.isBrokerUp as jest.Mock).mockReturnValue(false);

      const res = await request(app)
        .post('/api/auth/telegram/start')
        .send({ phone: '+213555123456' });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('BROKER_UNAVAILABLE');
      expect(res.body.message).toContain('indisponible');
      // Aucun challenge ne doit être créé si le broker est déjà down
      expect(prisma.authChallenge.create).not.toHaveBeenCalled();
    });

    it('doit renvoyer HTTP 503 BROKER_UNAVAILABLE si la publication échoue avec BROKER_UNAVAILABLE', async () => {
      (eventBus.isBrokerUp as jest.Mock).mockReturnValue(true);
      (prisma.authChallenge.create as jest.Mock).mockResolvedValue({
        id: 'chal-failover-1',
        phone: '+213555123456',
        purpose: ChallengePurpose.LOGIN,
        nonceHash: 'some-nonce-hash',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        status: ChallengeStatus.PENDING,
      });

      (eventBus.publish as jest.Mock).mockRejectedValueOnce(
        new Error('BROKER_UNAVAILABLE: RabbitMQ channel is not connected')
      );

      const res = await request(app)
        .post('/api/auth/telegram/start')
        .send({ phone: '+213555123456' });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('BROKER_UNAVAILABLE');
    });
  });

  describe('2. MS5 Down / Async Queue Behaviour', () => {
    it('quand MS5 est éteint mais que le broker fonctionne, /start crée le challenge et publie sur le bus', async () => {
      (eventBus.isBrokerUp as jest.Mock).mockReturnValue(true);
      (prisma.authChallenge.create as jest.Mock).mockResolvedValue({
        id: 'chal-async-1',
        phone: '+213555123456',
        purpose: ChallengePurpose.LOGIN,
        nonceHash: 'nonce-hash-xyz',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        status: ChallengeStatus.PENDING,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr-returning-1',
        phoneE164: '+213555123456',
        telegramChatId: 'tg-chat-999',
      });

      const res = await request(app)
        .post('/api/auth/telegram/start')
        .send({ phone: '+213555123456' });

      expect(res.status).toBe(200);
      expect(res.body.challengeId).toBe('chal-async-1');
      expect(res.body.deepLink).toContain('https://t.me/');

      // Publication du défi créé avec condensat SHA-256 (JAMAIS le nonce brut)
      expect(eventBus.publish).toHaveBeenCalledWith(
        'telegram.challenge.created',
        expect.objectContaining({
          challengeId: 'chal-async-1',
          nonceHash: expect.any(String),
          phone: '+213555123456',
        })
      );

      // Sécurité : Vérifier formellement que l'événement ne contient PAS le nonce brut
      const challengeEventCall = (eventBus.publish as jest.Mock).mock.calls.find(
        (call) => call[0] === 'telegram.challenge.created'
      );
      expect(challengeEventCall).toBeDefined();
      expect(challengeEventCall[1].nonce).toBeUndefined();
      expect(challengeEventCall[1].nonceHash).toBeDefined();

      // Publication de l'OTP en attente dans la file pour MS5
      expect(eventBus.publish).toHaveBeenCalledWith(
        'telegram.send.otp',
        expect.objectContaining({
          chatId: 'tg-chat-999',
          code: expect.stringMatching(/^[0-9]{6}$/),
          challengeId: 'chal-async-1',
        })
      );
    });
  });

  describe('3. File Partagée (Competing Consumer Queue)', () => {
    it('doit s\'abonner à telegram.contact.received sur la file q.ms1-accounts.telegram.contact.received', async () => {
      await initAuthEventListeners();

      expect(eventBus.subscribe).toHaveBeenCalledWith(
        'telegram.contact.received',
        expect.any(Function),
        'q.ms1-accounts.telegram.contact.received'
      );
    });
  });
});
