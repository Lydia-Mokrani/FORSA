/**
 * Masque un numéro de téléphone pour les logs sécurisés :
 * Préserve les 4 premiers caractères (+213) et les 2 derniers chiffres,
 * et remplace la partie intermédiaire par des astérisques.
 * Exemple : "+213555123456" -> "+213*******56"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') {
    return '[MASQUÉ]';
  }

  const clean = phone.trim();
  if (clean.length <= 6) {
    return '***' + clean.slice(-2);
  }

  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-2);
  const maskedCount = Math.max(3, clean.length - 6);
  return `${prefix}${'*'.repeat(maskedCount)}${suffix}`;
}
