import { describe, it, expect } from 'vitest';
import { mapGoogleAuthError, GENERIC_GOOGLE_ERROR } from './googleAuthError';

describe('Lot F-fix: mapGoogleAuthError', () => {
  describe('Mappage par code applicatif JSON (prioritaire)', () => {
    it('doit mapper ACCOUNT_NOT_FOUND vers "inscrivez-vous d\'abord" avec un lien vers l\'inscription', () => {
      const result = mapGoogleAuthError({
        code: 'ACCOUNT_NOT_FOUND',
        status: 404,
      });

      expect(result.message.toLowerCase()).toContain("inscrivez-vous d'abord");
      expect(result.code).toBe('ACCOUNT_NOT_FOUND');
      expect(result.link).toBeDefined();
      expect(result.link?.href).toBe('/register');
      expect(result.link?.text).toBe('Créer un compte');
    });

    it('doit respecter le registerPath personnalisé pour ACCOUNT_NOT_FOUND (ex: rôle commerçant)', () => {
      const result = mapGoogleAuthError(
        { code: 'ACCOUNT_NOT_FOUND', status: 404 },
        '/register?role=merchant'
      );

      expect(result.link?.href).toBe('/register?role=merchant');
    });

    it('doit mapper EMAIL_NOT_VERIFIED vers un message explicite concernant l\'e-mail', () => {
      const result = mapGoogleAuthError({
        code: 'EMAIL_NOT_VERIFIED',
        status: 403,
      });

      expect(result.message.toLowerCase()).toContain('e-mail');
      expect(result.message.toLowerCase()).toContain('vérifi');
      expect(result.code).toBe('EMAIL_NOT_VERIFIED');
      expect(result.link).toBeUndefined();
    });

    it('doit mapper INVALID_GOOGLE_TOKEN vers le message générique', () => {
      const result = mapGoogleAuthError({
        code: 'INVALID_GOOGLE_TOKEN',
        status: 400,
      });

      expect(result.message).toBe(GENERIC_GOOGLE_ERROR);
      expect(result.code).toBe('INVALID_GOOGLE_TOKEN');
    });

    it('doit mapper GOOGLE_NOT_CONFIGURED vers le message générique', () => {
      const result = mapGoogleAuthError({
        code: 'GOOGLE_NOT_CONFIGURED',
        status: 503,
      });

      expect(result.message).toBe(GENERIC_GOOGLE_ERROR);
      expect(result.code).toBe('GOOGLE_NOT_CONFIGURED');
    });
  });

  describe('Gestion des codes HTTP sans code applicatif', () => {
    it('doit mapper un 404 SANS code vers le message générique (route backend absente avant Lot G1)', () => {
      const result = mapGoogleAuthError({ status: 404 });
      expect(result.message).toBe(GENERIC_GOOGLE_ERROR);
      expect(result.message.toLowerCase()).not.toContain('inscri');
    });

    it('doit mapper les erreurs serveur 5xx (500, 502, 503) vers le message générique', () => {
      expect(mapGoogleAuthError({ status: 500 }).message).toBe(GENERIC_GOOGLE_ERROR);
      expect(mapGoogleAuthError({ status: 502 }).message).toBe(GENERIC_GOOGLE_ERROR);
      expect(mapGoogleAuthError({ status: 503 }).message).toBe(GENERIC_GOOGLE_ERROR);
      expect(mapGoogleAuthError({ status: 504 }).message).toBe(GENERIC_GOOGLE_ERROR);
    });
  });

  describe('Gestion des erreurs réseau et entrées inattendues', () => {
    it('doit mapper une erreur réseau (TypeError Failed to fetch) vers le message générique', () => {
      const networkError = new TypeError('Failed to fetch');
      const result = mapGoogleAuthError(networkError);
      expect(result.message).toBe(GENERIC_GOOGLE_ERROR);
    });

    it('doit mapper une exception générique Error vers le message générique', () => {
      const genericError = new Error('Network timeout');
      const result = mapGoogleAuthError(genericError);
      expect(result.message).toBe(GENERIC_GOOGLE_ERROR);
    });

    it('doit gérer sans planter null, undefined ou objet vide', () => {
      expect(mapGoogleAuthError(null).message).toBe(GENERIC_GOOGLE_ERROR);
      expect(mapGoogleAuthError(undefined).message).toBe(GENERIC_GOOGLE_ERROR);
      expect(mapGoogleAuthError({}).message).toBe(GENERIC_GOOGLE_ERROR);
    });
  });
});
