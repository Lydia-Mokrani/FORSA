// src/messaging/publisher.ts
// Publishes domain events from MS2 to the RabbitMQ topic exchange.

import { getChannel } from './connection';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { DomainEvent } from '../types';

export async function publishEvent(event: DomainEvent): Promise<void> {
  try {
    const channel = await getChannel();
    const buffer  = Buffer.from(JSON.stringify(event));

    channel.publish(
      env.RABBITMQ_EXCHANGE,
      event.type,         // routing key = event type
      buffer,
      {
        persistent:  true,            // survive broker restart
        contentType: 'application/json',
        messageId:   event.eventId,
        timestamp:   Math.floor(Date.now() / 1000),
      }
    );

    logger.debug('Event published', { type: event.type, eventId: event.eventId });
  } catch (err) {
    // Log and continue — do not crash the request if RabbitMQ is temporarily unavailable
    logger.error('Failed to publish event', { type: event.type, err });
  }
}
