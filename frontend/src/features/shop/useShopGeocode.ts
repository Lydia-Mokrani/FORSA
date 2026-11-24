import { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '../auth/services/authService';

export type GeoStatus = 'idle' | 'searching' | 'found' | 'notFound' | 'unavailable';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeLookupResult {
  status: 'found' | 'notFound' | 'unavailable';
  coordinates: Coordinates | null;
  displayName?: string | null;
}

export interface UseShopGeocodeOptions {
  initialAddress?: string;
  initialCoordinates?: Coordinates | null;
}

/**
 * Hook de géocodage temps réel pour la boutique FORSA.
 * Conforme aux spécifications Lot 6A-verify :
 * - Aucun debounce à la saisie (typing).
 * - Déclencheurs stricts :
 *    1. onBlur du champ adresse si le texte a changé depuis le dernier lookup
 *    2. Touche 'Entrée' dans le champ adresse
 *    3. Bouton 'Réessayer'
 *    4. Chargement initial si l'adresse est renseignée sans coordonnées stockées
 * - Protection par AbortController et annulation au démontage
 * - Rejet strict des réponses obsolètes (stale-response protection)
 * - Retour à l'état 'idle' dès que le texte est modifié après une recherche
 */
export function useShopGeocode({
  initialAddress = '',
  initialCoordinates = null,
}: UseShopGeocodeOptions = {}) {
  const [address, setAddressState] = useState(initialAddress);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(() => {
    if (initialCoordinates && initialAddress.trim().length >= 5) {
      return 'found';
    }
    return 'idle';
  });
  const [coordinates, setCoordinates] = useState<Coordinates | null>(initialCoordinates);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Références d'annulation et de concurrence
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastLookupAddressRef = useRef<string>(
    initialCoordinates && initialAddress.trim().length >= 5 ? initialAddress.trim() : ''
  );
  const requestCounterRef = useRef<number>(0);

  /**
   * Exécute la requête vers GET /api/shops/geocode?q=...
   * Annule la requête précédente et ignore toute réponse désynchronisée.
   */
  const executeLookup = useCallback(async (query: string): Promise<GeocodeLookupResult> => {
    const trimmed = query.trim();

    if (trimmed.length < 5) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setCoordinates(null);
      setDisplayName(null);
      setGeoStatus('idle');
      lastLookupAddressRef.current = '';
      return { status: 'notFound', coordinates: null };
    }

    // Annuler la requête en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentRequestId = ++requestCounterRef.current;
    lastLookupAddressRef.current = trimmed;

    setGeoStatus('searching');

    try {
      const encodedQuery = encodeURIComponent(trimmed);
      const res = await authFetch(`/api/shops/geocode?q=${encodedQuery}`, {
        method: 'GET',
        signal: abortController.signal,
      });

      // Ignorer si une nouvelle requête a été lancée entre temps
      if (currentRequestId !== requestCounterRef.current) {
        return { status: 'unavailable', coordinates: null };
      }

      if (res.status === 200) {
        const data = await res.json();
        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          const coords: Coordinates = {
            latitude: data.lat,
            longitude: data.lng,
          };
          setCoordinates(coords);
          setDisplayName(data.displayName || null);
          setGeoStatus('found');
          return { status: 'found', coordinates: coords, displayName: data.displayName };
        } else {
          setCoordinates(null);
          setDisplayName(null);
          setGeoStatus('notFound');
          return { status: 'notFound', coordinates: null };
        }
      } else if (res.status === 404) {
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('notFound');
        return { status: 'notFound', coordinates: null };
      } else {
        // 503, 429 ou toute autre erreur serveur
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('unavailable');
        return { status: 'unavailable', coordinates: null };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { status: 'unavailable', coordinates: null };
      }
      if (currentRequestId === requestCounterRef.current) {
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('unavailable');
      }
      return { status: 'unavailable', coordinates: null };
    } finally {
      if (currentRequestId === requestCounterRef.current) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  /**
   * Mise à jour de l'adresse à la saisie (SANS aucun debounce / appel réseau)
   * Si le texte change après une recherche précédente, retour immédiat au statut 'idle'.
   */
  const handleAddressChange = useCallback(
    (newAddress: string) => {
      setAddressState(newAddress);
      const trimmed = newAddress.trim();

      if (trimmed !== lastLookupAddressRef.current) {
        // L'adresse a été éditée : statut non confirmé (idle)
        setGeoStatus('idle');
        setCoordinates(null);
        setDisplayName(null);
      }
    },
    []
  );

  /**
   * Déclencheur onBlur : recherche si l'adresse a changé depuis le dernier lookup
   */
  const handleBlur = useCallback(() => {
    const trimmed = address.trim();
    if (trimmed.length >= 5 && trimmed !== lastLookupAddressRef.current) {
      executeLookup(trimmed);
    }
  }, [address, executeLookup]);

  /**
   * Déclencheur onKeyDown : recherche sur touche 'Entrée'
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = address.trim();
        if (trimmed.length >= 5 && trimmed !== lastLookupAddressRef.current) {
          executeLookup(trimmed);
        }
      }
    },
    [address, executeLookup]
  );

  /**
   * Déclencheur Réessayer (carte dégradée)
   */
  const retry = useCallback(() => {
    const trimmed = address.trim();
    if (trimmed.length >= 5) {
      executeLookup(trimmed);
    }
  }, [address, executeLookup]);

  /**
   * Initialisation au montage depuis GET /api/shops/me
   */
  const setInitialLocation = useCallback(
    (addr: string, coords: Coordinates | null) => {
      const trimmed = addr.trim();
      setAddressState(addr);

      if (coords && trimmed.length >= 5) {
        setCoordinates(coords);
        setGeoStatus('found');
        lastLookupAddressRef.current = trimmed;
      } else if (!coords && trimmed.length >= 5) {
        // Adresse existante sans coordonnées : déclencher le géocodage au montage
        lastLookupAddressRef.current = '';
        executeLookup(trimmed);
      } else {
        setCoordinates(null);
        setGeoStatus('idle');
        lastLookupAddressRef.current = '';
      }
    },
    [executeLookup]
  );

  // Annulation automatique au démontage
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    address,
    setAddress: handleAddressChange,
    geoStatus,
    coordinates,
    displayName,
    handleBlur,
    handleKeyDown,
    retry,
    executeLookup,
    setInitialLocation,
    lastLookupAddress: lastLookupAddressRef.current,
  };
}
