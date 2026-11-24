import { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '../auth/services/authService';

export type GeoStatus = 'idle' | 'searching' | 'found' | 'notFound' | 'unavailable';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName?: string;
  city?: string;
  wilaya?: string;
}

export interface UseShopGeocodeOptions {
  initialAddress?: string;
  initialCoordinates?: Coordinates | null;
  debounceMs?: number;
}

/**
 * Hook de géocodage temps réel pour la boutique FORSA.
 * Conforme au contrat backend Lot 5A :
 * - Endpoint : GET /api/shops/geocode?q=... (via authFetch)
 * - Statuts : idle | searching | found | notFound | unavailable
 * - Déclenchement : debounce 800ms si address >= 5 caractères, ou immédiat sur blur
 * - Annulation des requêtes précédentes via AbortController
 * - Ignore les réponses obsolètes
 */
export function useShopGeocode({
  initialAddress = '',
  initialCoordinates = null,
  debounceMs = 800,
}: UseShopGeocodeOptions = {}) {
  const [address, setAddress] = useState(initialAddress);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(() => {
    if (initialCoordinates && initialAddress.trim().length >= 5) {
      return 'found';
    }
    return 'idle';
  });
  const [coordinates, setCoordinates] = useState<Coordinates | null>(initialCoordinates);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Références pour la gestion des requêtes et de la concurrence
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueriedAddressRef = useRef<string>(
    initialCoordinates && initialAddress.trim().length >= 5 ? initialAddress.trim() : ''
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestCounterRef = useRef<number>(0);

  /**
   * Initialise les coordonnées préexistantes (ex: chargement initial GET /api/shops/me)
   * Évite une recherche inutile si l'adresse et les coordonnées correspondent.
   */
  const setInitialLocation = useCallback((addr: string, coords: Coordinates | null) => {
    const trimmed = addr.trim();
    setAddress(addr);
    if (coords && trimmed.length >= 5) {
      setCoordinates(coords);
      setGeoStatus('found');
      lastQueriedAddressRef.current = trimmed;
    } else {
      setCoordinates(null);
      setGeoStatus('idle');
      lastQueriedAddressRef.current = '';
    }
  }, []);

  /**
   * Exécute la requête de géocodage vers l'API backend FORSA
   */
  const executeLookup = useCallback(async (query: string) => {
    const trimmed = query.trim();

    if (trimmed.length < 5) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setCoordinates(null);
      setDisplayName(null);
      setGeoStatus('idle');
      lastQueriedAddressRef.current = '';
      return;
    }

    // Annule la requête en cours précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentRequestId = ++requestCounterRef.current;
    lastQueriedAddressRef.current = trimmed;

    setGeoStatus('searching');

    try {
      const encodedQuery = encodeURIComponent(trimmed);
      const res = await authFetch(`/api/shops/geocode?q=${encodedQuery}`, {
        method: 'GET',
        signal: abortController.signal,
      });

      // Si une requête plus récente a été lancée entre-temps, ignorer
      if (currentRequestId !== requestCounterRef.current) {
        return;
      }

      if (res.status === 200) {
        const data = await res.json();
        // Le backend renvoie { lat, lng, displayName, city, wilaya }
        // Mapper lat -> latitude, lng -> longitude
        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          setCoordinates({
            latitude: data.lat,
            longitude: data.lng,
          });
          setDisplayName(data.displayName || null);
          setGeoStatus('found');
        } else {
          setCoordinates(null);
          setDisplayName(null);
          setGeoStatus('notFound');
        }
      } else if (res.status === 404) {
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('notFound');
      } else if (res.status === 503 || res.status === 429) {
        // 503 GEOCODER_UNAVAILABLE ou 429 RATE_LIMITED
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('unavailable');
      } else {
        // Erreur inattendue
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('unavailable');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Requête annulée normalement, ne rien faire
        return;
      }
      if (currentRequestId === requestCounterRef.current) {
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('unavailable');
      }
    } finally {
      if (currentRequestId === requestCounterRef.current) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  /**
   * Mise à jour de l'adresse avec debounce 800ms
   */
  const handleAddressChange = useCallback(
    (newAddress: string) => {
      setAddress(newAddress);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const trimmed = newAddress.trim();
      if (trimmed.length < 5) {
        setCoordinates(null);
        setDisplayName(null);
        setGeoStatus('idle');
        lastQueriedAddressRef.current = '';
        return;
      }

      // Si l'adresse est identique à la dernière requêtée avec succès
      if (trimmed === lastQueriedAddressRef.current && geoStatus === 'found') {
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        executeLookup(trimmed);
      }, debounceMs);
    },
    [debounceMs, executeLookup, geoStatus]
  );

  /**
   * Déclenchement immédiat sur blur ou clic 'Réessayer'
   */
  const handleBlur = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmed = address.trim();
    if (trimmed.length >= 5 && trimmed !== lastQueriedAddressRef.current) {
      executeLookup(trimmed);
    }
  }, [address, executeLookup]);

  /**
   * Forcer une nouvelle recherche (ex: bouton Réessayer carte down)
   */
  const retry = useCallback(() => {
    const trimmed = address.trim();
    if (trimmed.length >= 5) {
      executeLookup(trimmed);
    }
  }, [address, executeLookup]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
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
    retry,
    setInitialLocation,
  };
}
