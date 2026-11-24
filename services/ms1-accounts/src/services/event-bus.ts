/**
 * Factory du bus d'événements MS1.
 * - EVENT_BUS_DRIVER=rabbitmq|memory (memory pour tests unitaires/dev local sans Docker)
 * - Alias déprécié conservé : RABBITMQ_ENABLED=false
 *
 * Usage dans le code : import { eventBus } from './event-bus'
 */

import { RabbitMQClient, InMemoryEventBus } from '@forsa/common';
import type { IEventBus } from '@forsa/common';
import { config } from '../config/env';

export function createEventBus(): IEventBus {
  let driver = process.env.EVENT_BUS_DRIVER?.toLowerCase();

  // Rétrocompatibilité : prise en compte de l'alias déprécié RABBITMQ_ENABLED
  if (!driver) {
    if (process.env.RABBITMQ_ENABLED === 'false') {
      driver = 'memory';
    } else {
      driver = 'rabbitmq';
    }
  }

  if (driver === 'memory') {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ [EventBus] EVENT_BUS_DRIVER=memory est formellement interdit en environnement de production. Forçage en RabbitMQ.');
      return new RabbitMQClient(config.rabbitmqUrl, 'ms1-accounts');
    }
    return new InMemoryEventBus();
  }

  return new RabbitMQClient(config.rabbitmqUrl, 'ms1-accounts');
}

export const eventBus: IEventBus = createEventBus();

export async function initEventBus(): Promise<void> {
  await eventBus.connect();
}
