/**
 * Interface abstraite du bus d'événements FORSA.
 * Deux implémentations : RabbitMQ (production/staging) et InMemory (dev local sans broker).
 */

export interface EventEnvelope<T = any> {
  eventId: string;
  type: string;
  occurredAt: string;
  data: T;
  payload?: T;
}

export type EventHandler<T = any> = (event: EventEnvelope<T>) => Promise<void>;

export interface IEventBus {
  connect(): Promise<void>;
  publish<T>(routingKey: string, payload: T): Promise<void>;
  subscribe<T>(
    routingKeysOrKey: string | string[],
    handler: EventHandler<T>,
    queueName?: string
  ): Promise<void>;
  close(): Promise<void>;
}
