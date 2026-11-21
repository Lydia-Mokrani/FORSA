import { config } from '../config/env';
import { toE164 } from './sms.service';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { devDb, isPostgresAlive } from './dev-db.service';

export interface PendingOtpInfo {
  userId: string;
  code: string;
  phone: string;
  fullName?: string;
  expiresAt: Date;
  telegramVerified?: boolean;
  telegramMismatch?: boolean;
  mismatchPhone?: string;
}

// Map token -> PendingOtpInfo
const pendingOtpsByToken = new Map<string, PendingOtpInfo>();
// Map userId -> token
const userTokenMap = new Map<string, string>();
// Map chatId -> PendingOtpInfo (session Telegram en cours)
const chatPendingSession = new Map<number | string, PendingOtpInfo>();
// Mémoire persistante des téléphones certifiés : E.164 -> chatId et chatId -> E.164
const phoneToChatIdMap = new Map<string, number | string>();
const chatIdToPhoneMap = new Map<number | string, string>();

// Dernier token en attente
let lastPendingToken: string | null = null;

let isPolling = false;
let pollingAbortController: AbortController | null = null;

/**
 * Marque l'utilisateur comme ayant son numéro vérifié dans la base.
 */
export async function markUserPhoneVerified(userId: string): Promise<boolean> {
  try {
    if (await isPostgresAlive()) {
      await prisma.user.update({
        where: { id: userId },
        data: { phoneVerified: true },
      });
    } else {
      const u = devDb.users.get(userId);
      if (u) u.phoneVerified = true;
    }
    return true;
  } catch (err) {
    console.error('[TelegramService] Erreur markUserPhoneVerified:', err);
    return false;
  }
}

export function getPendingOtpByUserId(userId: string): PendingOtpInfo | undefined {
  const token = userTokenMap.get(userId);
  if (!token) return undefined;
  return pendingOtpsByToken.get(token);
}

/**
 * Envoie le code OTP dans le bloc officiel de copie Telegram (<pre><code>) avec bouton de copie automatique (copy_text).
 * Affiche l'icône de copie Telegram dans le coin supérieur droit (comme sur la capture de l'utilisateur) !
 */
