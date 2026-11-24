import { RabbitMQClient, InMemoryEventBus, BoundedIdempotencyCache } from '../src/rabbitmq';
import type { EventEnvelope } from '../src/rabbitmq';

describe('EventBus - RabbitMQClient & InMemoryEventBus Unit Tests', () => {
  describe('Enveloppe événementielle (type et name)', () => {
    it('doit inclure à la fois type et name (= routingKey) dans l\'enveloppe InMemory', async () => {
      const bus = new InMemoryEventBus();
      await bus.connect();

      let receivedEvent: EventEnvelope | null = null;
      await bus.subscribe('shop.created', async (event) => {
        receivedEvent = event;
      });

      await bus.publish('shop.created', { id: 'shop-123', name: 'Boutique Test' });

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe('shop.created');
      expect(receivedEvent!.name).toBe('shop.created');
      expect(receivedEvent!.type).toBe(receivedEvent!.name);
      expect(receivedEvent!.data).toEqual({ id: 'shop-123', name: 'Boutique Test' });
      expect(receivedEvent!.payload).toEqual(receivedEvent!.data);
      expect(receivedEvent!.eventId).toBeDefined();
      expect(receivedEvent!.occurredAt).toBeDefined();

      await bus.close();
    });

    it('doit inclure type et name dans l\'enveloppe publiée par RabbitMQClient', async () => {
      const client = new RabbitMQClient('amqp://localhost', 'test-service');

      // Simule un channel amqplib
      const publishedMessages: any[] = [];
      const fakeChannel = {
        publish: jest.fn((exchange: string, routingKey: string, content: Buffer, options: any) => {
          publishedMessages.push({
            exchange,
            routingKey,
            content: JSON.parse(content.toString()),
            options,
          });
          return true;
        }),
      };

      (client as any).channel = fakeChannel;
      (client as any).isConnected = true;

      await client.publish('order.paid', { orderId: 'ord-999', amount: 1500 });

      expect(fakeChannel.publish).toHaveBeenCalledTimes(1);
      const envelope = publishedMessages[0].content;
      expect(envelope.type).toBe('order.paid');
      expect(envelope.name).toBe('order.paid');
      expect(envelope.name).toBe(envelope.type);
      expect(envelope.data).toEqual({ orderId: 'ord-999', amount: 1500 });
      expect(envelope.eventId).toBeDefined();
    });

    it('doit échouer immédiatement avec BROKER_UNAVAILABLE si le broker est déconnecté', async () => {
      const client = new RabbitMQClient('amqp://localhost', 'test-service');
      (client as any).isConnected = false;

      await expect(client.publish('test.event', { foo: 'bar' })).rejects.toThrow(
        /BROKER_UNAVAILABLE/
      );
    });
  });

  describe('Algorithme de Backoff Reconnexion avec Gigue (Jitter)', () => {
    it('doit calculer une progression exponentielle bornée par maxMs avec gigue', () => {
      const client = new RabbitMQClient('amqp://localhost', 'test-service');

      process.env.RABBITMQ_RECONNECT_INITIAL_MS = '1000';
      process.env.RABBITMQ_RECONNECT_MAX_MS = '30000';

      // Tentative 0 : 1000 * 2^0 = 1000 + (0..500)
      const delay0 = client.calculateBackoffDelay(0);
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1500);

      // Tentative 1 : 1000 * 2^1 = 2000 + (0..500)
      const delay1 = client.calculateBackoffDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2500);

      // Tentative 2 : 1000 * 2^2 = 4000 + (0..500)
      const delay2 = client.calculateBackoffDelay(2);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4500);

      // Tentative 10 (plafonnée à 30 000 ms)
      const delay10 = client.calculateBackoffDelay(10);
      expect(delay10).toBeGreaterThanOrEqual(30000);
      expect(delay10).toBeLessThanOrEqual(30500);
    });
  });

  describe('Idempotence des Consommateurs (BoundedIdempotencyCache)', () => {
    it('doit ignorer les doublons sur la base du même eventId et respecter la limite LRU', () => {
      const cache = new BoundedIdempotencyCache(3, 10000);

      expect(cache.has('evt-1')).toBe(false);
      cache.add('evt-1');
      expect(cache.has('evt-1')).toBe(true);

      cache.add('evt-2');
      cache.add('evt-3');
      expect(cache.size).toBe(3);

      // Éviction LRU du plus ancien (evt-1)
      cache.add('evt-4');
      expect(cache.size).toBe(3);
      expect(cache.has('evt-1')).toBe(false);
      expect(cache.has('evt-2')).toBe(true);
      expect(cache.has('evt-3')).toBe(true);
      expect(cache.has('evt-4')).toBe(true);
    });

    it('doit expirer les entrées après le TTL spécifié', async () => {
      const cache = new BoundedIdempotencyCache(10, 50); // TTL 50ms
      cache.add('evt-short');
      expect(cache.has('evt-short')).toBe(true);

      await new Promise((r) => setTimeout(r, 60));
      expect(cache.has('evt-short')).toBe(false);
    });
  });

  describe('Retry & Dead-Letter Queue (DLQ)', () => {
    it('doit nack sans requeue (vers DLQ) quand le nombre d\'essais atteint RABBITMQ_MAX_RETRIES', async () => {
      const client = new RabbitMQClient('amqp://localhost', 'test-service');

      let consumerCallback: (msg: any) => Promise<void> = async () => {};

      const fakeChannel = {
        assertQueue: jest.fn().mockResolvedValue({}),
        bindQueue: jest.fn().mockResolvedValue({}),
        prefetch: jest.fn(),
        consume: jest.fn((queue: string, cb: any) => {
          consumerCallback = cb;
          return Promise.resolve({ consumerTag: 'ctag-1' });
        }),
        ack: jest.fn(),
        nack: jest.fn(),
        sendToQueue: jest.fn(),
      };

      (client as any).channel = fakeChannel;
      (client as any).isConnected = true;

      // Souscription avec un handler qui échoue systématiquement
      const failingHandler = jest.fn().mockRejectedValue(new Error('Erreur métier'));
      await client.subscribe('test.failing', failingHandler, 'q.test.failing');

      process.env.RABBITMQ_MAX_RETRIES = '3';

      // Message qui a déjà atteint la 3ème tentative
      const msgMaxRetries = {
        content: Buffer.from(
          JSON.stringify({
            eventId: 'evt-fail-final',
            type: 'test.failing',
            data: { test: true },
          })
        ),
        properties: {
          headers: { 'x-retry-count': 3, 'x-attempt': 3 },
        },
      };

      await consumerCallback(msgMaxRetries);

      expect(failingHandler).toHaveBeenCalledTimes(1);
      // À 3 tentatives >= maxRetries : appel nack(msg, false, false) pour routage DLQ
      expect(fakeChannel.nack).toHaveBeenCalledWith(msgMaxRetries, false, false);
      expect(fakeChannel.ack).not.toHaveBeenCalled();
    });
  });

  describe('Expiration / TTL des Messages & OTP', () => {
    it('doit transmettre l\'expiration dans les propriétés de publication', async () => {
      const client = new RabbitMQClient('amqp://localhost', 'test-service');
      const publishedMessages: any[] = [];

      const fakeChannel = {
        publish: jest.fn((exchange: string, routingKey: string, content: Buffer, options: any) => {
          publishedMessages.push({ exchange, routingKey, options });
          return true;
        }),
      };

      (client as any).channel = fakeChannel;
      (client as any).isConnected = true;

      await client.publish(
        'telegram.send.otp',
        { code: '123456', chatId: '111' },
        { expiration: 300000 }
      );

      expect(fakeChannel.publish).toHaveBeenCalledTimes(1);
      expect(publishedMessages[0].options.expiration).toBe('300000');
    });

    it('doit ignorer et acquitter un message expiré sans exécuter le handler', async () => {
      const client = new RabbitMQClient('amqp://localhost', 'test-service');

      let consumerCallback: (msg: any) => Promise<void> = async () => {};

      const fakeChannel = {
        assertQueue: jest.fn().mockResolvedValue({}),
        bindQueue: jest.fn().mockResolvedValue({}),
        prefetch: jest.fn(),
        consume: jest.fn((queue: string, cb: any) => {
          consumerCallback = cb;
          return Promise.resolve({ consumerTag: 'ctag-2' });
        }),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      (client as any).channel = fakeChannel;
      (client as any).isConnected = true;

      const handler = jest.fn().mockResolvedValue(undefined);
      await client.subscribe('telegram.send.otp', handler, 'q.test.otp');

      // Message émis il y a 600 secondes avec une expiration de 300 secondes (expiré !)
      const expiredMessage = {
        content: Buffer.from(
          JSON.stringify({
            eventId: 'evt-expired-otp',
            type: 'telegram.send.otp',
            occurredAt: new Date(Date.now() - 600 * 1000).toISOString(),
            data: { code: '123456' },
          })
        ),
        properties: {
          expiration: '300000', // 300s en ms
          headers: {},
        },
      };

      await consumerCallback(expiredMessage);

      // Le handler ne doit PAS être exécuté
      expect(handler).not.toHaveBeenCalled();
      // Le message expiré doit être acké pour sortir de la file
      expect(fakeChannel.ack).toHaveBeenCalledWith(expiredMessage);
    });
  });
});
