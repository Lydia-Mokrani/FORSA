import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { eventBus } from './event-bus';
import { normalizeToE164 } from '../utils/phone';
import { hashString } from './challenge.service';
import { ChallengePurpose, ChallengeStatus } from '@prisma/client';

let isPolling = false;
let pollingAbortController: AbortController | null = null;

// Mémoire des sessions de chat Telegram en attente de contact (chatId -> challengeId)
export const chatToChallengeMap = new Map<number | string, string>();

/**
 * Met à jour le flag telegramBlocked = true pour l'utilisateur associé au chatId
 */
export async function handleBotBlockedByUser(chatId: string | number): Promise<void> {
  try {
    await prisma.user.updateMany({
      where: { telegramChatId: String(chatId) },
      data: { telegramBlocked: true },
    });
    console.warn(`[TelegramService] L'utilisateur (chatId: ${chatId}) a bloqué le bot. telegram_blocked = true.`);
  } catch (err: any) {
    console.error('[TelegramService] Erreur mise à jour telegram_blocked:', err.message);
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
      await handleBotBlockedByUser(chatId);
      return false;
    }

    return !!data.ok;
  } catch (err: any) {
    console.error('[TelegramService] Erreur sendTelegramOtpCode:', err.message);
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
      await handleBotBlockedByUser(chatId);
      return false;
    }

    return !!data.ok;
  } catch (err: any) {
    console.error('[TelegramService] Erreur sendTelegramMessage:', err.message);
    return false;
  }
}

/**
 * Traitement d'une mise à jour Telegram reçue (Webhook ou Long Polling)
 */
export async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update.message;
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

    const nonceHash = hashString(nonce);
    const challenge = await prisma.authChallenge.findFirst({
      where: {
        nonceHash,
        status: ChallengeStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (!challenge) {
      await sendTelegramMessage(
        chatId,
        '⚠️ *Lien de connexion expiré ou invalide.*\n\nVeuillez relancer la demande depuis FORSA.',
        { remove_keyboard: true }
      );
      return;
    }

    chatToChallengeMap.set(chatId, challenge.id);

    const isChangePhone = challenge.purpose === ChallengePurpose.CHANGE_PHONE;
    const promptMsg = isChangePhone
      ? `👋 Bonjour !\n\n` +
        `🔄 *Mise à jour de votre numéro FORSA*\n` +
        `Nouveau numéro demandé : \`${challenge.phone}\`\n\n` +
        `👇 *Appuyez sur le bouton ci-dessous pour confirmer que vous possédez ce numéro :*`
      : `👋 Bonjour !\n\n` +
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
    let challengeId = chatToChallengeMap.get(chatId);
    let challenge: any = null;

    if (challengeId) {
      challenge = await prisma.authChallenge.findUnique({ where: { id: challengeId } });
    }

    if (!challenge || challenge.status !== ChallengeStatus.PENDING || challenge.expiresAt <= new Date()) {
      challenge = await prisma.authChallenge.findFirst({
        where: {
          phone: contactPhone,
          status: ChallengeStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!challenge) {
      await sendTelegramMessage(
        chatId,
        '⚠️ *Session expirée ou introuvable.*\n\nVeuillez relancer votre demande sur FORSA.',
        { remove_keyboard: true }
      );
      return;
    }

    // 🔒 VÉRIFICATION 1 : Le contact partagé doit appartenir à l'émetteur (contact.user_id === from.id)
    if (contactUserId && senderId && contactUserId !== senderId) {
      // Défi FAILED + message clair
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { status: ChallengeStatus.FAILED },
      }).catch(() => {});

      await sendTelegramMessage(
        chatId,
        '❌ *Attention — Sécurité :* Le contact partagé ne correspond pas à votre propre compte Telegram. Défi annulé.',
        { remove_keyboard: true }
      );
      chatToChallengeMap.delete(chatId);
      return;
    }

    // 🔒 VÉRIFICATION 2 : Numéro normalisé === numéro du défi (ou newPhone pour CHANGE_PHONE)
    const expectedPhone = challenge.newPhone || challenge.phone;
    if (expectedPhone !== contactPhone) {
      // Défi FAILED + message clair
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { status: ChallengeStatus.FAILED },
      }).catch(() => {});

      console.warn(`[TelegramSecurity] Mismatch : Contact (${contactPhone}) != Attendu (${expectedPhone})`);
      await sendTelegramMessage(
        chatId,
        `❌ *Numéro non concordant*\n\n` +
        `Le contact partagé (\`${contactPhone}\`) ne correspond pas au numéro de la demande (\`${expectedPhone}\`).\n\n` +
        `Défi annulé. Veuillez utiliser le compte Telegram correspondant à votre numéro.`,
        { remove_keyboard: true }
      );
      chatToChallengeMap.delete(chatId);
      return;
    }

    // ✅ Vérifications réussies : Publier telegram.contact.received sur le bus d'événements
    // Le module bot est isolé : il ne fait aucune mutation métier directe et ne génère aucun code.
    await eventBus.publish('telegram.contact.received', {
      challengeId: challenge.id,
      phone: contactPhone,
      telegramUserId: String(senderId),
      chatId: String(chatId),
    }).catch((e) => console.warn('[EventBus] Erreur publish telegram.contact.received:', e.message));

    // Nettoyer la session en cours
    chatToChallengeMap.delete(chatId);
  }
}

/**
 * Abonnements du bot aux événements émis par MS1
 */
export async function initTelegramBotSubscriptions(): Promise<void> {
  // Consommation de telegram.send.otp
  await eventBus.subscribe('telegram.send.otp', async (event) => {
    const payload = (event.payload || event.data) as {
      chatId: string | number;
      code: string;
      expiresAt?: Date | string;
      challengeId?: string;
    };
    if (payload?.chatId && payload?.code) {
      await sendTelegramOtpCode(payload.chatId, payload.code);
    }
  });

  // Consommation de telegram.send.message
  await eventBus.subscribe('telegram.send.message', async (event) => {
    const payload = (event.payload || event.data) as {
      chatId: string | number;
      text: string;
    };
    if (payload?.chatId && payload?.text) {
      await sendTelegramMessage(payload.chatId, payload.text, { remove_keyboard: true });
    }
  });
}

/**
 * Démarre le polling automatique du bot Telegram en arrière-plan
 */
export async function startTelegramBot(): Promise<void> {
  const token = config.telegramBotToken;
  if (!token) {
    console.log('[TelegramService] TELEGRAM_BOT_TOKEN non configuré. Bot désactivé.');
    return;
  }

  if (isPolling) return;
  isPolling = true;
  pollingAbortController = new AbortController();

  console.log('[TelegramService] 🤖 Bot Telegram actif en mode Long Polling...');

  let offset = 0;

  (async () => {
    while (isPolling) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`;
        const res = await fetch(url, { signal: pollingAbortController?.signal });
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            console.error('[TelegramService] Token bot invalide. Polling arrêté.');
            isPolling = false;
            break;
          }
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const data: any = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            await handleTelegramUpdate(update);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })().catch((err) => {
    console.error('[TelegramService] Erreur boucle polling:', err);
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
  console.log('[TelegramService] Bot Telegram arrêté.');
}
