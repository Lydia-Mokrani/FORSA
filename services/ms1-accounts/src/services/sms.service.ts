import { ApiError } from '@forsa/common';
import { config } from '../config/env';

/**
 * Normalise un numéro algérien au format E.164 (+213...).
 * Ex: '0550123456' -> '+213550123456'
 */
export function toE164(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00213')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('213')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+213${cleaned.slice(1)}`;
  return `+213${cleaned}`;
}

/**
 * Envoie un SMS classique ou log.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  const formattedTo = toE164(to);
  console.log(`\n📱 SMS → ${formattedTo}\n${message}\n`);
}

/**
 * Envoie un code OTP par message Telegram officiel en temps réel.
 */
export async function sendTelegramOtp(to: string, code: string): Promise<boolean> {
  const token = config.telegramBotToken;
  if (!token) return false;

  let targetChatId = config.telegramChatId;

  // Si pas de chat_id fixé, trouver le dernier utilisateur ayant fait /start sur le bot
  if (!targetChatId) {
    try {
      const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const updatesData: any = await updatesRes.json();
      if (updatesData.ok && updatesData.result?.length > 0) {
        const lastMsg = updatesData.result[updatesData.result.length - 1]?.message;
        targetChatId = lastMsg?.chat?.id ? String(lastMsg.chat.id) : '';
      }
    } catch {
      // ignore
    }
  }

  if (!targetChatId) {
    console.warn('⚠️ Aucun Chat ID Telegram trouvé. Envoyez un message ou /start à @forsa_auth_bot sur Telegram.');
    return false;
  }

  const text = `🔐 *FORSA — Code de vérification de votre numéro*\n\n📱 *Numéro :* \`${toE164(to)}\`\n🔑 *Code de confirmation :* \`${code}\`\n\n⏱️ _Ce code expire dans 5 minutes (5 tentatives max)._`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data: any = await res.json();
    if (data.ok) {
      console.log(`\n✅ [NOTIFICATION OTP ENVOYÉE SUR TELEGRAM] à chat_id ${targetChatId} pour ${to}\n`);
      return true;
    }
    console.error('❌ Erreur Telegram sendMessage:', data);
    return false;
  } catch (err) {
    console.error('❌ Échec appel API Telegram:', err);
    return false;
  }
}

/**
 * Envoie un vrai SMS de vérification via Twilio Verify (40 crédits gratuits).
 */
export async function sendTwilioVerification(to: string): Promise<boolean> {
  const formattedTo = toE164(to);
  if (!config.twilioVerifyServiceSid || !config.twilioAccountSid || !config.twilioAuthToken) {
    return false;
  }

  const url = `https://verify.twilio.com/v2/Services/${config.twilioVerifyServiceSid}/Verifications`;
  const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
  const body = new URLSearchParams({
    To: formattedTo,
    Channel: 'sms',
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data?.status === 'pending') {
      console.log(`\n✅ [VRAI SMS ENVOYÉ VIA TWILIO VERIFY] → ${formattedTo} (SID: ${data?.sid})\n`);
      return true;
    }
    console.error('❌ Twilio Verify return:', data?.message || data);
    return false;
  } catch (err) {
    console.error('❌ Échec appel Twilio Verify:', err);
    return false;
  }
}

/**
 * Vérifie le code saisi par l'utilisateur auprès de Twilio Verify.
 */
export async function checkTwilioVerification(to: string, code: string): Promise<boolean> {
  const formattedTo = toE164(to);
  if (!config.twilioVerifyServiceSid || !config.twilioAccountSid || !config.twilioAuthToken) {
    return false;
  }

  const url = `https://verify.twilio.com/v2/Services/${config.twilioVerifyServiceSid}/VerificationCheck`;
  const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
  const body = new URLSearchParams({
    To: formattedTo,
    Code: code,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data?.status === 'approved') {
      console.log(`\n✅ [CODE APPROUVÉ PAR TWILIO VERIFY] pour ${formattedTo}\n`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ Échec check Twilio Verify:', err);
    return false;
  }
}
