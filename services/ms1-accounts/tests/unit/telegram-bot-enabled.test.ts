import { startTelegramBot } from '../../src/services/telegram.service';
import { config } from '../../src/config/env';

describe('TELEGRAM_BOT_ENABLED & Gestion Multi-Instances', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  describe('Validation & Fail-Fast en Production', () => {
    it('doit échouer immédiatement en production si TELEGRAM_BOT_ENABLED n\'est pas défini explicitement', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.TELEGRAM_BOT_ENABLED;
      process.env.TELEGRAM_BOT_USERNAME = 'forsa_auth_bot';
      process.env.GEOCODER_USER_AGENT = 'forsa-prod/1.0';

      // Recharger env.ts pour tester le fail-fast
      jest.isolateModules(() => {
        expect(() => {
          require('../../src/config/env');
        }).toThrow(/TELEGRAM_BOT_ENABLED est obligatoire en environnement de production/);
      });
    });

    it('doit accepter TELEGRAM_BOT_ENABLED=true et TELEGRAM_BOT_ENABLED=false en production', () => {
      process.env.NODE_ENV = 'production';
      process.env.TELEGRAM_BOT_USERNAME = 'forsa_auth_bot';
      process.env.GEOCODER_USER_AGENT = 'forsa-prod/1.0';

      process.env.TELEGRAM_BOT_ENABLED = 'true';
      jest.isolateModules(() => {
        const { config: prodConfig } = require('../../src/config/env');
        expect(prodConfig.telegramBotEnabled).toBe(true);
      });

      process.env.TELEGRAM_BOT_ENABLED = 'false';
      jest.isolateModules(() => {
        const { config: prodConfig } = require('../../src/config/env');
        expect(prodConfig.telegramBotEnabled).toBe(false);
      });
    });

    it('doit par défaut être true en développement quand la variable est omise', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.TELEGRAM_BOT_ENABLED;

      jest.isolateModules(() => {
        const { config: devConfig } = require('../../src/config/env');
        expect(devConfig.telegramBotEnabled).toBe(true);
      });
    });
  });

  describe('Démarrage conditionnel du bot (startTelegramBot)', () => {
    it('ne doit PAS démarrer le polling quand config.telegramBotEnabled = false', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const fetchSpy = jest.spyOn(global, 'fetch');

      const originalVal = config.telegramBotEnabled;
      (config as any).telegramBotEnabled = false;

      await startTelegramBot();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('TELEGRAM_BOT_ENABLED=false')
      );

      (config as any).telegramBotEnabled = originalVal;
    });
  });
});
