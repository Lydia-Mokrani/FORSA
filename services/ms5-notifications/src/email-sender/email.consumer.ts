import { eventBus } from '../services/event-bus';
import { config } from '../config/env';
import { IEmailSender, EmailTemplate } from './email.interface';
import { SmtpEmailSender } from './smtp.sender';
import { LogMaskedEmailSender } from './log-masked.sender';
import { maskEmail } from '@forsa/common';

// Mémoire des événements traités pour idempotence (eventId -> timestamp)
const processedEventIds = new Map<string, number>();
const MAX_PROCESSED_EVENTS = 5000;
const DEDUPLICATION_TTL_MS = 24 * 3600 * 1000;

function cleanupProcessedEvents(): void {
  const now = Date.now();
  for (const [id, ts] of processedEventIds.entries()) {
    if (now - ts > DEDUPLICATION_TTL_MS) {
      processedEventIds.delete(id);
    }
  }
}

export function createEmailSender(): IEmailSender {
  if (config.emailDriver === 'smtp') {
    return new SmtpEmailSender();
  }
  return new LogMaskedEmailSender();
}

export const emailSender: IEmailSender = createEmailSender();

export interface EmailSendPayload {
  eventId?: string;
  to: string;
  template: EmailTemplate;
  locale?: string;
  code?: string;
  delayHours?: number;
  data?: {
    code?: string;
    delayHours?: number;
    [key: string]: any;
  };
}

const VALID_TEMPLATES: EmailTemplate[] = [
  'verify',
  'recovery',
  'phone-changed',
  'phone-change-pending',
];

/**
 * Initialise l'écoute de l'événement email.send émis par MS1
 */
export async function initEmailSubscriptions(): Promise<void> {
  await eventBus.subscribe(
    'email.send',
    async (event) => {
      const payload = (event.payload || event.data) as EmailSendPayload;
      if (!payload || !payload.to) {
        console.warn('[EmailConsumer] ⚠️ Message email.send invalide (destinataire manquant) ignoré.');
        return;
      }

      // Règle métier : tout template inconnu est routé vers la Dead-Letter Queue (DLQ)
      if (!VALID_TEMPLATES.includes(payload.template)) {
        throw new Error(`Unknown email template: "${payload.template}". Message routé vers Dead-Letter Queue.`);
      }

      const eventId = payload.eventId || (event as any).id || (event as any).eventId;
      if (eventId) {
        if (processedEventIds.has(eventId)) {
          console.log(`[EmailConsumer] ℹ️ Événement dupliqué ignoré (eventId=${eventId}).`);
          return;
        }

        if (processedEventIds.size >= MAX_PROCESSED_EVENTS) {
          cleanupProcessedEvents();
        }
        processedEventIds.set(eventId, Date.now());
      }

      const code = payload.code ?? payload.data?.code;
      const delayHours = payload.delayHours ?? payload.data?.delayHours;

      // Vérification d'expiration : message expiration = code TTL
      if (event.occurredAt && code) {
        const occurredMs = new Date(event.occurredAt).getTime();
        const ttlSeconds =
          payload.template === 'recovery'
            ? config.emailRecoveryTtlSeconds
            : config.emailVerifyTtlSeconds;

        if (!isNaN(occurredMs) && Date.now() > occurredMs + ttlSeconds * 1000) {
          console.warn(
            `[EmailConsumer] ⏰ Code e-mail expiré (émis il y a > ${ttlSeconds}s) pour ${maskEmail(
              payload.to
            )}. Message abandonné.`
          );
          return;
        }
      }

      // Envoi sécurisé via le driver sélectionné
      try {
        await emailSender.send({
          to: payload.to,
          template: payload.template,
          code,
          delayHours,
          data: payload.data,
          locale: payload.locale,
        });
      } catch (err: any) {
        console.error(
          `[EmailConsumer] Erreur lors de l'envoi de l'e-mail à ${maskEmail(payload.to)}:`,
          err.message
        );
      }
    },
    'q.ms5-notifications.email.send'
  );

  console.log('[EmailConsumer] 📧 Consommateur email.send initialisé sur q.ms5-notifications.email.send.');
}
