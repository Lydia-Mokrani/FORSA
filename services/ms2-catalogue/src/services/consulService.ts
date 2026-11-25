// src/services/consulService.ts
// Registers MS2 with Consul for service discovery.
// Called once at startup. Consul health check hits GET /health.

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

async function consulPut(path: string, body: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const data    = JSON.stringify(body);
    const options = {
      hostname: env.CONSUL_HOST,
      port:     env.CONSUL_PORT,
      path,
      method:   'PUT',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };

    const req = http.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`Consul responded with ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export async function registerWithConsul(): Promise<void> {
  const serviceAddress = process.env.SERVICE_ADDRESS ?? 'ms2-catalogue'; // Docker service name
  const registration: ConsulRegistration = {
    ID:      `${env.SERVICE_NAME}-${env.PORT}`,
    Name:    env.SERVICE_NAME,
    Tags:    ['ms2', 'catalogue', 'search', 'traefik.enable=true'],
    Address: serviceAddress,
    Port:    env.PORT,
    Check: {
      HTTP:                            `http://${serviceAddress}:${env.PORT}/health`,
      Interval:                        '10s',
      Timeout:                         '5s',
      DeregisterCriticalServiceAfter:  '1m',
    },
  };

  try {
    await consulPut('/v1/agent/service/register', registration);
    logger.info('Registered with Consul', { serviceId: registration.ID });
  } catch (err) {
    // Not fatal — log and continue. Service discovery is best-effort at startup.
    logger.warn('Could not register with Consul (is Consul running?)', { err });
  }
}
