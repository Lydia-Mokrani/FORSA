import { config } from '../config/env';
import { toE164 } from './sms.service';
import crypto from 'crypto';

interface PendingOtpInfo {
  userId: string;
  code: string;
  phone: string;
  fullName?: string;
  expiresAt: Date;
}

// Map en mémoire des OTP en attente d'activation Telegram : token -> PendingOtpInfo
const pendingOtpsByToken = new Map<string, PendingOtpInfo>();
// Map userId -> token pour lookup rapide
const userTokenMap = new Map<string, string>();
// Map phone -> token
const phoneTokenMap = new Map<string, string>();
// Cache du dernier token généré
let lastPendingToken: string | null = null;

let isPolling = false;
let pollingAbortController: AbortController | null = null;

/**
 * Enregistre un OTP en attente pour association avec le bot Telegram.
 * Retourne un token de deep-link (ex: "v_a8f93bc2").
 */
export function registerPendingTelegramOtp(
  userId: string,
  code: string,
  phone: string,
  fullName?: string
): string {
  // Générer un token unique court et sécurisé
  const rawToken = crypto.randomBytes(6).toString('hex');
  const token = `v_${rawToken}`;

  const info: PendingOtpInfo = {
    userId,
    code,
    phone: toE164(phone),
    fullName,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  };

  pendingOtpsByToken.set(token, info);
  userTokenMap.set(userId, token);
  phoneTokenMap.set(info.phone, token);
  lastPendingToken = token;

  // Nettoyage après 10 minutes
  setTimeout(() => {
    pendingOtpsByToken.delete(token);
    if (userTokenMap.get(userId) === token) userTokenMap.delete(userId);
    if (phoneTokenMap.get(info.phone) === token) phoneTokenMap.delete(info.phone);
  }, 10 * 60 * 1000);

  return token;
}

/**
 * Récupère le lien complet du bot Telegram avec le token de deep link.
 */
export function getTelegramDeepLink(token: string): string {
  return `https://t.me/forsa_auth_bot?start=${token}`;
}

/**
 * Envoie un message formaté avec le code OTP sur un chat_id Telegram.
 */
export async function sendTelegramOtpMessage(
  chatId: string | number,
  code: string,
  phone: string,
  fullName?: string
): Promise<boolean> {
  const token = config.telegramBotToken;
  if (!token) return false;

  const nameGreeting = fullName ? `Bonjour *${fullName}* ! 👋` : 'Bonjour ! 👋';
  const text = `${nameGreeting}\n\n🔐 *FORSA — Votre code de confirmation :*\n\n👉 \`${code}\` 👈\n\n📱 *Numéro associé :* \`${toE164(phone)}\`\n⏱️ _Ce code expire dans 5 minutes._\n\nEntrez ce code sur l'application FORSA pour finaliser votre inscription.`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const data: any = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error('[TelegramService] Erreur sendMessage:', err);
    return false;
  }
}

/**
 * Traite un message reçu du bot Telegram (/start ou /start <token>).
 */
async function handleTelegramMessage(message: any): Promise<void> {
  if (!message || !message.text || !message.chat) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const deepToken = parts.length > 1 ? parts[1].trim() : null;

    let targetOtp: PendingOtpInfo | undefined;

    // 1. Recherche par le deep link token
    if (deepToken && pendingOtpsByToken.has(deepToken)) {
      targetOtp = pendingOtpsByToken.get(deepToken);
    }

    // 2. Si pas de token ou token non trouvé, prendre le dernier OTP en attente valide
    if (!targetOtp && lastPendingToken && pendingOtpsByToken.has(lastPendingToken)) {
      targetOtp = pendingOtpsByToken.get(lastPendingToken);
    }

    if (targetOtp && targetOtp.expiresAt.getTime() > Date.now()) {
      // Envoyer le code à l'utilisateur
      await sendTelegramOtpMessage(chatId, targetOtp.code, targetOtp.phone, targetOtp.fullName);
      console.log(`[TelegramService] ✅ Code OTP ${targetOtp.code} envoyé à chat_id ${chatId} pour ${targetOtp.phone}`);
    } else {
      // Message de bienvenue général
      const welcomeText = `👋 *Bienvenue sur le Bot Officiel FORSA !*\n\nPour recevoir votre code de confirmation, lancez votre inscription sur le site FORSA puis cliquez sur *« Vérifier avec Telegram »*.\n\nVotre code vous sera alors envoyé directement ici en direct ! 🚀`;
      const token = config.telegramBotToken;
      if (token) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'Markdown',
          }),
        }).catch(() => {});
      }
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

  console.log('[TelegramService] 🤖 Bot Telegram @forsa_auth_bot actif et en écoute...');

  let offset = 0;

  // Boucle de polling non bloquante
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
            if (update.message) {
              await handleTelegramMessage(update.message);
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        // Pause avant reconnexion en cas d'erreur réseau
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })().catch((err) => {
    console.error('[TelegramService] Erreur boucle polling:', err);
  });
}

/**
 * Arrête le polling proprement lors de l'extinction du serveur.
 */
export function stopTelegramBot(): void {
  isPolling = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  console.log('[TelegramService] Bot Telegram arrêté.');
}
