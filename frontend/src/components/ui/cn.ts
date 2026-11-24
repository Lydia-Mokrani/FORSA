/**
 * Utilitaire de concaténation conditionnelle de classes CSS.
 * Ne dépend d'aucune bibliothèque externe (Lot R0).
 */
export function cn(...inputs: (string | boolean | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ').trim();
}
