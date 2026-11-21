import { z } from 'zod';

/**
 * Normalise un numéro algérien vers le format 0XXXXXXXXX (10 chiffres)
 * Accepte : +213XXXXXXXXX, 00213XXXXXXXXX, 213XXXXXXXXX, 0XXXXXXXXX
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
 * Schéma Zod pour numéro mobile algérien (05/06/07)
 */
export const mobilePhoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((p) => /^0[567]\d{8}$/.test(p), {
    message: 'Numéro de mobile invalide (ex : 05 50 12 34 56)',
  });
