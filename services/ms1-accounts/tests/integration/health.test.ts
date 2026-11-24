import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { consul } from '../../src/services/consul.service';
import { eventBus } from '../../src/services/event-bus';

describe('Integration - Health & Discovery Endpoints (/health)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('doit renvoyer HTTP 200 et statut UP quand DB est accessible', async () => {
    jest.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ '?column?': 1 }] as any);
    jest.spyOn(consul, 'registered', 'get').mockReturnValue(true);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'UP');
    expect(response.body).toHaveProperty('service', 'ms1-accounts');
    expect(response.body).toHaveProperty('instanceId');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('db', 'up');
    expect(response.body).toHaveProperty('registered', true);
  });

  it('doit renvoyer HTTP 503 et statut DOWN quand DB est indisponible', async () => {
    jest.spyOn(prisma, '$queryRawUnsafe').mockRejectedValue(new Error('Connection refused'));
    jest.spyOn(consul, 'registered', 'get').mockReturnValue(true);

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('status', 'DOWN');
    expect(response.body).toHaveProperty('db', 'down');
  });

  it('doit renvoyer HTTP 200 et statut DEGRADED quand DB est up mais broker est down', async () => {
    jest.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue([{ '?column?': 1 }] as any);
    jest.spyOn(consul, 'registered', 'get').mockReturnValue(true);

    const prevDriver = process.env.EVENT_BUS_DRIVER;
    const prevRmq = process.env.RABBITMQ_ENABLED;
    process.env.EVENT_BUS_DRIVER = 'rabbitmq';
    delete process.env.RABBITMQ_ENABLED;

    jest.spyOn(eventBus as any, 'isBrokerUp').mockReturnValue(false);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'DEGRADED');
    expect(response.body).toHaveProperty('broker', 'down');
    expect(response.body).toHaveProperty('db', 'up');

    process.env.EVENT_BUS_DRIVER = prevDriver;
    if (prevRmq !== undefined) process.env.RABBITMQ_ENABLED = prevRmq;
  });
});
