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
  
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n') : '',
  jwtKeyId: process.env.JWT_KEY_ID || 'forsa-ms1-auth-v1',
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

  // Telegram Bot Username (pour générer le deep link https://t.me/<username>?start=<nonce>)
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || (process.env.NODE_ENV === 'production' ? '' : 'forsa_auth_bot'),

  // Nominatim Geocoding
  nominatimUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search',
  geocoderUserAgent: process.env.GEOCODER_USER_AGENT || (process.env.NODE_ENV === 'production' ? '' : 'forsa-dev'),
  geocoderMinIntervalMs: parseInt(process.env.GEOCODER_MIN_INTERVAL_MS || '1000', 10),
  geocoderQueueMax: parseInt(process.env.GEOCODER_QUEUE_MAX || '20', 10),
  geocoderUserLimitPerMin: parseInt(process.env.GEOCODER_USER_LIMIT_PER_MIN || '10', 10),

  // Identifiant d'instance (multi-instances / Traefik load-balancing)
  instanceId: process.env.INSTANCE_ID || `ms1-${process.env.HOSTNAME || '1'}-${process.env.PORT || '3001'}`,

  // Répertoire de stockage des avatars
  avatarDir: process.env.AVATAR_DIR || path.join(__dirname, '..', '..', 'uploads', 'avatars'),
};

// Fail-fast en production
if (config.nodeEnv === 'production') {
  if (!process.env.TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME.trim() === '') {
    throw new Error('[MS1-Env] TELEGRAM_BOT_USERNAME est obligatoire en environnement de production');
  }
  const ua = process.env.GEOCODER_USER_AGENT;
  if (!ua || ua.trim() === '' || ['forsa-dev', 'dummy', 'default'].includes(ua.trim().toLowerCase())) {
    throw new Error('[MS1-Env] GEOCODER_USER_AGENT valide et non par défaut est obligatoire en environnement de production');
  }
}
