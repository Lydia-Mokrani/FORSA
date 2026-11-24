import amqp, { Channel, ChannelModel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import type { IEventBus, EventHandler, EventEnvelope, PublishOptions } from './event-bus.interface';
import { BoundedIdempotencyCache } from './idempotency';

export type { IEventBus, EventHandler, EventEnvelope, PublishOptions } from './event-bus.interface';
export { InMemoryEventBus } from './in-memory-event-bus';
export { BoundedIdempotencyCache } from './idempotency';

interface SubscriptionRecord {
  routingKeys: string[];
  handler: EventHandler;
  queueName?: string;
  idempotencyCache: BoundedIdempotencyCache;
}

export class RabbitMQClient implements IEventBus {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private exchange: string = 'forsa.events';
  private dlqExchange: string = 'forsa.dlq.exchange';
  private dlqQueue: string = 'forsa.dlq.queue';

  private isConnected: boolean = false;
  private isClosing: boolean = false;
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private subscriptions: SubscriptionRecord[] = [];

  constructor(
    private url: string,
    private serviceName: string = 'forsa-service'
  ) {}

  /**
   * Calcule le délai de réessai exponentiel avec gigue (jitter).
   * Formule : min(maxMs, initialMs * 2^attempts) + jitter (0..500ms).
   */
  public calculateBackoffDelay(attempts: number): number {
    const initialMs = parseInt(process.env.RABBITMQ_RECONNECT_INITIAL_MS || '1000', 10);
    const maxMs = parseInt(process.env.RABBITMQ_RECONNECT_MAX_MS || '30000', 10);
    const exponential = Math.min(maxMs, initialMs * Math.pow(2, attempts));
    const jitter = Math.floor(Math.random() * 500);
    return exponential + jitter;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      if (!this.connection) {
        throw new Error('[RabbitMQ] Impossible d établir la connexion.');
      }

      this.connection.on('error', (err) => {
        console.error(`❌ [RabbitMQ] Erreur de connexion (${this.serviceName}):`, err?.message || err);
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        if (!this.isClosing) {
          console.warn(`⚠️ [RabbitMQ] Connexion fermée inopinément (${this.serviceName}). Reconnexion en cours...`);
          this.handleDisconnect();
        }
      });

      this.channel = await this.connection.createChannel();

      this.channel.on('error', (err) => {
        console.error(`❌ [RabbitMQ] Erreur de canal (${this.serviceName}):`, err?.message || err);
        this.handleDisconnect();
      });

      this.channel.on('close', () => {
        if (!this.isClosing && this.isConnected) {
          console.warn(`⚠️ [RabbitMQ] Canal fermé inopinément (${this.serviceName}).`);
          this.handleDisconnect();
        }
      });

      // Assertions initiales d'exchange et de DLQ
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      await this.channel.assertExchange(this.dlqExchange, 'fanout', { durable: true });
      await this.channel.assertQueue(this.dlqQueue, { durable: true });
      await this.channel.bindQueue(this.dlqQueue, this.dlqExchange, '');

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      console.log(`✅ [RabbitMQ] Connecté au broker (${this.serviceName}) et exchanges prêts`);

      // Ré-enregistrement automatique des consommateurs après reconnexion
      await this.rebindAllConsumers();
    } catch (err) {
      this.isConnected = false;
      console.error(`❌ [RabbitMQ] Échec de connexion au broker (${this.serviceName}) :`, err);
      if (!this.isClosing) {
        this.scheduleReconnect();
      }
      throw err;
    }
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.channel = null;
    this.connection = null;
    if (!this.isClosing && !this.isReconnecting) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.isReconnecting = true;
    const delay = this.calculateBackoffDelay(this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`🔄 [RabbitMQ] Reconnexion programmée dans ${delay}ms (tentative ${this.reconnectAttempts})...`);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        // L'erreur déclenche un nouveau scheduleReconnect dans catch
      }
    }, delay);
  }

  private async rebindAllConsumers(): Promise<void> {
    if (this.subscriptions.length === 0) return;
    console.log(`🔄 [RabbitMQ] Restauration de ${this.subscriptions.length} abonnements après reconnexion...`);
    for (const sub of this.subscriptions) {
      await this.setupConsumer(sub);
    }
  }

  /**
   * Publie un événement métier avec l'enveloppe standardisée (type + name).
   * En cas de broker indisponible, échoue immédiatement avec BROKER_UNAVAILABLE (fail-fast, aucun blocage).
   */
  async publish<T>(routingKey: string, payload: T, options?: PublishOptions): Promise<void> {
    if (!this.channel || !this.isConnected) {
      throw new Error(`BROKER_UNAVAILABLE: RabbitMQ broker is not connected (${this.serviceName})`);
    }

    const envelope: EventEnvelope<T> = {
      eventId: uuidv4(),
      type: routingKey,
      name: routingKey,
      occurredAt: new Date().toISOString(),
      data: payload,
      payload,
    };

    const messageBuffer = Buffer.from(JSON.stringify(envelope));
    const publishProps: amqp.Options.Publish = {
      persistent: options?.persistent ?? true,
      messageId: envelope.eventId,
      timestamp: Date.now(),
      headers: options?.headers || {},
    };

    if (options?.expiration !== undefined) {
      publishProps.expiration = String(options.expiration);
    } else if (routingKey === 'telegram.send.otp') {
      const defaultOtpTtlMs = parseInt(process.env.OTP_TTL_SECONDS || '300', 10) * 1000;
      publishProps.expiration = String(defaultOtpTtlMs);
    }

    this.channel.publish(this.exchange, routingKey, messageBuffer, publishProps);
    console.log(`📤 [RabbitMQ] Publié: ${routingKey} (eventId: ${envelope.eventId})`);
  }

  /**
   * Souscrit à un ou plusieurs routing keys avec :
   * - File durable et Dead-Letter Queue (DLQ)
   * - Détection d'idempotence par eventId (Bounded LRU)
   * - Comptage des tentatives via header et envoi en DLQ après RABBITMQ_MAX_RETRIES
   * - Vérification d'expiration / TTL des messages
   */
  async subscribe<T>(
    routingKeysOrKey: string | string[],
    handler: EventHandler<T>,
    queueName?: string
  ): Promise<void> {
    const keys = Array.isArray(routingKeysOrKey) ? routingKeysOrKey : [routingKeysOrKey];
    const subRecord: SubscriptionRecord = {
      routingKeys: keys,
      handler: handler as EventHandler,
      queueName,
      idempotencyCache: new BoundedIdempotencyCache(
        parseInt(process.env.IDEMPOTENCE_CACHE_SIZE || '10000', 10),
        parseInt(process.env.IDEMPOTENCE_CACHE_TTL_MS || '86400000', 10)
      ),
    };

    this.subscriptions.push(subRecord);

    if (this.channel && this.isConnected) {
      await this.setupConsumer(subRecord);
    }
  }

  private async setupConsumer(sub: SubscriptionRecord): Promise<void> {
    if (!this.channel) return;

    const resolvedQueue = sub.queueName || `q.${this.serviceName}.${sub.routingKeys.join('_')}`;

    await this.channel.assertQueue(resolvedQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.dlqExchange,
      },
    });

    for (const key of sub.routingKeys) {
      await this.channel.bindQueue(resolvedQueue, this.exchange, key);
    }

    this.channel.prefetch(1);

    await this.channel.consume(resolvedQueue, async (msg) => {
      if (!msg) return;

      const headers = msg.properties.headers || {};
      const currentAttempt = Number(headers['x-retry-count'] || headers['x-attempt'] || 1);
      const maxRetries = parseInt(process.env.RABBITMQ_MAX_RETRIES || '3', 10);

      try {
        const rawContent = msg.content.toString();
        const content = JSON.parse(rawContent) as EventEnvelope;

        // 1. Vérification d'expiration TTL (message expiré drop & ack)
        if (msg.properties.expiration) {
          const expirationMs = Number(msg.properties.expiration);
          const occurredMs = content.occurredAt ? new Date(content.occurredAt).getTime() : 0;
          if (occurredMs > 0 && Date.now() > occurredMs + expirationMs) {
            console.warn(`⏰ [RabbitMQ] Message expiré ignoré (eventId: ${content.eventId}, exp: ${expirationMs}ms)`);
            this.channel?.ack(msg);
            return;
          }
        }

        // 2. Détection d'idempotence (Bounded LRU)
        if (content.eventId && sub.idempotencyCache.has(content.eventId)) {
          console.log(`🔁 [RabbitMQ] Événement déjà traité (eventId: ${content.eventId}), ignoré pour idempotence`);
          this.channel?.ack(msg);
          return;
        }

        // Marquer dans le cache d'idempotence avant l'exécution du handler
        if (content.eventId) {
          sub.idempotencyCache.add(content.eventId);
        }

        // 3. Exécution du handler
        await sub.handler(content);
        this.channel?.ack(msg);
      } catch (err: any) {
        console.error(`❌ [RabbitMQ] Erreur de traitement sur ${resolvedQueue} (tentative ${currentAttempt}/${maxRetries}):`, err?.message || err);

        if (currentAttempt >= maxRetries) {
          console.warn(`💀 [RabbitMQ] Plafond de réessais atteint (${currentAttempt}/${maxRetries}). Message routé vers Dead-Letter Queue (DLQ).`);
          this.channel?.nack(msg, false, false);
        } else {
          const retryDelay = parseInt(process.env.RABBITMQ_RETRY_DELAY_MS || '1000', 10);
          console.log(`⏱️ [RabbitMQ] Nouvelle tentative (${currentAttempt + 1}/${maxRetries}) programmée dans ${retryDelay}ms`);

          setTimeout(async () => {
            try {
              if (this.channel && this.isConnected) {
                this.channel.sendToQueue(resolvedQueue, msg.content, {
                  ...msg.properties,
                  headers: {
                    ...headers,
                    'x-retry-count': currentAttempt + 1,
                    'x-attempt': currentAttempt + 1,
                  },
                });
              }
            } catch (repubErr) {
              console.error('[RabbitMQ] Erreur lors du republish de retry:', repubErr);
            }
          }, retryDelay);

          this.channel?.ack(msg);
        }
      }
    });

    console.log(`📥 [RabbitMQ] Écoute active sur ${resolvedQueue} pour [${sub.routingKeys.join(', ')}]`);
  }

  isBrokerUp(): boolean {
    return this.isConnected;
  }

  getStatus(): 'up' | 'down' | 'disabled' {
    return this.isConnected ? 'up' : 'down';
  }

  async close(): Promise<void> {
    this.isClosing = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnected = false;
    try {
      await this.channel?.close();
    } catch {}
    try {
      await this.connection?.close();
    } catch {}
    this.channel = null;
    this.connection = null;
    this.isClosing = false;
  }
}
