/**
 * Liste unique et partagée des catégories de commerces FORSA.
 * Utilisée lors de l'inscription commerçant (RegisterPage) et de la gestion boutique (ShopEditPage).
 */
export const SHOP_CATEGORIES = [
  'Boulangerie & Pâtisserie',
  'Superette & Épicerie',
  'Primeur & Fruits / Légumes',
  'Boucherie & Traiteur',
  'Poissonnerie',
  'Pâtisserie & Salon de thé',
  'Restauration rapide',
  'Autre commerce alimentaire',
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];
