import { RabbitMQClient } from '@forsa/common';
import { config } from '../config/env';

export const rabbitMQ = new RabbitMQClient(config.rabbitmqUrl, 'ms3-reservations');

export const suspendedShops = new Set<string>();

export async function publishReservationEvent(routingKey: string, payload: unknown): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rabbitMQ.publish(routingKey, payload);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function initRabbitMQ(): Promise<void> {
  try {
    await rabbitMQ.connect();
    console.log('[MS3-RabbitMQ] Connected to', config.rabbitmqUrl);
    await rabbitMQ.subscribe('merchant.suspended', async (event) => {
      const payload = (event.payload ?? (event as { data?: { shopId?: string } }).data ?? {}) as { shopId?: string };
      if (payload.shopId) suspendedShops.add(payload.shopId);
    });
  } catch (err) {
    console.warn('[MS3-RabbitMQ] Could not connect – service will continue without async events.');
  }
}
