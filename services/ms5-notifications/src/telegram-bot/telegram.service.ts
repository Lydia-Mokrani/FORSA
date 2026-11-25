import { config } from '../config/env';
import { eventBus } from '../services/event-bus';
import { maskPhone, normalizeToE164 } from '@forsa/common';

let isPolling = false;
let pollingAbortController: AbortController | null = null;
let offset = 0;

// Définition d'un défi en attente stocké en mémoire par nonce
export interface PendingChallenge {
  challengeId: string;
  phone: string;
  expiresAt?: Date | string;
}

// Mémoire des défis en attente (nonce -> { challengeId, phone, expiresAt })
export const pendingChallengesByNonce = new Map<string, PendingChallenge>();

// Mémoire des sessions de chat Telegram en attente de contact (chatId -> { challengeId, phone })
export const chatToChallengeMap = new Map<number | string, { challengeId: string; phone: string }>();

/**
 * Enregistre un défi créé reçu via le bus d'événements
 */
export function registerPendingChallenge(nonce: string, challenge: PendingChallenge): void {
  pendingChallengesByNonce.set(nonce, challenge);
}

/**
 * Supprime les webhooks actifs de Telegram pour activer le mode Long Polling
 */
export async function deleteWebhook(token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const data: any = await res.json().catch(() => ({}));
    if (data?.ok) {
      console.log('[TelegramBot] ✅ Webhook Telegram supprimé (mode Long Polling activé).');
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('[TelegramBot] ⚠️ Impossible de supprimer le webhook:', err.message);
    return false;
  }
}

/**
 * Envoie le code OTP dans un bloc officiel Telegram <pre><code> avec bouton de copie automatique
 */
export async function sendTelegramOtpCode(
  chatId: string | number,
  code: string
): Promise<boolean> {
  const token = config.telegramBotToken;
  if (!token) return false;

  const htmlText =
    `🔐 <b>FORSA — Code de vérification</b>\n\n` +
    `<pre><code>${code}</code></pre>\n` +
    `📋 <b>Copiez ce code et saisissez-le sur FORSA pour valider votre action.</b>\n\n` +
    `⏱️ <i>Valable 5 minutes. Ne partagez jamais ce code.</i>`;

  const payload: any = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '📋 Copier le code',
            copy_text: { text: code },
          },
        ],
      ],
    },
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data: any = await res.json().catch(() => ({}));

    // Détection si l'utilisateur a bloqué le bot (403 Forbidden)
    if (res.status === 403 || data?.error_code === 403 || data?.description?.includes('bot was blocked by the user')) {
      console.warn(`[TelegramBot] ⚠️ L'utilisateur (chatId: ${chatId}) a bloqué le bot (HTTP 403).`);
      return false;
    }

    return !!data.ok;
  } catch (err: any) {
    console.error('[TelegramBot] Erreur sendTelegramOtpCode:', err.message);
    return false;
  }
}

/**
 * Envoie un message texte simple ou avec boutons
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: any
): Promise<boolean> {
  const token = config.telegramBotToken;
  if (!token) return false;

  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data: any = await res.json().catch(() => ({}));

    // Détection si l'utilisateur a bloqué le bot (403 Forbidden)
    if (res.status === 403 || data?.error_code === 403 || data?.description?.includes('bot was blocked by the user')) {
      console.warn(`[TelegramBot] ⚠️ L'utilisateur (chatId: ${chatId}) a bloqué le bot (HTTP 403).`);
      return false;
    }

    return !!data.ok;
  } catch (err: any) {
    console.error('[TelegramBot] Erreur sendTelegramMessage:', err.message);
    return false;
  }
}

/**
 * Traitement d'une mise à jour Telegram reçue (Long Polling)
 */
