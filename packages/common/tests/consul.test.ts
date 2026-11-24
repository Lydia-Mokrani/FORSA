import axios from 'axios';
import { ConsulRegistry } from '../src/consul';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ConsulRegistry Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Consul Backoff Schedule', () => {
    it('doit calculer une progression exponentielle avec gigue', () => {
      const registry = new ConsulRegistry({
        consulUrl: 'http://localhost:8500',
        serviceName: 'ms1-accounts',
        serviceId: 'ms1-accounts-1',
        serviceHost: '10.0.0.11',
        servicePort: 3001,
        traefikPathPrefixes: ['/api/auth'],
        retryInitialMs: 1000,
        retryMaxMs: 30000,
      });

      const delay0 = registry.calculateBackoffDelay(0);
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1500);

      const delay1 = registry.calculateBackoffDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2500);

      const delay2 = registry.calculateBackoffDelay(2);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4500);

      const delay10 = registry.calculateBackoffDelay(10);
      expect(delay10).toBeGreaterThanOrEqual(30000);
      expect(delay10).toBeLessThanOrEqual(30500);
    });
  });

  describe('Enregistrement avec Réessais & Exposition registered', () => {
    it('doit exposer registered=false avant enregistrement et registered=true après succès', async () => {
      mockedAxios.put.mockResolvedValueOnce({ status: 200 });

      const registry = new ConsulRegistry({
        consulUrl: 'http://localhost:8500',
        serviceName: 'ms1-accounts',
        serviceId: 'ms1-accounts-1',
        serviceHost: '10.0.0.11',
        servicePort: 3001,
        traefikPathPrefixes: ['/api/auth', '/api/users', '/api/shops'],
      });

      expect(registry.registered).toBe(false);

      await registry.register();

      expect(registry.registered).toBe(true);
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'http://localhost:8500/v1/agent/service/register',
        expect.objectContaining({
          ID: expect.stringContaining('ms1-accounts'),
          Name: 'ms1-accounts',
          Tags: expect.arrayContaining([
            'traefik.enable=true',
            expect.stringContaining('traefik.http.routers.ms1-accounts.rule'),
          ]),
        })
      );

      // Désenregistrement
      mockedAxios.put.mockResolvedValueOnce({ status: 200 });
      await registry.deregister();
      expect(registry.registered).toBe(false);
    });

    it('ne doit pas crasher le processus en cas d\'erreur de connexion Consul et positionner registered=false', async () => {
      mockedAxios.put.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const registry = new ConsulRegistry({
        consulUrl: 'http://localhost:8500',
        serviceName: 'ms1-accounts',
        serviceId: 'ms1-accounts-1',
        serviceHost: '10.0.0.11',
        servicePort: 3001,
        traefikPathPrefixes: ['/api/auth'],
        retryInitialMs: 50,
      });

      // register() ne doit pas lancer d'exception non gérée
      await expect(registry.register()).resolves.toBeUndefined();
      expect(registry.registered).toBe(false);

      await registry.deregister();
    });
  });
});
