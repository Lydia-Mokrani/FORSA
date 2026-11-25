/**
 * Valide si une chaîne est un numéro mobile algérien E.164 valide (+213 5/6/7 xx xx xx)
 */
export function isValidE164Algerian(phone: string): boolean {
  return /^\+213[567]\d{8}$/.test(phone);
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