export async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update?.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const senderId = message.from?.id;

  // ─── 1. Commande /start <nonce> ─────────────────────────────────────────────
  if (message.text && message.text.startsWith('/start')) {
    const parts = message.text.trim().split(/\s+/);
    const nonce = parts.length > 1 ? parts[1].trim() : null;

    if (!nonce) {
      const welcomeMsg = `👋 *Bienvenue sur le Bot Officiel FORSA !*\n\nLancez votre connexion ou votre action sur FORSA pour vous authentifier en toute sécurité. 🚀`;
      await sendTelegramMessage(chatId, welcomeMsg, { remove_keyboard: true });
      return;
    }

    const challenge = pendingChallengesByNonce.get(nonce);

    if (!challenge) {
      await sendTelegramMessage(
        chatId,
        '⚠️ *Lien de connexion expiré ou invalide.*\n\nVeuillez relancer la demande depuis FORSA.',
        { remove_keyboard: true }
      );
      return;
    }

    // Associer la session de ce chat au défi en attente
    chatToChallengeMap.set(chatId, {
      challengeId: challenge.challengeId,
      phone: challenge.phone,
    });

    const promptMsg =
      `👋 Bonjour !\n\n` +
      `🛡️ *Connexion sécurisée FORSA*\n` +
      `Numéro demandé : \`${challenge.phone}\`\n\n` +
      `👇 *Appuyez sur le bouton ci-dessous pour confirmer votre numéro :*`;

    await sendTelegramMessage(chatId, promptMsg, {
      keyboard: [
        [
          {
            text: '📱 Partager mon contact',
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
    return;
  }

  // ─── 2. Réception du contact partagé ────────────────────────────────────────
  if (message.contact) {
    const rawContactPhone = message.contact.phone_number;
    const contactPhone = normalizeToE164(rawContactPhone);
    const contactUserId = message.contact.user_id;

    if (!contactPhone) {
      await sendTelegramMessage(chatId, '❌ Numéro de téléphone invalide. Utilisez un numéro mobile algérien.', {
        remove_keyboard: true,
      });
      return;
    }

    // Récupérer le défi associé au chat
    const session = chatToChallengeMap.get(chatId);

    if (!session) {
      await sendTelegramMessage(
        chatId,
        '⚠️ *Session expirée ou introuvable.*\n\nVeuillez relancer votre demande sur FORSA.',
        { remove_keyboard: true }
      );
      return;
    }

    // 🔒 VÉRIFICATION 1 : Le contact partagé doit appartenir à l'émetteur (contact.user_id === from.id)
    if (contactUserId && senderId && contactUserId !== senderId) {
      await sendTelegramMessage(
        chatId,
        '❌ *Attention — Sécurité :* Le contact partagé ne correspond pas à votre propre compte Telegram. Défi annulé.',
        { remove_keyboard: true }
      );
      chatToChallengeMap.delete(chatId);
      return;
    }

    // 🔒 VÉRIFICATION 2 : Numéro normalisé === numéro du défi attendu
    const expectedPhone = session.phone;
    if (expectedPhone !== contactPhone) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[TelegramSecurity] Mismatch : Contact (${maskPhone(contactPhone)}) != Attendu (${maskPhone(expectedPhone)})`);
      }
      await sendTelegramMessage(
        chatId,
        `❌ *Numéro non concordant*\n\n` +
        `Le contact partagé ne correspond pas au numéro de la demande.\n\n` +
        `Défi annulé. Veuillez utiliser le compte Telegram correspondant à votre numéro.`,
        { remove_keyboard: true }
      );
      chatToChallengeMap.delete(chatId);
      return;
    }

    // ✅ Vérifications réussies : Publier telegram.contact.received sur le bus d'événements
    try {
      await eventBus.publish('telegram.contact.received', {
        challengeId: session.challengeId,
        phone: contactPhone,
        telegramUserId: String(senderId),
        chatId: String(chatId),
      });
    } catch (e: any) {
      console.warn('[EventBus] Erreur publish telegram.contact.received:', e.message);
    }

    // Nettoyer la session en cours
    chatToChallengeMap.delete(chatId);
  }
}

/**
 * Abonnements du bot aux événements émis par MS1
 */
export async function initTelegramBotSubscriptions(): Promise<void> {
  // Consommation des défis créés émis par MS1
  await eventBus.subscribe('telegram.challenge.created', async (event) => {
    const payload = (event.payload || event.data) as {
      challengeId: string;
      nonce: string;
      phone: string;
      expiresAt?: Date | string;
    };
    if (payload?.nonce && payload?.challengeId && payload?.phone) {
      registerPendingChallenge(payload.nonce, {
        challengeId: payload.challengeId,
        phone: payload.phone,
        expiresAt: payload.expiresAt,
      });
    }
  }, 'q.ms5-notifications.telegram.challenge.created');

  // Consommation de telegram.send.otp (avec drop si expiré)
  await eventBus.subscribe('telegram.send.otp', async (event) => {
    const otpTtlSeconds = config.otpTtlSeconds;
    if (event.occurredAt) {
      const occurredMs = new Date(event.occurredAt).getTime();
      if (!isNaN(occurredMs) && Date.now() > occurredMs + otpTtlSeconds * 1000) {
        console.warn(`[TelegramBot] ⏰ OTP expiré (émis il y a > ${otpTtlSeconds}s). Message abandonné.`);
        return;
      }
    }

    const payload = (event.payload || event.data) as {
      chatId: string | number;
      code: string;
      expiresAt?: Date | string;
      challengeId?: string;
    };
    if (payload?.chatId && payload?.code) {
      await sendTelegramOtpCode(payload.chatId, payload.code);
    }
  }, 'q.ms5-notifications.telegram.send.otp');

  // Consommation de telegram.send.message
  await eventBus.subscribe('telegram.send.message', async (event) => {
    const payload = (event.payload || event.data) as {
      chatId: string | number;
      text: string;
    };
    if (payload?.chatId && payload?.text) {
      await sendTelegramMessage(payload.chatId, payload.text, { remove_keyboard: true });
    }
  }, 'q.ms5-notifications.telegram.send.message');
}

/**
 * Effectue un cycle de long polling getUpdates
 */
export async function pollUpdatesOnce(): Promise<boolean> {
  const token = config.telegramBotToken;
  if (!token) return false;

  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`;
  const res = await fetch(url, { signal: pollingAbortController?.signal });

  if (!res.ok) {
    if (res.status === 409) {
      console.error('[TelegramBot] ❌ ERREUR 409 CONFLICT: Une autre instance du bot Telegram tourne déjà avec ce token. Arrêt immédiat.');
      isPolling = false;
      process.exit(1);
    }
    if (res.status === 401 || res.status === 404) {
      console.error('[TelegramBot] ❌ Token bot invalide (HTTP ' + res.status + '). Polling arrêté.');
      isPolling = false;
      return false;
    }
    await new Promise((r) => setTimeout(r, 3000));
    return true;
  }

  const data: any = await res.json();
  if (data?.ok && Array.isArray(data.result)) {
    for (const update of data.result) {
      offset = update.update_id + 1;
      await handleTelegramUpdate(update);
    }
  }
  return true;
}

/**
 * Démarre le polling automatique du bot Telegram (Singleton)
 */
export async function startTelegramBot(): Promise<void> {
  const token = config.telegramBotToken;
  if (!token) {
    if (config.isProduction) {
      throw new Error('FATAL: TELEGRAM_BOT_TOKEN manquant pour démarrer le bot Telegram en production.');
    }
    console.warn('[TelegramBot] ⚠️ TELEGRAM_BOT_TOKEN non configuré. Bot inactif en développement.');
    return;
  }

  if (isPolling) return;
  isPolling = true;
  pollingAbortController = new AbortController();

  // 1. Suppression préalable de tout webhook résiduel
  await deleteWebhook(token);

  console.log('[TelegramBot] 🤖 Bot Telegram actif en mode Long Polling (Singleton MS5)...');

  (async () => {
    while (isPolling) {
      try {
        const keepGoing = await pollUpdatesOnce();
        if (!keepGoing) break;
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })().catch((err) => {
    console.error('[TelegramBot] Erreur boucle polling:', err);
  });
}

/**
 * Arrête le polling proprement
 */
export function stopTelegramBot(): void {
  isPolling = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  console.log('[TelegramBot] Bot Telegram arrêté.');
}
