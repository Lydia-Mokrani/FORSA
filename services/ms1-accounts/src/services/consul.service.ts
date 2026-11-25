import { ConsulRegistry } from '@forsa/common';
import { config } from '../config/env';

/**
 * Registre Consul pour MS1 avec configuration dynamique Traefik v3 :
 * - Routeur principal pour /api/auth, /api/users, /api/shops
 * - Routeur dédié prioritaire pour /api/auth/telegram/start avec middleware rateLimit Traefik
 */
export const consul = new ConsulRegistry({
  consulUrl: `http://${config.consulHost}:${config.consulPort}`,
  serviceName: 'ms1-accounts',
  serviceId: `ms1-accounts-${config.serviceHost.replace(/[^a-zA-Z0-9_-]/g, '-')}-${config.port}`,
  serviceHost: config.serviceHost,
  servicePort: config.port,
  healthPath: '/health',
  traefikPathPrefixes: ['/api/auth', '/api/users', '/api/shops'],
  customTags: [
    'traefik.http.routers.ms1-accounts-start.rule=Path(`/api/auth/telegram/start`)',
    'traefik.http.routers.ms1-accounts-start.entrypoints=web',
    'traefik.http.routers.ms1-accounts-start.priority=100',
    'traefik.http.routers.ms1-accounts-start.middlewares=ms1-start-ratelimit',
    `traefik.http.middlewares.ms1-start-ratelimit.ratelimit.average=${process.env.TRAEFIK_START_RATE_LIMIT_AVERAGE || '10'}`,
    `traefik.http.middlewares.ms1-start-ratelimit.ratelimit.burst=${process.env.TRAEFIK_START_RATE_LIMIT_BURST || '20'}`,
    'traefik.http.middlewares.ms1-start-ratelimit.ratelimit.period=1m',

    'traefik.http.routers.ms1-accounts-recovery.rule=Path(`/api/auth/recovery/start`)',
    'traefik.http.routers.ms1-accounts-recovery.entrypoints=web',
    'traefik.http.routers.ms1-accounts-recovery.priority=100',
    'traefik.http.routers.ms1-accounts-recovery.middlewares=ms1-recovery-ratelimit',
    `traefik.http.middlewares.ms1-recovery-ratelimit.ratelimit.average=${process.env.TRAEFIK_RECOVERY_RATE_LIMIT_AVERAGE || '5'}`,
    `traefik.http.middlewares.ms1-recovery-ratelimit.ratelimit.burst=${process.env.TRAEFIK_RECOVERY_RATE_LIMIT_BURST || '10'}`,
    'traefik.http.middlewares.ms1-recovery-ratelimit.ratelimit.period=1m',
  ],
});
