/**
 * Bus d'événements en mémoire (InMemoryEventBus).
 * Activé quand RABBITMQ_ENABLED=false ou quand NODE_ENV !== 'production'.
 * Utile pour le développement local sans broker RabbitMQ.
 * Les abonnements survivent à la durée du process uniquement.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IEventBus, EventEnvelope, EventHandler } from './event-bus.interface';

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  async connect(): Promise<void> {
    console.warn(
      '⚠️  [EventBus] Mode IN-MEMORY actif (RABBITMQ_ENABLED=false ou dev local).' +
      ' Les événements ne sont pas persistants et ne traversent pas les services.'
    );
  }

  async publish<T>(routingKey: string, payload: T): Promise<void> {
    const envelope: EventEnvelope<T> = {
      eventId: uuidv4(),
      type: routingKey,
      occurredAt: new Date().toISOString(),
      data: payload,
      payload,
    };

    console.log(`📤 [EventBus:InMemory] Publié: ${routingKey} (eventId: ${envelope.eventId})`);

    const subscribers = this.handlers.get(routingKey) ?? [];
    // Matching simple : exact match ou wildcard '#'
    const wildcardSubscribers = this.handlers.get('#') ?? [];
    const allHandlers = [...subscribers, ...wildcardSubscribers];

    for (const handler of allHandlers) {
      // fire-and-forget avec log d'erreur (ne bloque pas l'appelant)
      handler(envelope).catch((err) =>
        console.error(`❌ [EventBus:InMemory] Erreur handler pour ${routingKey}:`, err)
      );
    }
  }

  async subscribe<T>(
    routingKeysOrKey: string | string[],
    handler: EventHandler<T>,
    _queueName?: string
  ): Promise<void> {
    const keys = Array.isArray(routingKeysOrKey) ? routingKeysOrKey : [routingKeysOrKey];
    for (const key of keys) {
      const existing = this.handlers.get(key) ?? [];
      this.handlers.set(key, [...existing, handler as EventHandler]);
      console.log(`📥 [EventBus:InMemory] Abonné à: ${key}`);
    }
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }
}
