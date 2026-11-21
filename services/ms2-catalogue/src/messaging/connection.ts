// src/messaging/connection.ts
// Manages a single persistent RabbitMQ connection for MS2.
// Implements publisher confirms, reconnect logic, and dead-letter queues.

import amqplib from 'amqplib';
import { env } from '../config/env';
import { logger } from '../config/logger';

let connection: amqplib.ChannelModel | null = null;
let channel:    amqplib.Channel      | null = null;
let reconnectTimer: NodeJS.Timeout   | null = null;

const EXCHANGE = env.RABBITMQ_EXCHANGE;

export async function getChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;
  throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
}

export async function connectRabbitMQ(): Promise<void> {
  try {
    logger.info('Connecting to RabbitMQ...');
    const conn = await amqplib.connect(env.RABBITMQ_URL);
    connection = conn;

    // Use a ConfirmChannel so publisher acknowledges message persistence
    const ch = await conn.createConfirmChannel();
    channel = ch as unknown as amqplib.Channel;

    // Declare the primary topic exchange — durable so it survives broker restarts
    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

    // Declare MS2's queues and dead-letter queues
    await declareQueues(ch as unknown as amqplib.Channel);

    logger.info('RabbitMQ connected, confirm channel created, queues and DLQs declared.');

    conn.on('error', (err: any) => {
      logger.error('RabbitMQ connection error', { err });
      scheduleReconnect();
    });

    conn.on('close', () => {
      logger.warn('RabbitMQ connection closed. Reconnecting...');
      scheduleReconnect();
    });
  } catch (err) {
    logger.error('RabbitMQ connection failed', { err });
    scheduleReconnect();
  }
}

async function declareQueues(ch: amqplib.Channel): Promise<void> {
  const deadLetterExchange = `${EXCHANGE}.dlx`;
  await ch.assertExchange(deadLetterExchange, 'topic', { durable: true });

  const queues = [
    {
      name: 'ms2.merchant.events',
      patterns: ['merchant.approved', 'merchant.rejected', 'merchant.suspended', 'merchant.reactivated'],
    },
    {
      name: 'ms2.shop.events',
      patterns: ['shop.created', 'shop.updated', 'shop.rating_updated', 'shop.status_changed'],
    },
    {
      name: 'ms2.offer.verified',
      patterns: ['offer.date_verified', 'offer.date_verified.rejected', 'offer.manual_review'],
    },
    {
      name: 'ms2.reservation.events',
      patterns: ['reservation.picked_up'],
    },
  ];

  for (const q of queues) {
    // 1. Declare dedicated Dead Letter Queue (DLQ) and bind to DLX
    const dlqName = `${q.name}.dlq`;
    await ch.assertQueue(dlqName, { durable: true });
    for (const pattern of q.patterns) {
      await ch.bindQueue(dlqName, deadLetterExchange, pattern);
    }

    // 2. Declare primary queue routing nacked / expired messages to DLX
    await ch.assertQueue(q.name, {
      durable:   true,
      arguments: {
        'x-dead-letter-exchange': deadLetterExchange,
        'x-message-ttl': 86400000,
      },
    });
    for (const pattern of q.patterns) {
      await ch.bindQueue(q.name, EXCHANGE, pattern);
    }
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  channel    = null;
  connection = null;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectRabbitMQ();
      const { startConsumers } = await import('./consumers');
      await startConsumers();
      logger.info('RabbitMQ reconnected and consumers successfully restarted.');
    } catch (err) {
      logger.error('RabbitMQ reconnect attempt failed', { err });
      scheduleReconnect();
    }
  }, 5000);
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch { /* ignore close errors */ }
  finally {
    channel = null;
    connection = null;
  }
}

export function isRabbitMQConnected(): boolean {
  return connection !== null && channel !== null;
}
