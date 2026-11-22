import amqp, { Channel, ChannelModel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import type { IEventBus, EventHandler } from './event-bus.interface';

export type { IEventBus, EventHandler } from './event-bus.interface';
export { InMemoryEventBus } from './in-memory-event-bus';

export interface EventEnvelope<T = any> {
  eventId: string;
  type: string;
  occurredAt: string;
  data: T;
  payload?: T;
}

export class RabbitMQClient implements IEventBus {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private exchange: string = 'forsa.events';
  private dlqExchange: string = 'forsa.dlq.exchange';
  private dlqQueue: string = 'forsa.dlq.queue';

  constructor(
    private url: string,
    private serviceName: string = 'forsa-service'
  ) {}

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      if (!this.connection) {
        throw new Error('[RabbitMQ] Impossible d établir la connexion.');
      }

      this.channel = await this.connection.createChannel();

      // Exchange principal Topic
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });

      // Infrastructure Dead-Letter Queue (DLQ)
      await this.channel.assertExchange(this.dlqExchange, 'fanout', { durable: true });
      await this.channel.assertQueue(this.dlqQueue, { durable: true });
      await this.channel.bindQueue(this.dlqQueue, this.dlqExchange, '');

      console.log(`✅ [RabbitMQ] Connecté au broker (${this.serviceName}) et exchange prêt`);
    } catch (err) {
      console.error(`❌ [RabbitMQ] Échec de connexion au broker (${this.serviceName}) :`, err);
      throw err;
    }
  }

  /**
   * Publie un événement métier avec l'enveloppe standardisée
   */
  async publish<T>(routingKey: string, payload: T): Promise<void> {
    if (!this.channel) {
      throw new Error('[RabbitMQ] Canal non initialisé. Appelez connect() d abord.');
    }

    const envelope: EventEnvelope<T> = {
      eventId: uuidv4(),
      type: routingKey,
      occurredAt: new Date().toISOString(),
      data: payload,
      payload,
    };

    const messageBuffer = Buffer.from(JSON.stringify(envelope));
    this.channel.publish(this.exchange, routingKey, messageBuffer, {
      persistent: true,
      messageId: envelope.eventId,
      timestamp: Date.now(),
    });

    console.log(`📤 [RabbitMQ] Publié: ${routingKey} (eventId: ${envelope.eventId})`);
  }

  /**
   * Souscrit à un ou plusieurs routing keys avec file durable et gestion de DLQ
   */
  async subscribe<T>(
    routingKeysOrKey: string | string[],
    handler: (event: EventEnvelope<T>) => Promise<void>,
    queueName?: string
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('[RabbitMQ] Canal non initialisé.');
    }

    const keys = Array.isArray(routingKeysOrKey) ? routingKeysOrKey : [routingKeysOrKey];
    const resolvedQueue = queueName || `q.${this.serviceName}.${keys.join('_')}`;

    // File avec DLQ en cas d'erreur non résolue
    await this.channel.assertQueue(resolvedQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.dlqExchange,
      },
    });

    for (const key of keys) {
      await this.channel.bindQueue(resolvedQueue, this.exchange, key);
    }

    this.channel.prefetch(1);

    this.channel.consume(resolvedQueue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString()) as EventEnvelope<T>;
        await handler(content);
        this.channel?.ack(msg);
      } catch (err) {
        console.error(`❌ [RabbitMQ] Erreur de traitement sur ${resolvedQueue} :`, err);
        // Nack sans requeue -> envoyé automatiquement en Dead-Letter Queue (DLQ)
        this.channel?.nack(msg, false, false);
      }
    });

    console.log(`📥 [RabbitMQ] Écoute active sur ${resolvedQueue} pour [${keys.join(', ')}]`);
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
