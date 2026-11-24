import request from 'supertest';
import { app } from '../../src/app';
import { jwtService } from '../../src/services/jwt.service';

describe('Integration - Auth & Security Endpoints', () => {
  describe('GET /api/auth/public-key & /api/auth/jwks', () => {
    it('doit exposer la clé publique RS256 aux microservices pairs (HTTP 200 PEM)', async () => {
      const response = await request(app).get('/api/auth/public-key');

      expect(response.status).toBe(200);
      expect(response.text).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('la route alias /api/auth/jwks doit renvoyer les clés au format JWKS RFC 7517', async () => {
      const response = await request(app).get('/api/auth/jwks');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.keys)).toBe(true);
      expect(response.body.keys.length).toBeGreaterThanOrEqual(1);
      const key = response.body.keys[0];
      expect(key.kty).toBe('RSA');
      expect(key.alg).toBe('RS256');
      expect(key.use).toBe('sig');
      expect(typeof key.n).toBe('string');
      expect(typeof key.e).toBe('string');
      expect(key.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    });
  });

  describe('Validation des entrées & Codes HTTP (400 Bad Request)', () => {
    it('doit renvoyer HTTP 400 si le body de /api/auth/telegram/start est vide', async () => {
      const response = await request(app)
        .post('/api/auth/telegram/start')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toBeDefined();
    });

    it('doit renvoyer HTTP 400 si le format du numéro de téléphone est invalide', async () => {
      const response = await request(app)
        .post('/api/auth/telegram/start')
        .send({ phone: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toContain('téléphone');
    });
  });

  describe('Middleware de sécurité & Authentification (HTTP 401 & 403)', () => {
    it('doit renvoyer HTTP 401 si le Bearer token est absent pour une route protégée (/api/users/me)', async () => {
      const response = await request(app).get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Token d\'authentification manquant');
    });

    it('doit renvoyer HTTP 401 si le token fourni est malformé ou corrompu', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer fake.invalid.jwt.token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Token d\'authentification invalide');
    });

    it('doit renvoyer HTTP 403 si un CLIENT tente d accéder à une route réservée aux ADMINS (GET /api/shops/:id/documents)', async () => {
      const clientToken = jwtService.generateAccessToken({
        sub: 'usr_test_client_id_403',
        email: 'client.forbidden@forsa.dz',
        roles: ['CUSTOMER'],
        role: 'CUSTOMER',
        mode: 'customer',
        fullName: 'Client Interdit',
        emailVerified: true,
      });

      const response = await request(app)
        .get('/api/shops/some-shop-id/documents')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('ADMIN');
    });
  });
});
