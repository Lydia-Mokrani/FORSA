import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME || 'forsa_auth_bot';

const emailDriver = (process.env.EMAIL_DRIVER || (isProduction ? 'smtp' : 'log-masked')) as 'smtp' | 'log-masked';
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const mailFrom = process.env.MAIL_FROM || 'FORSA <no-reply@forsa.dz>';

if (isProduction) {
  if (!telegramBotToken) {
    throw new Error('FATAL: TELEGRAM_BOT_TOKEN est obligatoire en production pour MS5.');
  }
  if (!process.env.TELEGRAM_BOT_USERNAME) {
    throw new Error('FATAL: TELEGRAM_BOT_USERNAME est obligatoire en production pour MS5.');
  }
  if (emailDriver === 'smtp') {
    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('FATAL: SMTP_HOST, SMTP_USER, SMTP_PASS sont obligatoires en production pour MS5.');
    }
  }
}

export const config = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT || '3005', 10),
  instanceId: process.env.INSTANCE_ID || 'ms5-notifications-1',

  telegramBotToken: telegramBotToken || '',
  telegramBotUsername,

  emailDriver,
  smtpHost: smtpHost || '',
  smtpPort,
  smtpUser: smtpUser || '',
  smtpPass: smtpPass || '',
  mailFrom,
  emailVerifyTtlSeconds: parseInt(process.env.EMAIL_VERIFY_TTL_SECONDS || '600', 10),
  emailRecoveryTtlSeconds: parseInt(process.env.EMAIL_RECOVERY_TTL_SECONDS || '900', 10),

  eventBusDriver: (process.env.EVENT_BUS_DRIVER || 'rabbitmq') as 'rabbitmq' | 'memory',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  rabbitmqExchange: process.env.RABBITMQ_EXCHANGE || 'forsa.events',
  otpTtlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),

  consulHost: process.env.CONSUL_HOST || '127.0.0.1',
  consulPort: parseInt(process.env.CONSUL_PORT || '8500', 10),
  serviceHost: process.env.SERVICE_HOST || '127.0.0.1',
  servicePort: parseInt(process.env.SERVICE_PORT || process.env.PORT || '3005', 10),
};
