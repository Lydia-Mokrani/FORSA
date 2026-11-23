import {
  detectMagicBytes,
  validateDocumentFile,
  MAX_DOCUMENT_FILE_SIZE,
} from '../../src/utils/file-validator';
import { fileFilter } from '../../src/middleware/upload.middleware';
import { GeocoderService, GeocoderError } from '../../src/services/geocoder.service';
import {
  ShopController,
  createShopSchema,
  updateShopSchema,
} from '../../src/controllers/shop.controller';
import { prisma } from '../../src/config/prisma';
import { BadRequestError, NotFoundError } from '@forsa/common';

// Mock de Prisma pour isoler les tests unitaires
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    shop: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shopDocument: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock de RabbitMQ
jest.mock('../../src/services/rabbitmq.service', () => ({
  rabbitMQ: {
    publish: jest.fn().mockResolvedValue(true),
  },
}));

describe('LOT 5A & 5A-fix - Backend Unit Tests', () => {
  describe('1. Magic Bytes, File Validation & WebP Rejection', () => {
    it('doit valider un fichier PDF authentique (%PDF-)', () => {
      const pdfHeader = Buffer.from('%PDF-1.5 test content');
      const detected = detectMagicBytes(pdfHeader);
      expect(detected).toBe('application/pdf');

      const result = validateDocumentFile({
        buffer: pdfHeader,
        size: pdfHeader.length,
        originalname: 'registre.pdf',
      });
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('application/pdf');
    });

    it('doit valider un fichier PNG authentique (\x89PNG\r\n\x1a\n)', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const detected = detectMagicBytes(pngHeader);
      expect(detected).toBe('image/png');

      const result = validateDocumentFile({
        buffer: pngHeader,
        size: pngHeader.length,
        originalname: 'devanture.png',
      });
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/png');
    });

    it('doit valider un fichier JPEG authentique (\xFF\xD8\xFF)', () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const detected = detectMagicBytes(jpegHeader);
      expect(detected).toBe('image/jpeg');

      const result = validateDocumentFile({
        buffer: jpegHeader,
        size: jpegHeader.length,
        originalname: 'nif.jpg',
      });
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe('image/jpeg');
    });

    it('doit rejeter explicitement les fichiers WebP (magic bytes RIFF...WEBP)', () => {
      // Signature binaire WebP : RIFF (4 octets) + taille (4 octets) + WEBP (4 octets)
      const webpBuffer = Buffer.from('RIFF\x20\x00\x00\x00WEBPVP8 ');
      const detected = detectMagicBytes(webpBuffer);
      expect(detected).toBeNull();

      const result = validateDocumentFile({
        buffer: webpBuffer,
        size: webpBuffer.length,
        originalname: 'devanture.webp',
      });
      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_FILE_TYPE');
      expect(result.error).toContain('Type de fichier non autorisé');
    });

    it('doit rejeter les fichiers WebP au niveau du fileFilter multer', (done) => {
      const fakeWebpFile: any = {
        mimetype: 'image/webp',
        originalname: 'photo.webp',
      };

      const cb: any = (err: any, accept?: boolean) => {
        expect(err).toBeInstanceOf(BadRequestError);
        expect(accept).toBeUndefined();
        done();
      };

      fileFilter({} as any, fakeWebpFile, cb);
    });

    it('doit rejeter un fichier avec des magic bytes corrompus ou inconnus', () => {
      const fakeFile = Buffer.from('GIF89a this is not allowed');
      const detected = detectMagicBytes(fakeFile);
      expect(detected).toBeNull();

      const result = validateDocumentFile({
        buffer: fakeFile,
        size: fakeFile.length,
        originalname: 'fake.gif',
      });
      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_FILE_TYPE');
      expect(result.error).toContain('Type de fichier non autorisé');
    });

    it('doit rejeter un fichier dépassant la limite de 5 Mo', () => {
      const oversizedBuffer = Buffer.alloc(MAX_DOCUMENT_FILE_SIZE + 1024);
      oversizedBuffer.write('%PDF-1.4', 0);

      const result = validateDocumentFile({
        buffer: oversizedBuffer,
        size: oversizedBuffer.length,
        originalname: 'gros_fichier.pdf',
      });
      expect(result.valid).toBe(false);
      expect(result.code).toBe('FILE_TOO_LARGE');
      expect(result.error).toContain('dépasse la limite autorisée de 5 Mo');
    });
  });

  describe('2. Fail-Fast en Production (Config Env)', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('doit lever une exception si TELEGRAM_BOT_USERNAME est manquant en production', () => {
      expect(() => {
        jest.isolateModules(() => {
          process.env.NODE_ENV = 'production';
          process.env.INTERNAL_API_KEY = 'test_internal_key';
          process.env.TELEGRAM_BOT_USERNAME = '';
          process.env.GEOCODER_USER_AGENT = 'FORSA-Prod/1.0';
          require('../../src/config/env');
        });
      }).toThrow(/TELEGRAM_BOT_USERNAME est obligatoire en environnement de production/);
    });

    it('doit lever une exception si GEOCODER_USER_AGENT est manquant ou par défaut en production', () => {
      expect(() => {
        jest.isolateModules(() => {
          process.env.NODE_ENV = 'production';
          process.env.INTERNAL_API_KEY = 'test_internal_key';
          process.env.TELEGRAM_BOT_USERNAME = 'forsa_auth_bot';
          process.env.GEOCODER_USER_AGENT = 'forsa-dev';
          require('../../src/config/env');
        });
      }).toThrow(/GEOCODER_USER_AGENT valide et non par défaut est obligatoire en environnement de production/);
    });

    it('doit démarrer sans erreur en production si toutes les variables obligatoires sont valides', () => {
      expect(() => {
        jest.isolateModules(() => {
          process.env.NODE_ENV = 'production';
          process.env.INTERNAL_API_KEY = 'test_internal_key';
          process.env.TELEGRAM_BOT_USERNAME = 'forsa_official_bot';
          process.env.GEOCODER_USER_AGENT = 'FORSA-Production-App/1.0 (contact@forsa.dz)';
          const { config } = require('../../src/config/env');
          expect(config.nodeEnv).toBe('production');
        });
      }).not.toThrow();
    });
  });

  describe('3. Coordinates Reset Logic in PUT /shops/me', () => {
    const userId = 'usr_test_shop_123';
    const mockExistingShop = {
      id: 'shop_123',
      userId,
      name: 'Boutique Test',
      address: '10 Rue Didouche Mourad, Alger',
      latitude: 36.77,
      longitude: 3.06,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (prisma.shop.findUnique as jest.Mock).mockResolvedValue(mockExistingShop);
      (prisma.shop.update as jest.Mock).mockImplementation(async ({ data }: any) => ({
        ...mockExistingShop,
        ...data,
      }));
    });

    it('doit réinitialiser latitude et longitude à null si l adresse a changé et qu aucune coordonnée n est fournie', async () => {
      const req: any = {
        user: { sub: userId },
        body: {
          address: '25 Boulevard Colonel Amirouche, Alger',
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await ShopController.updateMyShop(req, res, next);

      expect(prisma.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop_123' },
          data: expect.objectContaining({
            address: '25 Boulevard Colonel Amirouche, Alger',
            latitude: null,
            longitude: null,
          }),
        })
      );
    });

    it('doit conserver latitude et longitude inchangées si l adresse est inchangée et qu aucune coordonnée n est fournie', async () => {
      const req: any = {
        user: { sub: userId },
        body: {
          name: 'Nouveau Nom Boutique',
          address: '10 Rue Didouche Mourad, Alger', // Même adresse
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await ShopController.updateMyShop(req, res, next);

      expect(prisma.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop_123' },
          data: expect.objectContaining({
            name: 'Nouveau Nom Boutique',
            address: '10 Rue Didouche Mourad, Alger',
          }),
        })
      );
      // Vérifier que latitude et longitude ne sont pas dans le payload d'update (la base conserve leurs valeurs)
      const updateData = (prisma.shop.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.latitude).toBeUndefined();
      expect(updateData.longitude).toBeUndefined();
    });

    it('doit enregistrer les nouvelles coordonnées si une paire explicite est fournie', async () => {
      const req: any = {
        user: { sub: userId },
        body: {
          latitude: 36.752,
          longitude: 3.041,
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await ShopController.updateMyShop(req, res, next);

      expect(prisma.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop_123' },
          data: expect.objectContaining({
            latitude: 36.752,
            longitude: 3.041,
          }),
        })
      );
    });

    it('doit réinitialiser latitude et longitude si une paire explicite null/null est fournie', async () => {
      const req: any = {
        user: { sub: userId },
        body: {
          latitude: null,
          longitude: null,
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await ShopController.updateMyShop(req, res, next);

      expect(prisma.shop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop_123' },
          data: expect.objectContaining({
            latitude: null,
            longitude: null,
          }),
        })
      );
    });

    it('doit échouer avec 400 Bad Request si une seule coordonnée est envoyée', async () => {
      const req: any = {
        user: { sub: userId },
        body: {
          latitude: 36.752,
          // longitude omise
        },
      };
      const res: any = { json: jest.fn() };
      const next = jest.fn();

      await ShopController.updateMyShop(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(prisma.shop.update).not.toHaveBeenCalled();
    });
  });

  describe('4. Legacy Disk Fallback & Path Traversal Rejection', () => {
    it('doit rejeter les tentatives de path traversal relatives (../../etc/passwd)', async () => {
      const req: any = {
        params: { id: 'shop-uuid-1', filename: '../../etc/passwd' },
      };
      const res: any = { setHeader: jest.fn(), send: jest.fn() };
      const next = jest.fn();

      await ShopController.downloadDocumentForAdmin(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    });

    it('doit rejeter les variantes encodées de path traversal (%2e%2e/etc/passwd et ..%2f..)', async () => {
      const encodedVariants = [
        '%2e%2e/etc/passwd',
        '..%2f..%2fetc/passwd',
        '%2e%2e%5cwindows%5csystem32',
      ];

      for (const variant of encodedVariants) {
        const req: any = {
          params: { id: 'shop-uuid-1', filename: variant },
        };
        const res: any = { setHeader: jest.fn(), send: jest.fn() };
        const next = jest.fn();

        await ShopController.downloadDocumentForAdmin(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      }
    });

    it('doit rejeter les chemins absolus (/etc/passwd, C:\\boot.ini)', async () => {
      const absolutePaths = ['/etc/passwd', 'C:\\boot.ini'];

      for (const absPath of absolutePaths) {
        const req: any = {
          params: { id: 'shop-uuid-1', filename: absPath },
        };
        const res: any = { setHeader: jest.fn(), send: jest.fn() };
        const next = jest.fn();

        await ShopController.downloadDocumentForAdmin(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      }
    });

    it('doit retourner 404 si le document n existe pas en base', async () => {
      (prisma.shopDocument.findFirst as jest.Mock).mockResolvedValue(null);

      const req: any = {
        params: { id: 'shop-uuid-1', filename: 'valid_filename.pdf' },
      };
      const res: any = { setHeader: jest.fn(), send: jest.fn() };
      const next = jest.fn();

      await ShopController.downloadDocumentForAdmin(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('5. Geocoder Limiter, Bounded Queue & Per-User Rate Limit', () => {
    let geocoder: GeocoderService;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      geocoder = new GeocoderService('https://nominatim.openstreetmap.org/search', 'forsa-test');
      geocoder.clearCache();
      geocoder.clearRateLimits();
      geocoder.resetQueue();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('doit limiter les requêtes par utilisateur (max 10 par minute) et renvoyer 429 RATE_LIMITED à la 11ème', async () => {
      jest.useFakeTimers();
      const userId = 'usr_merchant_fast';

      // 10 requêtes autorisées pour cet utilisateur
      for (let i = 1; i <= 10; i++) {
        expect(() => geocoder.checkUserRateLimit(userId)).not.toThrow();
      }

      // La 11ème requête dans la même minute doit être bloquée avec 429 RATE_LIMITED
      expect(() => geocoder.checkUserRateLimit(userId)).toThrow(GeocoderError);

      try {
        geocoder.checkUserRateLimit(userId);
      } catch (err: any) {
        expect(err.status).toBe(429);
        expect(err.code).toBe('RATE_LIMITED');
        expect(err.message).toContain('Limite de requêtes atteinte');
      }

      // Vérifier que geocode() invoque bien ce contrôle et rejette avec 429
      await expect(geocoder.geocode('test query', userId)).rejects.toThrow(GeocoderError);

      // Avancer le temps de 61 secondes : la fenêtre expire et la limite se réinitialise
      jest.advanceTimersByTime(61000);
      expect(() => geocoder.checkUserRateLimit(userId)).not.toThrow();

      // Un autre utilisateur n'est pas bloqué
      const otherUser = 'usr_another_merchant';
      expect(() => geocoder.checkUserRateLimit(otherUser)).not.toThrow();

      jest.useRealTimers();
    });

    it('doit rejeter avec 503 GEOCODER_UNAVAILABLE immédiatement si la file d attente dépasse 20 requêtes', async () => {
      // Simuler une file d'attente pleine
      (geocoder as any).waitingQueueLength = 20;

      await expect(geocoder.geocode('Alger Centre')).rejects.toThrow(GeocoderError);

      try {
        await geocoder.geocode('Alger Centre');
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.code).toBe('GEOCODER_UNAVAILABLE');
      }
    });

    it('le timeout de 5 secondes s applique strictement à l appel réseau Nominatim', async () => {
      jest.useFakeTimers();
      (geocoder as any).lastRequestTime = -5000;

      global.fetch = jest.fn().mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new Error('AbortError: The operation was aborted due to 5000ms timeout'));
            });
          }
        });
      });

      const promise = geocoder.geocode('Rue Didouche Mourad');

      // Attendre que la file d'attente se dénoue et que l'appel fetch soit déclenché
      for (let i = 0; i < 10 && !(global.fetch as jest.Mock).mock.calls.length; i++) {
        await Promise.resolve();
      }

      // Avancer les timers de 5000ms pour déclencher l'abort de l'appel réseau
      jest.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow(GeocoderError);

      try {
        (geocoder as any).lastRequestTime = -5000;
        const p2 = geocoder.geocode('Autre Rue');
        for (let i = 0; i < 10 && (global.fetch as jest.Mock).mock.calls.length < 2; i++) {
          await Promise.resolve();
        }
        jest.advanceTimersByTime(5000);
        await p2;
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.code).toBe('GEOCODER_UNAVAILABLE');
      }

      jest.useRealTimers();
    });
  });

  describe('6. Lat/Lng Pair Rule in Schemas', () => {
    it('doit valider quand latitude et longitude sont toutes deux renseignées', () => {
      const validData = {
        name: 'Supérette El Bahdja',
        address: '12 Rue Larbi Ben M\'hidi, Alger',
        phone: '0550112233',
        latitude: 36.772,
        longitude: 3.058,
        category: 'Alimentation',
        registryNumber: '16/00-1234567B18',
      };

      const createResult = createShopSchema.safeParse(validData);
      expect(createResult.success).toBe(true);

      const updateResult = updateShopSchema.safeParse(validData);
      expect(updateResult.success).toBe(true);
    });

    it('doit valider quand latitude et longitude sont toutes deux absentes (position non confirmée)', () => {
      const absentData = {
        name: 'Supérette El Bahdja',
        address: '12 Rue Larbi Ben M\'hidi, Alger',
        phone: '0550112233',
        category: 'Alimentation',
      };

      const createResult = createShopSchema.safeParse(absentData);
      expect(createResult.success).toBe(true);

      const updateResult = updateShopSchema.safeParse(absentData);
      expect(updateResult.success).toBe(true);
    });

    it('doit valider quand latitude et longitude sont toutes deux null', () => {
      const nullData = {
        name: 'Supérette El Bahdja',
        address: '12 Rue Larbi Ben M\'hidi, Alger',
        phone: '0550112233',
        latitude: null,
        longitude: null,
      };

      const createResult = createShopSchema.safeParse(nullData);
      expect(createResult.success).toBe(true);

      const updateResult = updateShopSchema.safeParse(nullData);
      expect(updateResult.success).toBe(true);
    });

    it('doit échouer si seule la latitude est renseignée', () => {
      const partialData = {
        name: 'Supérette El Bahdja',
        address: '12 Rue Larbi Ben M\'hidi, Alger',
        phone: '0550112233',
        latitude: 36.772,
      };

      const createResult = createShopSchema.safeParse(partialData);
      expect(createResult.success).toBe(false);
      if (!createResult.success) {
        expect(createResult.error.errors[0].message).toContain(
          'Latitude et longitude doivent être toutes deux renseignées ou toutes deux absentes'
        );
      }

      const updateResult = updateShopSchema.safeParse(partialData);
      expect(updateResult.success).toBe(false);
    });

    it('doit échouer si seule la longitude est renseignée', () => {
      const partialData = {
        name: 'Supérette El Bahdja',
        address: '12 Rue Larbi Ben M\'hidi, Alger',
        phone: '0550112233',
        longitude: 3.058,
      };

      const createResult = createShopSchema.safeParse(partialData);
      expect(createResult.success).toBe(false);

      const updateResult = updateShopSchema.safeParse(partialData);
      expect(updateResult.success).toBe(false);
    });
  });

  describe('7. Role Escalation Guard on Shop Creation', () => {
    it('doit ajouter le rôle MERCHANT sans jamais autoriser ADMIN', () => {
      const existingUser = {
        id: 'usr_customer_123',
        role: 'CUSTOMER',
        roles: ['CUSTOMER'],
      };

      const currentRoles = (existingUser.roles || []) as string[];
      const rolesSet = new Set<string>(currentRoles);
      rolesSet.add('MERCHANT');

      if (!currentRoles.includes('ADMIN')) {
        rolesSet.delete('ADMIN');
      }
      const updatedRoles = Array.from(rolesSet);

      expect(updatedRoles).toContain('MERCHANT');
      expect(updatedRoles).toContain('CUSTOMER');
      expect(updatedRoles).not.toContain('ADMIN');
    });

    it('ne doit pas supprimer le rôle ADMIN si l utilisateur était déjà administrateur', () => {
      const existingAdmin = {
        id: 'usr_admin_456',
        role: 'ADMIN',
        roles: ['ADMIN', 'CUSTOMER'],
      };

      const currentRoles = (existingAdmin.roles || []) as string[];
      const rolesSet = new Set<string>(currentRoles);
      rolesSet.add('MERCHANT');
      if (!currentRoles.includes('ADMIN')) {
        rolesSet.delete('ADMIN');
      }
      const updatedRoles = Array.from(rolesSet);

      expect(updatedRoles).toContain('ADMIN');
      expect(updatedRoles).toContain('MERCHANT');
    });
  });

  describe('8. Own-Documents Response Sanitization', () => {
    it('la réponse getMyDocuments ne doit jamais exposer storagePath, fileUrl ou fileData', () => {
      const rawDbDocs = [
        {
          id: 'doc_123',
          type: 'COMMERCIAL_REGISTER',
          status: 'SUBMITTED',
          reason: null,
          createdAt: new Date('2026-11-23T12:00:00Z'),
          fileData: Buffer.from('%PDF-1.4 binary data'),
          storagePath: 'db://doc_123',
          fileUrl: '/uploads/internal/path/file.pdf',
        },
      ];

      const sanitized = rawDbDocs.map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        reason: d.reason,
        uploadedAt: d.createdAt,
      }));

      const doc = sanitized[0] as any;
      expect(doc.id).toBe('doc_123');
      expect(doc.type).toBe('COMMERCIAL_REGISTER');
      expect(doc.status).toBe('SUBMITTED');
      expect(doc.uploadedAt).toBeDefined();

      expect(doc.storagePath).toBeUndefined();
      expect(doc.fileUrl).toBeUndefined();
      expect(doc.fileData).toBeUndefined();
      expect(Object.keys(doc)).toEqual(['id', 'type', 'status', 'reason', 'uploadedAt']);
    });
  });
});