export async function sendTelegramOtpCode(
  chatId: string | number,
  code: string
): Promise<boolean> {
  const token = config.telegramBotToken;
  if (!token) return false;

  const htmlText = `🔐 <b>FORSA — Code de vérification</b>\n\n` +
                   `<pre><code>${code}</code></pre>\n` +
                   `⏱️ <i>Valable 5 minutes. Ne partagez jamais ce code.</i>`;

  const payload: any = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '📋 Copier',
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
 * Envoie un message texte simple ou avec boutons.
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
 * Enregistre un OTP en attente pour validation par Telegram.
 * Si le numéro est déjà lié à un compte Telegram connu, l'envoi se fait automatiquement !
 */
export function registerPendingTelegramOtp(
  userId: string,
  code: string,
  phone: string,
  fullName?: string
): string {
  const rawToken = crypto.randomBytes(6).toString('hex');
  const token = `v_${rawToken}`;
  const formattedPhone = toE164(phone);

  const info: PendingOtpInfo = {
    userId,
    code,
    phone: formattedPhone,
    fullName,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    telegramVerified: false,
  };

  pendingOtpsByToken.set(token, info);
  userTokenMap.set(userId, token);
  lastPendingToken = token;

  // Envoi automatique direct style RedotPay si le numéro a déjà été lié
  const knownChatId = phoneToChatIdMap.get(formattedPhone);
  if (knownChatId) {
    sendTelegramOtpCode(knownChatId, code);
    console.log(`[TelegramService] ⚡ Envoi automatique RedotPay du code ${code} à chat_id ${knownChatId} (${formattedPhone})`);
  }

  setTimeout(() => {
    pendingOtpsByToken.delete(token);
    if (userTokenMap.get(userId) === token) userTokenMap.delete(userId);
  }, 10 * 60 * 1000);

  return token;
}

export function getTelegramDeepLink(token: string): string {
  return `https://t.me/forsa_auth_bot?start=${token}`;
}

/**
 * Traite les messages Telegram reçus (texte /start ou contact partagé).
 */
async function handleTelegramUpdate(update: any): Promise<void> {
  // ─── Répondre aux boutons cliqués (callbacks Telegram) ──────────────────────
  if (update.callback_query) {
    const callbackQueryId = update.callback_query.id;
    const token = config.telegramBotToken;
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: '❌ Ce compte Telegram ne correspond pas au numéro saisi sur FORSA.',
          show_alert: true,
        }),
      }).catch(() => {});
    }
    return;
  }

  const message = update.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const senderId = message.from?.id;

  // ─── 1. L'utilisateur a partagé son numéro de téléphone (Contact) ───────────
  if (message.contact) {
    const rawContactPhone = message.contact.phone_number;
    const contactPhone = toE164(rawContactPhone);
    const contactUserId = message.contact.user_id;

    if (contactUserId && senderId && contactUserId !== senderId) {
      await sendTelegramMessage(
        chatId,
        '❌ *Attention :* Ce contact ne correspond pas à votre compte Telegram. Veuillez partager votre propre numéro.',
        { remove_keyboard: true }
      );
      return;
    }

    let targetOtp = chatPendingSession.get(chatId);
    if (!targetOtp && lastPendingToken) {
      targetOtp = pendingOtpsByToken.get(lastPendingToken);
    }

    if (!targetOtp || targetOtp.expiresAt.getTime() <= Date.now()) {
      await sendTelegramMessage(
        chatId,
        '⚠️ *Session expirée ou introuvable.*\n\nVeuillez relancer la vérification sur FORSA pour obtenir un nouveau code.',
        { remove_keyboard: true }
      );
      return;
    }

    const registeredPhone = toE164(targetOtp.phone);

    // Contrôle strict : Numéro Telegram == Numéro FORSA
    if (contactPhone !== registeredPhone) {
      targetOtp.telegramMismatch = true;
      targetOtp.mismatchPhone = contactPhone;

      const htmlErrorMsg = `❌ <b>Numéro non valide</b>\n\n` +
        `<pre><code>Numéro non concordant</code></pre>\n` +
        `• 📱 <b>Votre Telegram :</b> <code>${contactPhone}</code>\n` +
        `• 📝 <b>Saisi sur FORSA :</b> <code>${registeredPhone}</code>\n\n` +
        `⛔ <i>Ce compte Telegram ne correspond pas au numéro inscrit sur FORSA.</i>`;

      const token = config.telegramBotToken;
      if (token) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: htmlErrorMsg,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '❌ Numéro de téléphone incorrect',
                    callback_data: 'phone_mismatch',
                  },
                ],
              ],
            },
          }),
        }).catch(() => {});
      }
      console.warn(`[TelegramSecurity] ⛔ Rejet vérification : Telegram (${contactPhone}) != FORSA (${registeredPhone})`);
      return;
    }

    // Association mémorisée pour envois automatiques futurs sans re-confirmation
    phoneToChatIdMap.set(contactPhone, chatId);
    chatIdToPhoneMap.set(chatId, contactPhone);

    targetOtp.telegramVerified = true;
    await markUserPhoneVerified(targetOtp.userId);

    // Envoi propre avec bloc de copie (<pre><code>) et bouton dédié
    await sendTelegramOtpCode(chatId, targetOtp.code);
    console.log(`[TelegramSecurity] ✅ Numéro certifié avec succès pour userId ${targetOtp.userId} (${contactPhone})`);
    return;
  }

  // ─── 2. Commande /start reçue ───────────────────────────────────────────────
  if (message.text && message.text.startsWith('/start')) {
    const parts = message.text.trim().split(/\s+/);
    const deepToken = parts.length > 1 ? parts[1].trim() : null;

    let targetOtp: PendingOtpInfo | undefined;

    if (deepToken && pendingOtpsByToken.has(deepToken)) {
      targetOtp = pendingOtpsByToken.get(deepToken);
    } else if (lastPendingToken && pendingOtpsByToken.has(lastPendingToken)) {
      targetOtp = pendingOtpsByToken.get(lastPendingToken);
    }

    if (targetOtp && targetOtp.expiresAt.getTime() > Date.now()) {
      chatPendingSession.set(chatId, targetOtp);

      const knownPhone = chatIdToPhoneMap.get(chatId);
      const registeredPhone = toE164(targetOtp.phone);

      // Si le compte Telegram a déjà certifié ce numéro, on envoie directement le code style RedotPay !
      if (knownPhone && knownPhone === registeredPhone) {
        targetOtp.telegramVerified = true;
        await markUserPhoneVerified(targetOtp.userId);
        await sendTelegramOtpCode(chatId, targetOtp.code);
        console.log(`[TelegramService] ⚡ Envoi direct (compte déjà certifié) à chat_id ${chatId} pour ${knownPhone}`);
        return;
      }

      // Sinon, on demande une confirmation en 1 clic
      const promptMsg = `👋 Bonjour *${targetOtp.fullName || ''}* !\n\n` +
        `🛡️ *Sécurité FORSA*\n` +
        `Numéro attendu : \`${targetOtp.phone}\`\n\n` +
        `👇 *Appuyez ci-dessous pour confirmer votre numéro :*`;

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
    } else {
      const welcomeMsg = `👋 *Bienvenue sur le Bot Officiel FORSA !*\n\nLancez votre inscription sur le site FORSA pour recevoir automatiquement vos codes de confirmation ici. 🚀`;
      await sendTelegramMessage(chatId, welcomeMsg, { remove_keyboard: true });
    }
  }
}

/**
 * Démarre le polling automatique du bot Telegram en arrière-plan.
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

  console.log('[TelegramService] 🤖 Bot Telegram @forsa_auth_bot actif (Mode RedotPay ⚡)...');

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
 * Arrête le polling proprement.
 */
export function stopTelegramBot(): void {
  isPolling = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  console.log('[TelegramService] Bot Telegram arrêté.');
}
