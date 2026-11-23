// src/services/consulService.ts
// Registers and deregisters MS2 with HashiCorp Consul for dynamic service discovery and Traefik routing.

import http from 'http';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface ConsulRegistration {
  ID:      string;
  Name:    string;
  Tags:    string[];
  Address: string;
  Port:    number;
  Check:   { HTTP: string; Interval: string; Timeout: string; DeregisterCriticalServiceAfter: string; };
}

function getServiceAddress(): string {
  const addr = process.env.SERVICE_ADDRESS;
  if (!addr || addr.trim() === '') {
    if (env.NODE_ENV === 'production') {
      throw new Error('SERVICE_ADDRESS environment variable is required in production for Consul registration');
    }
    return 'localhost';
  }
  return addr.trim();
}

let isRegistered = false;
let backgroundRetryTimer: NodeJS.Timeout | null = null;

export function isConsulRegistered(): boolean {
  return isRegistered;
}

export function getConsulServiceId(): string {
  const serviceAddress = getServiceAddress();
  return `${env.SERVICE_NAME}-${serviceAddress}-${env.PORT}`;
}

async function consulPut(path: string, body?: unknown, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const data    = body ? JSON.stringify(body) : '';
    const options = {
      hostname: env.CONSUL_HOST,
      port:     env.CONSUL_PORT,
      path,
      method:   'PUT',
      headers:  {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: timeoutMs,
    };

    const req = http.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`Consul responded with HTTP ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Consul HTTP request timed out after ${timeoutMs}ms`));
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function buildRegistration(): ConsulRegistration {
  const serviceAddress = getServiceAddress();
  const serviceId = getConsulServiceId();

  return {
    ID:      serviceId,
    Name:    env.SERVICE_NAME,
    Tags:    [
      'ms2',
      'catalogue',
      'search',
      'traefik.enable=true',
      'traefik.http.routers.ms2.rule=PathPrefix(`/api/offers`) || PathPrefix(`/api/categories`) || PathPrefix(`/api/merchant`) || PathPrefix(`/media`)',
      'traefik.http.routers.ms2.entrypoints=web',
      `traefik.http.services.ms2.loadbalancer.server.port=${env.PORT}`,
    ],
    Address: serviceAddress,
    Port:    env.PORT,
    Check: {
      // Consul uses /health/ready so traffic is only routed when DB & RabbitMQ are ready
      HTTP:                            `http://${serviceAddress}:${env.PORT}/health/ready`,
      Interval:                        '10s',
      Timeout:                         '5s',
      DeregisterCriticalServiceAfter:  '1m',
    },
  };
}

export async function registerWithConsul(maxRetries = 5): Promise<void> {
  const registration = buildRegistration();
  const serviceId = registration.ID;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await consulPut('/v1/agent/service/register', registration);
      isRegistered = true;
      if (backgroundRetryTimer) {
        clearInterval(backgroundRetryTimer);
        backgroundRetryTimer = null;
      }
      logger.info('Registered with Consul successfully', { serviceId, serviceAddress: registration.Address, port: env.PORT });
      return;
    } catch (err: any) {
      const isLast = attempt === maxRetries;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logger.warn(`Consul registration attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delay}ms...`);
      if (isLast) {
        isRegistered = false;
        logger.error('Could not register with Consul after initial retries; starting background retry every 30s', { err });
        scheduleBackgroundRegistrationRetry();
        return;
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function scheduleBackgroundRegistrationRetry(): void {
  if (backgroundRetryTimer) return;
  backgroundRetryTimer = setInterval(async () => {
    try {
      const registration = buildRegistration();
      await consulPut('/v1/agent/service/register', registration);
      isRegistered = true;
      clearInterval(backgroundRetryTimer!);
      backgroundRetryTimer = null;
      logger.info('Background Consul registration succeeded', { serviceId: registration.ID });
    } catch (err: any) {
      isRegistered = false;
      logger.debug('Background Consul registration attempt failed', { error: err.message });
    }
  }, 30000);
  backgroundRetryTimer.unref();
}

export async function deregisterFromConsul(): Promise<void> {
  if (backgroundRetryTimer) {
    clearInterval(backgroundRetryTimer);
    backgroundRetryTimer = null;
  }
  try {
    const serviceId = getConsulServiceId();
    await consulPut(`/v1/agent/service/deregister/${serviceId}`);
    isRegistered = false;
    logger.info('Deregistered from Consul successfully', { serviceId });
  } catch (err: any) {
    logger.warn('Failed to deregister from Consul on shutdown', { message: err?.message });
  }
}
