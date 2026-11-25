import request from 'supertest';
import { app, consul } from '../src/index';
import { eventBus } from '../src/services/event-bus';

jest.mock('../src/services/event-bus', () => ({
  eventBus: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    isBrokerUp: jest.fn().mockReturnValue(true),
  },
}));

describe('MS5 GET /health Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('doit renvoyer HTTP 200 avec status UP quand le broker est connecté', async () => {
    (eventBus.isBrokerUp as jest.Mock).mockReturnValue(true);
    Object.defineProperty(consul, 'registered', { value: true, configurable: true });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'UP',
        service: 'ms5-notifications',
        instanceId: expect.any(String),
        timestamp: expect.any(String),
        broker: 'up',
        registered: true,
      })
    );
  });

  it('doit renvoyer HTTP 200 avec status DEGRADED quand le broker est déconnecté', async () => {
    (eventBus.isBrokerUp as jest.Mock).mockReturnValue(false);
    Object.defineProperty(consul, 'registered', { value: false, configurable: true });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'DEGRADED',
        service: 'ms5-notifications',
        broker: 'down',
        registered: false,
      })
    );
  });
});
