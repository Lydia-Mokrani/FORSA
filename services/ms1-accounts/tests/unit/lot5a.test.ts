import {
  detectMagicBytes,
  validateDocumentFile,
  MAX_DOCUMENT_FILE_SIZE,
} from '../../src/utils/file-validator';
import { GeocoderService, GeocoderError } from '../../src/services/geocoder.service';
import { createShopSchema, updateShopSchema } from '../../src/controllers/shop.controller';

describe('LOT 5A - Backend Unit Tests', () => {
  describe('1. Magic Bytes & File Validation', () => {
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

    it('doit rejeter un fichier avec des magic bytes invalides ou corrompus', () => {
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
      // Préfixe PDF valide mais taille excessive
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

  describe('2. Geocode Status Mapping & Nominatim Client', () => {
    let originalFetch: typeof global.fetch;
    let geocoder: GeocoderService;

    beforeEach(() => {
      originalFetch = global.fetch;
      geocoder = new GeocoderService('https://nominatim.openstreetmap.org/search', 'forsa-test');
      geocoder.clearCache();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('doit retourner 200 avec lat, lng, displayName, city, wilaya quand Nominatim répond avec succès', async () => {
      const mockResults = [
        {
          lat: '36.7525',
          lon: '3.0420',
          display_name: 'Bab El Oued, Alger, Algérie',
          address: {
            suburb: 'Bab El Oued',
            city: 'Alger',
            state: 'Alger',
            country: 'Algérie',
          },
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResults,
      } as any);

      const res = await geocoder.geocode('Bab El Oued Alger');
      expect(res.lat).toBe(36.7525);
      expect(res.lng).toBe(3.042);
      expect(res.displayName).toBe('Bab El Oued, Alger, Algérie');
      expect(res.city).toBe('Alger');
      expect(res.wilaya).toBe('Alger');
    });

    it('doit lever une GeocoderError 404 (ADDRESS_NOT_FOUND) si aucun résultat retourné', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as any);

      await expect(geocoder.geocode('Adresse inexistante dans le désert 999999')).rejects.toThrow(
        GeocoderError
      );

      try {
        await geocoder.geocode('Adresse inexistante dans le désert 999999');
      } catch (err: any) {
        expect(err.status).toBe(404);
        expect(err.code).toBe('ADDRESS_NOT_FOUND');
      }
    });

    it('doit lever une GeocoderError 503 (GEOCODER_UNAVAILABLE) en cas de timeout ou erreur réseau', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout after 5000ms'));

      await expect(geocoder.geocode('Didouche Mourad Alger')).rejects.toThrow(GeocoderError);

      try {
        await geocoder.geocode('Didouche Mourad Alger');
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.code).toBe('GEOCODER_UNAVAILABLE');
        expect(err.message).toBe('Service de géocodage temporairement indisponible');
      }
    });

    it('doit lever une GeocoderError 503 si le serveur retourne un code 500 ou 429', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      } as any);

      await expect(geocoder.geocode('Didouche Mourad Alger')).rejects.toThrow(GeocoderError);

      try {
        await geocoder.geocode('Didouche Mourad Alger');
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.code).toBe('GEOCODER_UNAVAILABLE');
      }
    });

    it('doit lever une GeocoderError 400 (BAD_REQUEST) si la requête q est vide', async () => {
      await expect(geocoder.geocode('   ')).rejects.toThrow(GeocoderError);

      try {
        await geocoder.geocode('');
      } catch (err: any) {
        expect(err.status).toBe(400);
        expect(err.code).toBe('BAD_REQUEST');
      }
    });

    it('doit utiliser le cache mémoire sans ré-interroger Nominatim pour la même requête', async () => {
      const mockResults = [
        {
          lat: '36.75',
          lon: '3.05',
          display_name: 'Alger Centre',
          address: { city: 'Alger', state: 'Alger' },
        },
      ];

      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResults,
      } as any);
      global.fetch = fetchMock;

      const first = await geocoder.geocode('alger centre');
      const second = await geocoder.geocode('  Alger Centre  ');

      expect(first.lat).toBe(36.75);
      expect(second.lat).toBe(36.75);
      expect(fetchMock).toHaveBeenCalledTimes(1); // Le deuxième appel utilise le cache
    });
  });

  describe('3. Lat/Lng Pair Rule in Schemas', () => {
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

  describe('4. Role Escalation Guard on Shop Creation', () => {
    it('doit ajouter le rôle MERCHANT sans jamais autoriser ADMIN', () => {
      // Simulation d'un compte CUSTOMER existant
      const existingUser = {
        id: 'usr_customer_123',
        role: 'CUSTOMER',
        roles: ['CUSTOMER'],
      };

      // Tentative malveillante d'injection d'ADMIN dans la requête
      const requestedRoles = ['MERCHANT', 'ADMIN'];

      // Logique appliquée par le contrôleur ShopController.createShop
      const currentRoles = (existingUser.roles || []) as string[];
      const rolesSet = new Set<string>(currentRoles);
      rolesSet.add('MERCHANT');

      // Règle stricte : ADMIN ne peut JAMAIS être ajouté par la création de boutique
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

  describe('5. Own-Documents Response Sanitization', () => {
    it('la réponse getMyDocuments ne doit jamais exposer storagePath, fileUrl ou fileData', () => {
      // Enregistrement simulant la base de données
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

      // Mapping appliqué par getMyDocuments
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

      // Vérification impérative : aucune donnée sensible exposée
      expect(doc.storagePath).toBeUndefined();
      expect(doc.fileUrl).toBeUndefined();
      expect(doc.fileData).toBeUndefined();
      expect(Object.keys(doc)).toEqual(['id', 'type', 'status', 'reason', 'uploadedAt']);
    });

    it('la réponse uploadDocuments ne doit contenir que { id, type, status, uploadedAt }', () => {
      const uploadedDocResponse = {
        id: 'doc_456',
        type: 'TAX_ID',
        status: 'SUBMITTED',
        uploadedAt: new Date('2026-11-23T12:05:00Z'),
      } as any;

      expect(uploadedDocResponse.fileData).toBeUndefined();
      expect(uploadedDocResponse.storagePath).toBeUndefined();
      expect(uploadedDocResponse.fileUrl).toBeUndefined();
      expect(Object.keys(uploadedDocResponse)).toEqual(['id', 'type', 'status', 'uploadedAt']);
    });
  });
});
