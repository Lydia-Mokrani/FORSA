import {
  handleTelegramUpdate,
  sendTelegramOtpCode,
  sendTelegramMessage,
  deleteWebhook,
  pollUpdatesOnce,
  startTelegramBot,
  stopTelegramBot,
  registerPendingChallenge,
  pendingChallengesByNonce,
  chatToChallengeMap,
  initTelegramBotSubscriptions,
} from '../src/telegram-bot/telegram.service';
import { eventBus } from '../src/services/event-bus';
import { config } from '../src/config/env';

// Mock global de fetch pour simuler l'API Telegram
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock de l'eventBus
jest.mock('../src/services/event-bus', () => ({
  eventBus: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    isBrokerUp: jest.fn().mockReturnValue(true),
  },
}));

describe('MS5 Telegram Bot Unit Tests', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    pendingChallengesByNonce.clear();
    chatToChallengeMap.clear();

    config.telegramBotToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    config.telegramBotUsername = 'forsa_auth_bot';

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: [] }),
    });
  });

  afterEach(() => {
    stopTelegramBot();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('1. Validation du contact émetteur (Sécurité)', () => {
    it('doit refuser et annuler le défi si contact.user_id !== from.id (partage de contact tiers)', async () => {
      const nonce = 'nonce-test-123';
      registerPendingChallenge(nonce, {
        challengeId: 'chal-1',
        phone: '+213555112233',
      });

      // 1. Commande /start <nonce>
      await handleTelegramUpdate({
        message: {
          chat: { id: 1001 },
          from: { id: 9999 },
          text: `/start ${nonce}`,
        },
      });

      expect(chatToChallengeMap.get(1001)).toBeDefined();

      // 2. Partage d'une carte contact appartenant à quelqu'un d'autre (user_id 8888 !== 9999)
      await handleTelegramUpdate({
        message: {
          chat: { id: 1001 },
          from: { id: 9999 },
          contact: {
            user_id: 8888,
            phone_number: '0555112233',
          },
        },
      });

      // Ne doit PAS publier sur le bus
      expect(eventBus.publish).not.toHaveBeenCalledWith('telegram.contact.received', expect.anything());

      // La session doit être effacée
      expect(chatToChallengeMap.get(1001)).toBeUndefined();

      // Message d'erreur Telegram envoyé
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          body: expect.stringContaining('ne correspond pas à votre propre compte Telegram'),
        })
      );
    });

    it('doit refuser le défi si le numéro de téléphone ne correspond pas au numéro attendu', async () => {
      const nonce = 'nonce-phone-mismatch';
      registerPendingChallenge(nonce, {
        challengeId: 'chal-2',
        phone: '+213555112233', // Attendu
      });

      // 1. /start <nonce>
      await handleTelegramUpdate({
        message: {
          chat: { id: 1002 },
          from: { id: 9999 },
          text: `/start ${nonce}`,
        },
      });

      // 2. Partage du contact avec un numéro différent (0666998877)
      await handleTelegramUpdate({
        message: {
          chat: { id: 1002 },
          from: { id: 9999 },
          contact: {
            user_id: 9999, // user_id correspond
            phone_number: '0666998877', // numéro ne correspond pas
          },
        },
      });

      // Ne doit PAS publier telegram.contact.received
      expect(eventBus.publish).not.toHaveBeenCalledWith('telegram.contact.received', expect.anything());

      // La session est purgée
      expect(chatToChallengeMap.get(1002)).toBeUndefined();

      // Message d'avertissement envoyé à l'utilisateur
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          body: expect.stringContaining('Numéro non concordant'),
        })
      );
    });

    it('doit publier telegram.contact.received si contact.user_id === from.id et numéro concordant', async () => {
      const nonce = 'nonce-valid-flow';
      registerPendingChallenge(nonce, {
        challengeId: 'chal-valid-1',
        phone: '+213555889900',
      });

      await handleTelegramUpdate({
        message: {
          chat: { id: 2001 },
          from: { id: 7777 },
          text: `/start ${nonce}`,
        },
      });

      await handleTelegramUpdate({
        message: {
          chat: { id: 2001 },
          from: { id: 7777 },
          contact: {
            user_id: 7777,
            phone_number: '0555889900',
          },
        },
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'telegram.contact.received',
        expect.objectContaining({
          challengeId: 'chal-valid-1',
          phone: '+213555889900',
          telegramUserId: '7777',
          chatId: '2001',
        })
      );
      expect(chatToChallengeMap.get(2001)).toBeUndefined();
    });
  });

  describe('2. Consommation OTP & Gestion du TTL / Expiration', () => {
    it('doit consommer telegram.send.otp et appeler sendMessage avec bloc pre code', async () => {
      let otpHandler: any = null;
      (eventBus.subscribe as jest.Mock).mockImplementation((topic, handler) => {
        if (topic === 'telegram.send.otp') {
          otpHandler = handler;
        }
      });

      await initTelegramBotSubscriptions();
      expect(otpHandler).toBeDefined();

      await otpHandler({
        eventId: 'evt-otp-1',
        type: 'telegram.send.otp',
        name: 'telegram.send.otp',
        occurredAt: new Date().toISOString(),
        payload: {
          chatId: '2001',
          code: '849201',
          challengeId: 'chal-1',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.objectContaining({
          body: expect.stringContaining('<pre><code>849201</code></pre>'),
        })
      );
    });

    it('doit abandonner silencieusement un OTP expiré (occurredAt + TTL dépassé)', async () => {
      let otpHandler: any = null;
      (eventBus.subscribe as jest.Mock).mockImplementation((topic, handler) => {
        if (topic === 'telegram.send.otp') {
          otpHandler = handler;
        }
      });

      await initTelegramBotSubscriptions();

      // Horodatage vieux de 10 minutes (TTL = 300s / 5 min)
      const oldDate = new Date(Date.now() - 600 * 1000).toISOString();

      await otpHandler({
        eventId: 'evt-otp-expired',
        type: 'telegram.send.otp',
        name: 'telegram.send.otp',
        occurredAt: oldDate,
        payload: {
          chatId: '2001',
          code: '123456',
        },
      });

      // Aucun message ne doit être envoyé sur Telegram
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage'),
        expect.anything()
      );
    });
  });

  describe('3. Gestion des Erreurs Telegram (409 Conflict & 403 Forbidden)', () => {
    it('doit logger une erreur claire et appeler process.exit(1) sur HTTP 409 Conflict', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`process.exit called with ${code}`);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ ok: false, error_code: 409, description: 'Conflict: terminated by other getUpdates' }),
      });

      await expect(pollUpdatesOnce()).rejects.toThrow('process.exit called with 1');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERREUR 409 CONFLICT')
      );

      exitSpy.mockRestore();
    });

    it('sur HTTP 403 Forbidden (bot bloqué), doit logger un avertissement sans crasher', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }),
      });

      const result = await sendTelegramOtpCode('12345', '654321');
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 403'));
    });
  });

  describe('4. Confidentialité des Journaux (Aucun Code / Nonce / DeepLink dans les logs)', () => {
    it('ne doit jamais journaliser de code à 6 chiffres ni de nonce en clair', async () => {
      const nonce = 'secret-nonce-1234567890abcdef';
      registerPendingChallenge(nonce, {
        challengeId: 'chal-secret',
        phone: '+213555123456',
      });

      await handleTelegramUpdate({
        message: {
          chat: { id: 3001 },
          from: { id: 1111 },
          text: `/start ${nonce}`,
        },
      });

      await handleTelegramUpdate({
        message: {
          chat: { id: 3001 },
          from: { id: 1111 },
          contact: {
            user_id: 1111,
            phone_number: '0555123456',
          },
        },
      });

      await sendTelegramOtpCode(3001, '998877');

      const allLogged = [
        ...logSpy.mock.calls.flat(),
        ...warnSpy.mock.calls.flat(),
        ...errorSpy.mock.calls.flat(),
      ].join(' ');

      // Le code OTP secret ne doit jamais apparaître dans les logs
      expect(allLogged).not.toContain('998877');
      // Le nonce ne doit jamais être affiché
      expect(allLogged).not.toContain(nonce);
      // Le numéro complet ne doit pas fuiter non masqué
      expect(allLogged).not.toContain('+213555123456');
    });
  });
});
