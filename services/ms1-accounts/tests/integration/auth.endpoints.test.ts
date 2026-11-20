import request from 'supertest';
import { app } from '../../src/app';
import { jwtService } from '../../src/services/jwt.service';

describe('Integration - Auth & Security Endpoints', () => {
  describe('GET /api/auth/public-key & /api/auth/jwks', () => {
    it('doit exposer la clé publique RS256 aux microservices pairs (HTTP 200)', async () => {
      const response = await request(app).get('/api/auth/public-key');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('algorithm', 'RS256');
      expect(response.body).toHaveProperty('issuer', 'forsa-ms1-accounts');
      expect(response.body).toHaveProperty('publicKey');
      expect(response.body.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('la route alias /api/auth/jwks doit renvoyer les mêmes informations', async () => {
      const response = await request(app).get('/api/auth/jwks');

      expect(response.status).toBe(200);
      expect(response.body.algorithm).toBe('RS256');
      expect(response.body.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    });
  });

  describe('Validation des entrées & Codes HTTP (400 Bad Request)', () => {
    it('doit renvoyer HTTP 400 si le body de login est vide', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toBeDefined();
    });

    it('doit renvoyer HTTP 400 si le format email est invalide lors du register', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email-address',
          password: 'Password123!',
          fullName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toContain('Format email invalide');
    });

    it('doit renvoyer HTTP 400 si le mot de passe fait moins de 8 caractères lors du register', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@forsa.dz',
          password: 'short',
          fullName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toContain('au moins 8 caractères');
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

    it('doit renvoyer HTTP 403 si un CLIENT tente d accéder à une route réservée aux COMMERÇANTS (POST /api/shops)', async () => {
      // Génération d'un token valide pour un CLIENT
      const clientToken = jwtService.generateAccessToken({
        sub: 'usr_test_client_id_403',
        email: 'client.forbidden@forsa.dz',
        role: 'CUSTOMER',
        fullName: 'Client Interdit',
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/shops')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'Boutique Frauduleuse',
          address: 'Alger Centre',
          latitude: 36.75,
          longitude: 3.05,
          phone: '0550123456',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('MERCHANT');
    });
  });
});
