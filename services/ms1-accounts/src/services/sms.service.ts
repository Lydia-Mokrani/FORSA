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
    console.error('❌ Twilio Verify return:', data);
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
