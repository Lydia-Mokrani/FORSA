import { RabbitMQClient } from '@forsa/common';
import { config } from '../config/env';

export const rabbitMQ = new RabbitMQClient(config.rabbitmqUrl, 'ms3-reservations');

export async function initRabbitMQ(): Promise<void> {
  try {
    await rabbitMQ.connect();
    console.log('[MS3-RabbitMQ] Connected to', config.rabbitmqUrl);
    // No subscriptions needed for the scaffold stage.
  } catch (err) {
    console.warn('[MS3-RabbitMQ] Could not connect – service will continue without async events.');
  }
}
