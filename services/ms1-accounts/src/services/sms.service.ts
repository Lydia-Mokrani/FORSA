import { ApiError } from '@forsa/common';
import { config } from '../config/env';

/**
 * Envoie un SMS.
 * SMS_PROVIDER=log  → affiche dans la console (dev / soutenance)
 * SMS_PROVIDER=twilio → à implémenter avec le SDK Twilio
 */
export async function sendSms(to: string, message: string): Promise<void> {
  if (config.smsProvider === 'log') {
    console.log(`\n📱 SMS → ${to}\n${message}\n`);
    return;
  }

  if (config.smsProvider === 'twilio') {
    // TODO: brancher Twilio SDK en production
    // const client = twilio(config.twilioSid, config.twilioToken);
    // await client.messages.create({ to, from: config.twilioFrom, body: message });
    throw new ApiError(503, 'SMS_UNAVAILABLE', 'Service SMS non configuré');
  }

  throw new ApiError(503, 'SMS_UNAVAILABLE', 'Fournisseur SMS non reconnu');
}
