import { z } from 'zod';

// Définitions des schémas Zod utilisés dans MS1
const registerSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  fullName: z.string().min(2, 'Le nom complet est requis'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'MERCHANT']).default('CUSTOMER'),
});

const loginSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token invalide'),
});

const verifyPhoneSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres'),
});

const createShopSchema = z.object({
  name: z.string().min(2, 'Le nom du commerce est requis'),
  description: z.string().optional(),
  address: z.string().min(5, 'L adresse est requise'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().min(8, 'Le téléphone de contact est requis'),
  openingHours: z.record(z.any()).optional(),
  logoUrl: z.string().url().optional(),
});

describe('Validation Schemas (Zod) - Unit Tests', () => {
  describe('registerSchema', () => {
    it('doit accepter une inscription Client valide', () => {
      const validClient = {
        email: 'karim.client@gmail.com',
        password: 'Password123!',
        fullName: 'Karim Bouzid',
      };
      const result = registerSchema.safeParse(validClient);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('CUSTOMER'); // Default value
      }
    });

    it('doit accepter une inscription Commerçant valide', () => {
      const validMerchant = {
        email: 'boulangerie.forsa@alger.dz',
        password: 'SuperSecretPassword2026',
        fullName: 'Omar El Mokrani',
        phone: '+213550123456',
        role: 'MERCHANT',
      };
      const result = registerSchema.safeParse(validMerchant);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('MERCHANT');
      }
    });

    it('doit rejeter une adresse email mal formatée', () => {
      const invalidEmail = {
        email: 'not-an-email',
        password: 'Password123!',
        fullName: 'Karim Bouzid',
      };
      const result = registerSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErr = result.error.errors.find((e) => e.path.includes('email'));
        expect(emailErr?.message).toBe('Format email invalide');
      }
    });

    it('doit rejeter un mot de passe trop court (< 8 caractères)', () => {
      const shortPassword = {
        email: 'karim@gmail.com',
        password: 'pass',
        fullName: 'Karim Bouzid',
      };
      const result = registerSchema.safeParse(shortPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passErr = result.error.errors.find((e) => e.path.includes('password'));
        expect(passErr?.message).toBe('Le mot de passe doit contenir au moins 8 caractères');
      }
    });

    it('doit rejeter un nom complet trop court (< 2 caractères)', () => {
      const shortName = {
        email: 'karim@gmail.com',
        password: 'Password123!',
        fullName: 'A',
      };
      const result = registerSchema.safeParse(shortName);
      expect(result.success).toBe(false);
    });

    it('doit rejeter un rôle inconnu (ex: ADMIN en auto-inscription)', () => {
      const invalidRole = {
        email: 'hacker@test.dz',
        password: 'Password123!',
        fullName: 'Hacker',
        role: 'ADMIN',
      };
      const result = registerSchema.safeParse(invalidRole);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('doit valider des identifiants corrects', () => {
      const result = loginSchema.safeParse({
        email: 'user@forsa.dz',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('doit rejeter si le mot de passe est vide', () => {
      const result = loginSchema.safeParse({
        email: 'user@forsa.dz',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('doit rejeter un email invalide', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    it('doit accepter un token de plus de 10 caractères', () => {
      const result = refreshSchema.safeParse({
        refreshToken: 'a'.repeat(80),
      });
      expect(result.success).toBe(true);
    });

    it('doit rejeter un token trop court ou manquant', () => {
      const result = refreshSchema.safeParse({
        refreshToken: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyPhoneSchema (OTP 6 chiffres)', () => {
    it('doit accepter un code SMS exactement à 6 chiffres', () => {
      const result = verifyPhoneSchema.safeParse({ code: '123456' });
      expect(result.success).toBe(true);
    });

    it('doit rejeter un code à 5 chiffres', () => {
      const result = verifyPhoneSchema.safeParse({ code: '12345' });
      expect(result.success).toBe(false);
    });

    it('doit rejeter un code à 7 chiffres', () => {
      const result = verifyPhoneSchema.safeParse({ code: '1234567' });
      expect(result.success).toBe(false);
    });
  });

  describe('createShopSchema', () => {
    const validShop = {
      name: 'Superette El Amel',
      description: 'Produits frais et épicerie locale anti-gaspi',
      address: '14 Rue Didouche Mourad, Alger Centre',
      latitude: 36.7538,
      longitude: 3.0588,
      phone: '021634567',
      logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
    };

    it('doit accepter une boutique avec coordonnées GPS valides', () => {
      const result = createShopSchema.safeParse(validShop);
      expect(result.success).toBe(true);
    });

    it('doit rejeter une latitude invalide (> 90 ou < -90)', () => {
      const result = createShopSchema.safeParse({
        ...validShop,
        latitude: 95.5,
      });
      expect(result.success).toBe(false);
    });

    it('doit rejeter une longitude invalide (> 180 ou < -180)', () => {
      const result = createShopSchema.safeParse({
        ...validShop,
        longitude: 185.0,
      });
      expect(result.success).toBe(false);
    });

    it('doit rejeter une adresse trop courte (< 5 caractères)', () => {
      const result = createShopSchema.safeParse({
        ...validShop,
        address: 'Rue',
      });
      expect(result.success).toBe(false);
    });

    it('doit rejeter un nom de boutique trop court', () => {
      const result = createShopSchema.safeParse({
        ...validShop,
        name: 'A',
      });
      expect(result.success).toBe(false);
    });
  });
});
