import { renderEmail } from '../src/email-sender/email.templates';
import { LogMaskedEmailSender } from '../src/email-sender/log-masked.sender';
import { SmtpEmailSender } from '../src/email-sender/smtp.sender';
import { eventBus } from '../src/services/event-bus';
import { initEmailSubscriptions, emailSender } from '../src/email-sender/email.consumer';

jest.mock('../src/services/event-bus', () => ({
  eventBus: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    isBrokerUp: jest.fn().mockReturnValue(true),
  },
}));

describe('MS5 Email Sender & Consumer Tests', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('1. Rendu des modèles d’e-mails (Templates)', () => {
    it('doit rendre correctement le template verify (FR & AR) avec code', () => {
      const renderedFr = renderEmail('verify', { code: '123456' }, 'fr');
      expect(renderedFr.subject).toContain('Vérification');
      expect(renderedFr.text).toContain('123456');
      expect(renderedFr.html).toContain('123456');

      const renderedAr = renderEmail('verify', { code: '654321' }, 'ar');
      expect(renderedAr.subject).toContain('تأكيد');
      expect(renderedAr.text).toContain('654321');
    });

    it('doit rendre correctement le template recovery (FR & AR)', () => {
      const renderedFr = renderEmail('recovery', { code: '999888' }, 'fr');
      expect(renderedFr.subject).toContain('Récupération');
      expect(renderedFr.text).toContain('999888');

      const renderedAr = renderEmail('recovery', { code: '999888' }, 'ar');
      expect(renderedAr.subject).toContain('استعادة');
    });

    it('doit rendre le template phone-changed sans code', () => {
      const rendered = renderEmail('phone-changed', {}, 'fr');
      expect(rendered.subject).toContain('mis à jour');
      expect(rendered.text).toContain('mis à jour avec succès');
    });

    it('doit rendre le template phone-change-pending avec le délai commerçant', () => {
      const rendered = renderEmail('phone-change-pending', { delayHours: 48 }, 'fr');
      expect(rendered.subject).toContain('en attente');
      expect(rendered.text).toContain('48 heures');
      expect(rendered.html).toContain('48 heures');
    });

    it('doit lever une exception sur un template inconnu', () => {
      expect(() => renderEmail('unknown-template' as any, {})).toThrow('Unknown email template');
    });
  });

  describe('2. Drivers Email & Confidentialité', () => {
    it('LogMaskedEmailSender doit masquer l’e-mail et ne JAMAIS journaliser le code OTP', async () => {
      const sender = new LogMaskedEmailSender();
      const success = await sender.send({
        to: 'kamel.boutique@gmail.com',
        template: 'verify',
        code: '584920',
      });

      expect(success).toBe(true);

      const allLogs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(allLogs).toContain('k***@g***.com');
      expect(allLogs).not.toContain('kamel.boutique@gmail.com');
      expect(allLogs).not.toContain('584920');
    });

    it('SmtpEmailSender bascule sur log-masked en dev si SMTP_HOST est absent', async () => {
      const sender = new SmtpEmailSender();
      const success = await sender.send({
        to: 'test.user@forsa.dz',
        template: 'recovery',
        code: '123123',
      });
      expect(success).toBe(true);
      const allLogs = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(allLogs).toContain('t***@f***.dz');
      expect(allLogs).not.toContain('123123');
    });
  });

  describe('3. Consommation RabbitMQ email.send & Idempotence & Expiration & DLQ', () => {
    let emailHandler: any = null;

    beforeAll(async () => {
      (eventBus.subscribe as jest.Mock).mockImplementation((topic, handler) => {
        if (topic === 'email.send') {
          emailHandler = handler;
        }
      });
      await initEmailSubscriptions();
    });

    it('doit consommer email.send et appeler le sender', async () => {
      const sendSpy = jest.spyOn(emailSender, 'send').mockResolvedValue(true);

      expect(emailHandler).toBeDefined();
      await emailHandler({
        eventId: 'evt-test-100',
        name: 'email.send',
        type: 'email.send',
        occurredAt: new Date().toISOString(),
        payload: {
          eventId: 'evt-test-100',
          to: 'user@example.com',
          template: 'verify',
          code: '112233',
        },
      });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          template: 'verify',
          code: '112233',
        })
      );
      sendSpy.mockRestore();
    });

    it('doit router un template inconnu vers DLQ en levant une erreur', async () => {
      await expect(
        emailHandler({
          eventId: 'evt-invalid-tpl',
          name: 'email.send',
          type: 'email.send',
          occurredAt: new Date().toISOString(),
          payload: {
            eventId: 'evt-invalid-tpl',
            to: 'user@example.com',
            template: 'unsupported-template' as any,
          },
        })
      ).rejects.toThrow('Unknown email template');
    });

    it('doit ignorer silencieusement un événement avec le même eventId (idempotence)', async () => {
      const sendSpy = jest.spyOn(emailSender, 'send').mockResolvedValue(true);

      const event = {
        eventId: 'evt-idempotent-200',
        name: 'email.send',
        type: 'email.send',
        occurredAt: new Date().toISOString(),
        payload: {
          eventId: 'evt-idempotent-200',
          to: 'dup@example.com',
          template: 'verify' as const,
          code: '778899',
        },
      };

      await emailHandler(event);
      expect(sendSpy).toHaveBeenCalledTimes(1);

      // Deuxième publication identique
      await emailHandler(event);
      expect(sendSpy).toHaveBeenCalledTimes(1); // Pas d'appel supplémentaire

      sendSpy.mockRestore();
    });

    it('doit abandonner un e-mail dont le code est expiré (occurredAt + TTL dépassé)', async () => {
      const sendSpy = jest.spyOn(emailSender, 'send').mockResolvedValue(true);

      // Émis il y a 20 minutes (TTL 10 min dépassé)
      const expiredDate = new Date(Date.now() - 20 * 60 * 1000).toISOString();

      await emailHandler({
        eventId: 'evt-expired-300',
        name: 'email.send',
        type: 'email.send',
        occurredAt: expiredDate,
        payload: {
          eventId: 'evt-expired-300',
          to: 'expired@example.com',
          template: 'verify',
          code: '445566',
        },
      });

      expect(sendSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('expiré'));

      sendSpy.mockRestore();
    });
  });
});
