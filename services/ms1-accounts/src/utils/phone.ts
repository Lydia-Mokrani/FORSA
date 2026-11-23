import { z } from 'zod';

/**
 * Numéros de démo autorisés pour tests en environnement hors-production
 */
export const DEMO_PHONE_NUMBERS = ['0697937637', '697937637', '+213697937637'];

export function isDemoPhone(phone?: string | null): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits === '0697937637' || digits === '697937637' || digits === '213697937637';
}

/**
 * Normalise tout numéro algérien valide vers le format international E.164 (+213XXXXXXXXX)
 * Accepte : 05/06/07XXXXXXXX, +2135/6/7XXXXXXXX, 002135/6/7XXXXXXXX, 2135/6/7XXXXXXXX, 5/6/7XXXXXXXX
 * Retourne null si le numéro ne peut pas être normalisé vers un mobile algérien valide.
 */
export function normalizeToE164(raw: string): string | null {
  if (!raw) return null;
  let clean = raw.replace(/[\s.\-()]/g, '');
  if (clean.startsWith('00213')) {
    clean = '+213' + clean.slice(5);
  } else if (clean.startsWith('213') && clean.length === 12) {
    clean = '+' + clean;
  } else if (clean.startsWith('+213')) {
    // Déjà préfixé +213
  } else if (/^0[567]\d{8}$/.test(clean)) {
    clean = '+213' + clean.slice(1);
  } else if (/^[567]\d{8}$/.test(clean)) {
    clean = '+213' + clean;
  }
  return isValidE164Algerian(clean) ? clean : null;
}

/**
 * Normalise un numéro algérien vers le format local 0XXXXXXXXX (10 chiffres)
 */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s.\-()]/g, '');
  if (p.startsWith('+213')) p = '0' + p.slice(4);
  else if (p.startsWith('00213')) p = '0' + p.slice(5);
  else if (p.startsWith('213') && p.length === 12) p = '0' + p.slice(3);
  else if (/^[567]\d{8}$/.test(p)) p = '0' + p;
  return p;
}

/**
 * Valide si une chaîne est un numéro mobile algérien E.164 valide (+213 5/6/7 xx xx xx)
 */
export function isValidE164Algerian(phone: string): boolean {
  return /^\+213[567]\d{8}$/.test(phone);
}

/**
 * Schéma Zod pour numéro de téléphone converti en E.164
 */
export const phoneE164Schema = z
  .string()
  .transform((val) => normalizeToE164(val) || '')
  .refine(isValidE164Algerian, {
    message: 'Numéro de mobile algérien invalide (ex: 05 50 12 34 56 ou +213 6 97 93 76 37)',
  });

export const mobilePhoneSchema = phoneE164Schema;
