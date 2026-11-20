// tests/setup.ts
// Global test setup — sets required env variables before any test runs

process.env.NODE_ENV        = 'test';
process.env.PORT            = '3099';
process.env.SERVICE_NAME    = 'ms2-catalogue-test';
process.env.DATABASE_URL    = 'postgresql://ms2_user:ms2_password@localhost:5433/ms2_catalogue_test';
process.env.MS1_JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0TEST_KEY_FOR_TESTS_ONLY
-----END PUBLIC KEY-----`;
process.env.JWT_PUBLIC_KEY  = process.env.MS1_JWT_PUBLIC_KEY;
process.env.INTERNAL_API_KEY = 'forsa-internal-secret-token-2026';
process.env.RABBITMQ_URL    = 'amqp://localhost';
process.env.RABBITMQ_EXCHANGE = 'forsa.events.test';
process.env.CONSUL_HOST     = 'localhost';
process.env.CONSUL_PORT     = '8500';
process.env.UPLOAD_DIR      = '/tmp/ms2-test-uploads';
process.env.MEDIA_BASE_URL  = 'http://localhost:3099/media';
process.env.LOG_LEVEL       = 'silent';
