import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { eventBus } from './event-bus';
import { normalizeToE164 } from '../utils/phone';
import { hashString } from './challenge.service';
import { ChallengeStatus } from '@prisma/client';

let isPolling = false;
let pollingAbortController: AbortController | null = null;

// Mémoire des sessions de chat Telegram en attente de contact
const chatToChallengeMap = new Map<number | string, string>();

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
    `📋 <b>Copiez ce code et saisissez-le sur FORSA pour valider votre connexion.</b>\n\n` +
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
    const data: any = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error('[TelegramService] Erreur sendTelegramOtpCode:', err);
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
    const data: any = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error('[TelegramService] Erreur sendTelegramMessage:', err);
    return false;
  }
}

/**
 * Traitement des mises à jour Telegram (long polling)
 */
async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const senderId = message.from?.id;

  // ─── 1. L'utilisateur partage son contact ──────────────────────────────────
  if (message.contact) {
    const rawContactPhone = message.contact.phone_number;
    const contactPhone = normalizeToE164(rawContactPhone);
    const contactUserId = message.contact.user_id;

    // Vérification de sécurité : contact.user_id == from.id
    if (contactUserId && senderId && contactUserId !== senderId) {
      await sendTelegramMessage(
        chatId,
        '❌ *Attention :* Ce contact ne correspond pas à votre compte Telegram. Veuillez partager votre propre contact.',
        { remove_keyboard: true }
      );
      return;
    }

    // Trouver le défi en attente
    let challengeId = chatToChallengeMap.get(chatId);
    let challenge: any = null;

    if (challengeId) {
      challenge = await prisma.authChallenge.findUnique({ where: { id: challengeId } });
    }

    if (!challenge || challenge.status !== ChallengeStatus.PENDING || challenge.expiresAt <= new Date()) {
      // Recherche alternative par numéro de téléphone
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
        '⚠️ *Session expirée ou introuvable.*\n\nVeuillez relancer la connexion sur FORSA pour obtenir un nouveau code.',
        { remove_keyboard: true }
      );
      return;
    }

    // Contrôle strict de concordance du numéro
    if (challenge.phone !== contactPhone) {
      console.warn(`[TelegramSecurity] Mismatch : Telegram (${contactPhone}) != Défi (${challenge.phone})`);
      await sendTelegramMessage(
        chatId,
        `❌ *Numéro non concordant*\n\n` +
        `Votre compte Telegram est associé au numéro \`${contactPhone}\`, ` +
        `mais vous avez demandé une connexion pour \`${challenge.phone}\`.\n\n` +
        `Veuillez utiliser le même numéro sur FORSA.`,
        { remove_keyboard: true }
      );
      return;
    }

    // Émettre l'événement RabbitMQ / InMemory telegram.contact.received (spec §8)
    await eventBus.publish('telegram.contact.received', {
      phone: contactPhone,
      telegramUserId: String(senderId),
      chatId: String(chatId),
      challengeId: challenge.id,
    }).catch((e) => console.warn('[EventBus] Erreur publish telegram.contact.received:', e.message));

    // Génération du code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashString(code);

    // Mise à jour du défi : codeHash + TTL 5 min (spec §3.1)
    const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        codeHash,
        expiresAt: codeExpiresAt,
      },
    });

    // Liaison du telegramUserId et telegramChatId à l'utilisateur s'il existe déjà
    if (senderId) {
      await prisma.user.updateMany({
        where: { phoneE164: contactPhone },
        data: {
          telegramUserId: String(senderId),
          telegramChatId: String(chatId),
        },
      }).catch(() => {});
    }

    // Envoi de l'OTP sur Telegram
    await sendTelegramOtpCode(chatId, code);

    // Log de dev explicite (jamais en production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[TelegramDev] 🔑 Code OTP généré pour ${contactPhone}: ${code}`);
    }

    // Émettre l'événement telegram.send.otp (spec §8)
    await eventBus.publish('telegram.send.otp', {
      phone: contactPhone,
      challengeId: challenge.id,
    }).catch((e) => console.warn('[EventBus] Erreur publish telegram.send.otp:', e.message));

    chatToChallengeMap.delete(chatId);
    return;
  }

  // ─── 2. Commande /start <nonce> ─────────────────────────────────────────────
  if (message.text && message.text.startsWith('/start')) {
    const parts = message.text.trim().split(/\s+/);
    const nonce = parts.length > 1 ? parts[1].trim() : null;

    if (!nonce) {
      const welcomeMsg = `👋 *Bienvenue sur le Bot Officiel FORSA !*\n\nLancez votre connexion sur le site FORSA pour vous authentifier en toute sécurité. 🚀`;
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
        '⚠️ *Lien de connexion expiré ou invalide.*\n\nVeuillez relancer la connexion depuis le site FORSA.',
        { remove_keyboard: true }
      );
      return;
    }

    chatToChallengeMap.set(chatId, challenge.id);

    const promptMsg =
      `👋 Bonjour !\n\n` +
      `🛡️ *Connexion sécurisée FORSA*\n` +
      `Numéro demandé : \`${challenge.phone}\`\n\n` +
      `👇 *Appuyez sur le bouton ci-dessous pour confirmer votre numéro :*`;

    await sendTelegramMessage(chatId, promptMsg, {
      keyboard: [
        [
          {
            text: '📱 Confirmer mon numéro de téléphone',
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
  }
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

  console.log('[TelegramService] 🤖 Bot Telegram @forsa_auth_bot actif...');

  let offset = 0;

  (async () => {
    while (isPolling) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`;
        const res = await fetch(url, { signal: pollingAbortController?.signal });
        if (!res.ok) {
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
