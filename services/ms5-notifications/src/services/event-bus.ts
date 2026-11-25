import { IEventBus, RabbitMQClient, InMemoryEventBus } from '@forsa/common';
import { config } from '../config/env';

function createEventBus(): IEventBus {
  if (config.eventBusDriver === 'memory') {
    return new InMemoryEventBus();
  }

  return new RabbitMQClient(config.rabbitmqUrl, 'ms5-notifications');
}

export const eventBus: IEventBus = createEventBus();
