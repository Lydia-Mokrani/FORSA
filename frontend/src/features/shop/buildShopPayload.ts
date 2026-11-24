/**
 * Construction pure du payload de boutique pour POST / PUT /shops/me.
 *
 * RÈGLES :
 * 1. Coordonnées géographiques :
 *    - Si l'adresse a changé et que le géocodage a abouti ('found') : latitude et longitude envoyées sous forme de nombres.
 *    - Si l'adresse a changé mais géocodage non confirmé ('notFound', 'unavailable', 'idle', 'searching') : omission des clés (JAMAIS de null explicite).
 *    - Si l'adresse est inchangée et qu'il existait déjà des coordonnées stockées : omission des clés (le backend conserve les existantes).
 *    - Si l'adresse est inchangée mais aucune coordonnée stockée et géocodage 'found' : latitude et longitude envoyées.
 *    - Aucun null explicite n'est JAMAIS émis pour latitude ou longitude.
 *
 * 2. Champs optionnels texte (description, category, registryNumber) :
 *    - Renseigné (non vide) : chaîne nettoyée (.trim()).
 *    - Vide et aucune valeur précédemment enregistrée : clé OMISE (pas de null à la création).
 *    - Vide mais une valeur était précédemment enregistrée (effacement par l'utilisateur) : `null` explicite (autorisé par les schémas Zod backend).
 *
 * 3. Champ logoUrl :
 *    - URL valide (http/https) : chaîne nettoyée (.trim()).
 *    - Invalide : clé OMISE (pour ne pas enfreindre z.string().url()).
 *    - Vide et valeur enregistrée au préalable : `null` explicite.
 *    - Vide et aucune valeur au préalable : clé OMISE.
 *
 * 4. Horaires d'ouverture (openingHours) :
 *    - Si non modifiés par l'utilisateur : structure d'origine intégralement préservée.
 *    - Si modifiés : reconstruction préservant les clés existantes ou objet { open, close }.
 */

export interface ShopFormInput {
  name: string;
  category?: string | null;
  registryNumber?: string | null;
  phone: string;
  address: string;
  openTime?: string;
  closeTime?: string;
  description?: string | null;
  logoUrl?: string | null;
  originalHours?: any;
  hoursEdited?: boolean;
  openingHours?: any;
}

export interface SavedShopSnapshot {
  name?: string | null;
  category?: string | null;
  registryNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  openingHours?: any;
  hasStoredCoordinates?: boolean;
  coordinates?: { latitude: number; longitude: number } | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GeoPayloadState {
  status?: 'idle' | 'searching' | 'found' | 'notFound' | 'unavailable';
  coordinates?: { latitude: number; longitude: number } | null;
}

/**
 * Valide si une chaîne est une URL syntaxiquement conforme avec protocole http ou https.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Construit l'objet openingHours en préservant le format d'origine s'il n'a pas été modifié.
 */
export function buildOpeningHours(
  originalHours: any,
  openTime?: string,
  closeTime?: string,
  hoursEdited?: boolean
): any {
  if (!hoursEdited && originalHours !== undefined) {
    return originalHours;
  }
  const open = openTime || '08:00';
  const close = closeTime || '20:00';
  if (originalHours && typeof originalHours === 'object') {
    const updated: Record<string, any> = { ...originalHours };
    for (const key of Object.keys(updated)) {
      if (updated[key] && typeof updated[key] === 'object' && !updated[key].closed) {
        updated[key] = { ...updated[key], open, close };
      }
    }
    return updated;
  }
  return { open, close };
}

/**
 * Construit le payload pour la création (POST) ou mise à jour (PUT) d'une boutique.
 */
export function buildShopPayload(
  form: ShopFormInput,
  saved?: SavedShopSnapshot | null,
  geo?: GeoPayloadState | null
): Record<string, any> {
  const payload: Record<string, any> = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
  };

  // Horaires
  if (form.openingHours !== undefined && !form.hoursEdited) {
    payload.openingHours = form.openingHours;
  } else {
    const baseHours = form.originalHours !== undefined ? form.originalHours : saved?.openingHours;
    payload.openingHours = buildOpeningHours(
      baseHours,
      form.openTime,
      form.closeTime,
      Boolean(form.hoursEdited)
    );
  }

  // Champs optionnels texte : description, category, registryNumber
  const optionalTextFields: Array<'description' | 'category' | 'registryNumber'> = [
    'description',
    'category',
    'registryNumber',
  ];

  for (const field of optionalTextFields) {
    const formVal = form[field];
    const trimmed = typeof formVal === 'string' ? formVal.trim() : '';
    if (trimmed.length > 0) {
      payload[field] = trimmed;
    } else {
      // Le formulaire a un champ vide
      const savedVal = saved?.[field];
      const wasSaved = typeof savedVal === 'string' ? savedVal.trim().length > 0 : Boolean(savedVal);
      if (wasSaved) {
        // L'utilisateur a effacé une valeur existante
        payload[field] = null;
      }
      // Sinon (champ jamais renseigné) : omission de la clé
    }
  }

  // Champ optionnel logoUrl (validation d'URL stricte)
  const logoRaw = form.logoUrl;
  const trimmedLogo = typeof logoRaw === 'string' ? logoRaw.trim() : '';
  if (trimmedLogo.length > 0) {
    if (isValidUrl(trimmedLogo)) {
      payload.logoUrl = trimmedLogo;
    }
    // Si l'URL n'est pas valide : omission de la clé pour éviter le rejet par z.string().url()
  } else {
    const savedLogo = saved?.logoUrl;
    const wasSavedLogo = typeof savedLogo === 'string' ? savedLogo.trim().length > 0 : Boolean(savedLogo);
    if (wasSavedLogo) {
      payload.logoUrl = null;
    }
    // Sinon : omission de la clé
  }

  // Règles coordonnées géographiques
  const formAddress = form.address.trim();
  const savedAddress = (saved?.address ?? '').trim();
  const isAddressChanged = formAddress !== savedAddress;

  const hasStoredCoords = Boolean(
    saved?.hasStoredCoordinates ||
    saved?.coordinates != null ||
    (saved?.latitude != null && saved?.longitude != null)
  );

  const isGeoFound =
    geo?.status === 'found' &&
    geo?.coordinates != null &&
    typeof geo.coordinates.latitude === 'number' &&
    typeof geo.coordinates.longitude === 'number' &&
    !isNaN(geo.coordinates.latitude) &&
    !isNaN(geo.coordinates.longitude);

  if (isAddressChanged) {
    if (isGeoFound && geo?.coordinates) {
      payload.latitude = Number(geo.coordinates.latitude);
      payload.longitude = Number(geo.coordinates.longitude);
    }
    // Si non confirmé (idle, searching, notFound, unavailable) : omission complète
  } else {
    // Adresse inchangée
    if (!hasStoredCoords && isGeoFound && geo?.coordinates) {
      payload.latitude = Number(geo.coordinates.latitude);
      payload.longitude = Number(geo.coordinates.longitude);
    }
    // Si coordonnées stockées existantes : omission complète (le backend conserve)
  }

  return payload;
}
