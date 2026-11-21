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
}

// Map token -> PendingOtpInfo
const pendingOtpsByToken = new Map<string, PendingOtpInfo>();
// Map userId -> token
const userTokenMap = new Map<string, string>();
// Map chatId -> PendingOtpInfo (session Telegram en cours)
const chatPendingSession = new Map<number | string, PendingOtpInfo>();
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

/**
 * Enregistre un OTP en attente pour validation par Telegram.
 */
export function registerPendingTelegramOtp(
  userId: string,
  code: string,
  phone: string,
  fullName?: string
): string {
  const rawToken = crypto.randomBytes(6).toString('hex');
  const token = `v_${rawToken}`;

  const info: PendingOtpInfo = {
    userId,
    code,
    phone: toE164(phone),
    fullName,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    telegramVerified: false,
  };

  pendingOtpsByToken.set(token, info);
  userTokenMap.set(userId, token);
  lastPendingToken = token;

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
 * Envoie un message texte simple ou avec boutons.
 */
async function sendTelegramMessage(
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
 * Traite les messages Telegram reçus (texte /start ou contact partagé).
 */
async function handleTelegramUpdate(update: any): Promise<void> {
  const message = update.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const senderId = message.from?.id;

  // ─── 1. L'utilisateur a partagé son numéro de téléphone (Contact) ───────────
  if (message.contact) {
    const rawContactPhone = message.contact.phone_number;
    const contactPhone = toE164(rawContactPhone);
    const contactUserId = message.contact.user_id;

    // Vérifier que le contact partagé est bien celui du compte qui écrit
    if (contactUserId && senderId && contactUserId !== senderId) {
      await sendTelegramMessage(
        chatId,
        '❌ *Attention :* Ce contact ne correspond pas à votre compte Telegram. Veuillez partager votre propre numéro.',
        { remove_keyboard: true }
      );
      return;
    }

    // Récupérer la session d'inscription associée
    let targetOtp = chatPendingSession.get(chatId);
    if (!targetOtp && lastPendingToken) {
      targetOtp = pendingOtpsByToken.get(lastPendingToken);
    }

    if (!targetOtp || targetOtp.expiresAt.getTime() <= Date.now()) {
      await sendTelegramMessage(
        chatId,
        '⚠️ *Session expirée ou introuvable.*\n\nVeuillez relancer la vérification sur FORSA pour obtenir un nouveau lien.',
        { remove_keyboard: true }
      );
      return;
    }

    const registeredPhone = toE164(targetOtp.phone);

    // ─── CONTRÔLE DE SÉCURITÉ ABSOLU : LES DEUX NUMÉROS DOIVENT ÊTRE IDENTIQUES ───
    if (contactPhone !== registeredPhone) {
      const errorMsg = `❌ *Vérification refusée : Numéros non concordants !*\n\n` +
        `• 📱 *Numéro de votre compte Telegram :* \`${contactPhone}\`\n` +
        `• 📝 *Numéro saisi sur FORSA :* \`${registeredPhone}\`\n\n` +
        `⛔ *Pour des raisons de sécurité évidentes, le numéro de votre compte Telegram doit être strictement identique au numéro saisi lors de l'inscription FORSA.*\n\n` +
        `👉 Veuillez vous connecter avec le compte Telegram correspondant au numéro \`${registeredPhone}\`, ou modifiez votre numéro sur FORSA.`;

      await sendTelegramMessage(chatId, errorMsg, { remove_keyboard: true });
      console.warn(`[TelegramSecurity] ⛔ Rejet vérification : Telegram (${contactPhone}) != FORSA (${registeredPhone})`);
      return;
    }

    // ─── VALIDATION RÉUSSIE : LE NUMÉRO EST LE MÊME ─────────────────────────
    targetOtp.telegramVerified = true;
    await markUserPhoneVerified(targetOtp.userId);

    const successMsg = `✅ *Numéro certifié avec succès !*\n\n` +
      `Votre compte Telegram (\`${contactPhone}\`) correspond exactement au numéro enregistré sur FORSA.\n\n` +
      `🔐 *Votre code de confirmation :*\n` +
      `👉 \`${targetOtp.code}\` 👈\n\n` +
      `⏱️ _Ce code expire dans 5 minutes._\n` +
      `Votre compte FORSA est à présent certifié !`;

    await sendTelegramMessage(chatId, successMsg, { remove_keyboard: true });
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
      // Mémoriser la session pour ce chat
      chatPendingSession.set(chatId, targetOtp);

      const promptMsg = `👋 Bonjour *${targetOtp.fullName || ''}* !\n\n` +
        `🛡️ *Contrôle de sécurité FORSA*\n\n` +
        `Pour valider votre inscription, votre compte Telegram doit utiliser le *même numéro* que celui saisi sur FORSA :\n` +
        `📱 *Numéro attendu :* \`${targetOtp.phone}\`\n\n` +
        `👇 *Appuyez sur le bouton ci-dessous pour certifier votre numéro de téléphone :*`;

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
      const welcomeMsg = `👋 *Bienvenue sur le Bot Officiel FORSA !*\n\n` +
        `Pour faire vérifier votre numéro :\n` +
        `1. Inscrivez-vous sur le site FORSA avec votre numéro de téléphone.\n` +
        `2. Sur la page de vérification, cliquez sur *« Vérifier avec Telegram »*.\n` +
        `3. Ce bot s'ouvrira et comparera automatiquement votre numéro Telegram pour valider votre compte. 🚀`;

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

  console.log('[TelegramService] 🤖 Bot Telegram @forsa_auth_bot actif (Mode Vérification Numéro E.164)...');

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
