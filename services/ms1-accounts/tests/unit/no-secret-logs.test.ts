import { createAuthChallenge } from '../../src/services/challenge.service';
import { maskPhone } from '../../src/utils/mask-phone';
import { prisma } from '../../src/config/prisma';
import { eventBus } from '../../src/services/event-bus';
import { UserController } from '../../src/controllers/user.controller';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';

describe('Audit Sécurité : Aucun code OTP, nonce ou deep link dans les logs', () => {
  let logSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function getAllLoggedText(): string {
    const calls = [
      ...logSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ];
    return calls.map((c) => c.join(' ')).join('\n');
  }

  describe('Fonction maskPhone', () => {
    it('doit masquer le numéro en préservant les 4 premiers et 2 derniers caractères', () => {
      expect(maskPhone('+213555123456')).toBe('+213*******56');
      expect(maskPhone('+213770987654')).toBe('+213*******54');
    });
  });

  describe('Création de défi (Login / Register)', () => {
    it('ne doit JAMAIS afficher le nonce ni le deep link dans la console en développement', async () => {
      jest.spyOn(prisma.authChallenge, 'create').mockResolvedValueOnce({
        id: 'chal-test-sec-1',
        phone: '+213555123456',
        purpose: ChallengePurpose.LOGIN,
        nonceHash: 'hash-nonce-123',
        codeHash: null,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        status: ChallengeStatus.PENDING,
        userId: null,
        newPhone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await createAuthChallenge('+213555123456', ChallengePurpose.LOGIN);

      const logs = getAllLoggedText();

      // Vérifie que le nonce n'apparaît dans aucun log
      expect(logs).not.toContain(result.nonce);
      // Vérifie que le deepLink contenant le nonce n'apparaît pas
      expect(logs).not.toContain(result.deepLink);
      expect(logs).not.toContain(`?start=${result.nonce}`);
      expect(logs).not.toContain('start=');
      // Vérifie que le numéro est masqué
      expect(logs).toContain('+213*******56');
      expect(logs).not.toContain('+213555123456');
    });
  });

  describe('Changement de numéro de téléphone (Sensitive Action)', () => {
    it('ne doit JAMAIS afficher le code OTP à 6 chiffres dans les logs', async () => {
      const mockUser = {
        id: 'usr-phone-change-1',
        phoneE164: '+213555987654',
        telegramChatId: '987654321',
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(mockUser as any);
      jest.spyOn(prisma.authChallenge, 'create').mockResolvedValueOnce({
        id: 'chal-phone-change-1',
        expiresAt: new Date(Date.now() + 300000),
      } as any);
      jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(undefined);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({} as any);

      const req: any = {
        user: { sub: 'usr-phone-change-1' },
        body: { newPhone: '+213666112233' },
        ip: '127.0.0.1',
        headers: {},
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await UserController.changePhoneStart(req, res, next);

      const logs = getAllLoggedText();

      // Vérifie qu'aucun code à 6 chiffres ne figure dans les logs
      const sixDigitRegex = /\b\d{6}\b/;
      expect(logs).not.toMatch(sixDigitRegex);
      // Vérifie que l'ancien numéro est masqué
      expect(logs).toContain('+213*******54');
      expect(logs).not.toContain('+213555987654');
    });
  });
});
