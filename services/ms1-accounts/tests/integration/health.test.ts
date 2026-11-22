import request from 'supertest';
import { app } from '../../src/app';

describe('Integration - Health & Discovery Endpoints', () => {
  describe('GET /health', () => {
    it('doit retourner le statut UP pour Consul et Traefik (HTTP 200)', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'UP');
      expect(response.body).toHaveProperty('service', 'ms1-accounts');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
    });
  });
});
