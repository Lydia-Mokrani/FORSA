import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'test') {
      return '0860c84a8ea7aaca109f98b5b30ce65a262d67425aad0f474290c3f3e86822f9';
    }
    throw new Error(`[MS1-Env] Variable d'environnement obligatoire manquante : ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://forsa_user:forsa_secret_ms1@localhost:5432/forsa_ms1_accounts?schema=public',
  
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '..', '..', 'keys', 'private.pem'),
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '..', '..', 'keys', 'public.pem'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '36500d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '36500d',
  
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://forsa_user:forsa_password@10.0.0.10:5672',
  
  consulHost: process.env.CONSUL_HOST || '10.0.0.10',
  consulPort: parseInt(process.env.CONSUL_PORT || '8500', 10),
  serviceHost: process.env.SERVICE_HOST || '10.0.0.11',
  
  internalApiKey: getRequiredEnv('INTERNAL_API_KEY'),
  
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads', 'documents'),

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',

  // SMS Provider : 'log' (dev) | 'twilio' (prod)
  smsProvider: process.env.SMS_PROVIDER || 'log',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',

  // Telegram OTP Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'forsa_auth_bot',

  // Répertoire de stockage des avatars
  avatarDir: process.env.AVATAR_DIR || path.join(__dirname, '..', '..', 'uploads', 'avatars'),
};
