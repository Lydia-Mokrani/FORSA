// src/messaging/publisher.ts
// Publishes domain events from MS2 to the RabbitMQ topic exchange using publisher confirms.

import { getChannel } from './connection';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { DomainEvent } from '../types';

export async function publishEvent(event: DomainEvent, maxRetries = 2): Promise<boolean> {
  const buffer = Buffer.from(JSON.stringify(event));

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const channel = await getChannel();

      // Check if channel supports publisher confirm callback
      const isConfirmChannel = typeof (channel as any).waitForConfirms === 'function';

      const success = await new Promise<boolean>((resolve) => {
        if (isConfirmChannel) {
          (channel as any).publish(
            env.RABBITMQ_EXCHANGE,
            event.type,
            buffer,
            {
              persistent:  true,
              contentType: 'application/json',
              messageId:   event.eventId,
              timestamp:   Math.floor(Date.now() / 1000),
            },
            (err: any) => {
              if (err) {
                logger.warn('Broker nacked published event', { type: event.type, eventId: event.eventId, attempt, err });
                resolve(false);
              } else {
                resolve(true);
              }
            }
          );
        } else {
          // Standard / mocked channel fallback
          const published = channel.publish(
            env.RABBITMQ_EXCHANGE,
            event.type,
            buffer,
            {
              persistent:  true,
              contentType: 'application/json',
              messageId:   event.eventId,
              timestamp:   Math.floor(Date.now() / 1000),
            }
          );
          resolve(published);
        }
      });

      if (success) {
        logger.debug('Event published and confirmed by broker', { type: event.type, eventId: event.eventId, attempt });
        return true;
      }
    } catch (err) {
      logger.error('Error during event publish attempt', { type: event.type, eventId: event.eventId, attempt, err });
    }

    if (attempt <= maxRetries) {
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  logger.error('Failed to reliably publish event after all retries', { type: event.type, eventId: event.eventId });
  return false;
}
