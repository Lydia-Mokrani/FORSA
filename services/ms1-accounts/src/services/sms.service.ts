import { ApiError } from '@forsa/common';
import { config } from '../config/env';

/**
 * Normalise un numéro algérien au format E.164 (+213...).
 * Ex: '0550123456' -> '+213550123456'
 */
function toE164(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00213')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('213')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+213${cleaned.slice(1)}`;
  return `+213${cleaned}`;
}

/**
 * Envoie un SMS.
 * SMS_PROVIDER=log    → affiche dans la console (dev / soutenance)
 * SMS_PROVIDER=twilio → envoie via l'API Twilio officielle
 */
export async function sendSms(to: string, message: string): Promise<void> {
  const formattedTo = toE164(to);

  if (config.smsProvider === 'twilio') {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      console.warn('⚠️ Twilio non configuré complètement. Affichage en console.');
      console.log(`\n📱 SMS [SIMULATION LOG] → ${formattedTo}\n${message}\n`);
      return;
    }

    // Si Twilio Phone Number est configuré, on appelle l'API Twilio
    if (config.twilioPhoneNumber) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
      const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
      const body = new URLSearchParams({
        From: config.twilioPhoneNumber,
        To: formattedTo,
        Body: message,
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
        if (!res.ok) {
          console.error('❌ Erreur envoi Twilio SMS:', data);
          console.log(`\n📱 SMS [FALLBACK CONSOLE] → ${formattedTo}\n${message}\n`);
        } else {
          console.log(`✅ SMS envoyé via Twilio avec succès à ${formattedTo} (SID: ${data?.sid})`);
        }
        return;
      } catch (err) {
        console.error('❌ Échec appel API Twilio:', err);
        console.log(`\n📱 SMS [FALLBACK CONSOLE] → ${formattedTo}\n${message}\n`);
        return;
      }
    } else {
      console.warn('⚠️ Aucun numéro expéditeur Twilio configuré (TWILIO_PHONE_NUMBER). Affichage console :');
      console.log(`\n📱 SMS [TWILIO EN ATTENTE DE NUMERO] → ${formattedTo}\n${message}\n`);
      return;
    }
  }

  // SMS_PROVIDER=log par défaut
  console.log(`\n📱 SMS → ${formattedTo}\n${message}\n`);
}
