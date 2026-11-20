import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://forsa_user:forsa_secret_ms1@localhost:5432/forsa_ms1_accounts?schema=public',
  
  jwtPrivateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '..', '..', 'keys', 'private.pem'),
  jwtPublicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '..', '..', 'keys', 'public.pem'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  
  consulHost: process.env.CONSUL_HOST || 'localhost',
  consulPort: parseInt(process.env.CONSUL_PORT || '8500', 10),
  serviceHost: process.env.SERVICE_HOST || 'localhost',
  
  internalApiKey: process.env.INTERNAL_API_KEY || 'forsa-internal-secret-token-2026',
  
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads', 'documents'),
};
