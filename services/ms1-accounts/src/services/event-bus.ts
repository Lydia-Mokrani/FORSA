/**
 * Factory du bus d'événements MS1.
 * - Si RABBITMQ_ENABLED=false → InMemoryEventBus (dev local sans Docker)
 * - Sinon → RabbitMQClient (production / staging)
 *
 * Usage dans le code : import { eventBus } from './event-bus'
 */

import { RabbitMQClient, InMemoryEventBus } from '@forsa/common';
import type { IEventBus } from '@forsa/common';
import { config } from '../config/env';

function createEventBus(): IEventBus {
  const enabled = process.env.RABBITMQ_ENABLED !== 'false';

  if (!enabled) {
    if (process.env.NODE_ENV !== 'production') {
      return new InMemoryEventBus();
    }
    // En production, forcer RabbitMQ même si variable mal réglée
    console.error('[EventBus] RABBITMQ_ENABLED=false en production est interdit. Passage forcé en RabbitMQ.');
  }

  return new RabbitMQClient(config.rabbitmqUrl, 'ms1-accounts');
}

export const eventBus: IEventBus = createEventBus();

export async function initEventBus(): Promise<void> {
  await eventBus.connect();
}
