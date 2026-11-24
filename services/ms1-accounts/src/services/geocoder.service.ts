// services/ms1-accounts/src/services/geocoder.service.ts
import { config } from '../config/env';

export interface GeocodeResult {
  lat: number;
  lng: number;
  latitude: number;
  longitude: number;
  displayName: string;
  city: string | null;
  wilaya: string | null;
}

export type GeocodeErrorCode = 'ADDRESS_NOT_FOUND' | 'GEOCODER_UNAVAILABLE' | 'BAD_REQUEST' | 'RATE_LIMITED';

export class GeocoderError extends Error {
  public status: number;
  public code: GeocodeErrorCode;

  constructor(status: number, code: GeocodeErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, GeocoderError.prototype);
  }
}

interface CacheEntry {
  result: GeocodeResult;
  timestamp: number;
}

export class GeocoderService {
  private nominatimUrl: string;
  private userAgent: string;
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheEntries: number = 300;
  private cacheTtlMs: number = 24 * 60 * 60 * 1000; // 24 heures

  // Throttling strict : paramétrable via env (défaut 1000ms = 1 req/s)
  private lastRequestTime: number = 0;
  private throttleQueue: Promise<void> = Promise.resolve();
  private waitingQueueLength: number = 0;
  private maxQueueLength: number;
  private minIntervalMs: number;

  // Limitation par utilisateur : paramétrable via env (défaut 10 req/min)
  private userRequestTimestamps: Map<string, number[]> = new Map();
  private userRateLimitMax: number;
  private userRateLimitWindowMs: number = 60 * 1000;

  constructor(
    nominatimUrl?: string,
    userAgent?: string,
    options?: {
      minIntervalMs?: number;
      maxQueueLength?: number;
      userRateLimitMax?: number;
    }
  ) {
    this.nominatimUrl = (nominatimUrl || config.nominatimUrl || 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');
    this.userAgent = userAgent || config.geocoderUserAgent || 'FORSA-MS1-Geocoder/1.0 (contact@forsa-dz.com)';

    // Lecture pilotée par variables d'environnement avec valeurs par défaut
    this.minIntervalMs = options?.minIntervalMs ?? (
      process.env.GEOCODER_MIN_INTERVAL_MS
        ? parseInt(process.env.GEOCODER_MIN_INTERVAL_MS, 10)
        : (config.geocoderMinIntervalMs || 1000)
    );
    this.maxQueueLength = options?.maxQueueLength ?? (
      process.env.GEOCODER_QUEUE_MAX
        ? parseInt(process.env.GEOCODER_QUEUE_MAX, 10)
        : (config.geocoderQueueMax || 20)
    );
    this.userRateLimitMax = options?.userRateLimitMax ?? (
      process.env.GEOCODER_USER_LIMIT_PER_MIN
        ? parseInt(process.env.GEOCODER_USER_LIMIT_PER_MIN, 10)
        : (config.geocoderUserLimitPerMin || 10)
    );
  }

  public getMinIntervalMs(): number {
    return this.minIntervalMs;
  }

  public getMaxQueueLength(): number {
    return this.maxQueueLength;
  }

  public getUserRateLimitMax(): number {
    return this.userRateLimitMax;
  }

  private normalizeKey(q: string): string {
    return q.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  public checkUserRateLimit(userId: string): void {
    const now = Date.now();
    const timestamps = this.userRequestTimestamps.get(userId) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.userRateLimitWindowMs);

    if (validTimestamps.length >= this.userRateLimitMax) {
      throw new GeocoderError(
        429,
        'RATE_LIMITED',
        `Limite de requêtes atteinte (${this.userRateLimitMax} recherches par minute). Veuillez patienter.`
      );
    }

    validTimestamps.push(now);
    this.userRequestTimestamps.set(userId, validTimestamps);
  }

  private async throttle(): Promise<void> {
    if (this.waitingQueueLength >= this.maxQueueLength) {
      throw new GeocoderError(
        503,
        'GEOCODER_UNAVAILABLE',
        'Service de géocodage temporairement indisponible'
      );
    }

    this.waitingQueueLength++;
    try {
      const nextInQueue = this.throttleQueue.then(async () => {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.minIntervalMs) {
          await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
        }
        this.lastRequestTime = Date.now();
      });
      this.throttleQueue = nextInQueue.catch(() => {});
      await nextInQueue;
    } finally {
      this.waitingQueueLength = Math.max(0, this.waitingQueueLength - 1);
    }
  }

  public async geocode(query: string, userId?: string): Promise<GeocodeResult> {
    if (!query || !query.trim()) {
      throw new GeocoderError(400, 'BAD_REQUEST', 'Le paramètre de recherche q est requis');
    }

    // Contrôle du taux par utilisateur authentifié
    if (userId) {
      this.checkUserRateLimit(userId);
    }

    const trimmed = query.trim();
    const cacheKey = this.normalizeKey(trimmed);

    // 1. Vérification dans le cache mémoire
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.result;
    }

    // Confidentialité : ne jamais consigner l'adresse complète dans les journaux
    const maskedQuery = trimmed.length > 6
      ? `${trimmed.substring(0, 3)}*** (longueur: ${trimmed.length})`
      : '***';
    console.log(`[MS1-Geocoder] Géocodage requis pour requête masquée: ${maskedQuery}`);

    // 2. Throttling Nominatim (1 req/s) avec limitation de file d'attente à 20
    await this.throttle();

    const baseUrl = this.nominatimUrl.endsWith('/search')
      ? this.nominatimUrl
      : `${this.nominatimUrl}/search`;
    const url = `${baseUrl}?format=json&countrycodes=dz&limit=5&addressdetails=1&q=${encodeURIComponent(trimmed)}`;

    // 3. Appel HTTP avec timeout de 5 secondes STRICTEMENT dédié à l'appel réseau
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response: globalThis.Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
      });
    } catch (err: any) {
      console.warn(`[MS1-Geocoder] Erreur réseau / timeout 5s Nominatim :`, err?.message || err);
      throw new GeocoderError(503, 'GEOCODER_UNAVAILABLE', 'Service de géocodage temporairement indisponible');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.warn(`[MS1-Geocoder] Réponse non-OK Nominatim: HTTP ${response.status}`);
      throw new GeocoderError(503, 'GEOCODER_UNAVAILABLE', 'Service de géocodage temporairement indisponible');
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      throw new GeocoderError(503, 'GEOCODER_UNAVAILABLE', 'Service de géocodage temporairement indisponible');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new GeocoderError(404, 'ADDRESS_NOT_FOUND', 'Adresse introuvable.');
    }

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);

    if (isNaN(lat) || isNaN(lon)) {
      throw new GeocoderError(404, 'ADDRESS_NOT_FOUND', 'Coordonnées GPS introuvables pour cette adresse.');
    }

    const addr = first.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || null;
    const wilaya = addr.state || addr.province || addr.county || null;

    const result: GeocodeResult = {
      lat,
      lng: lon,
      latitude: lat,
      longitude: lon,
      displayName: first.display_name || trimmed,
      city,
      wilaya,
    };

    // 4. Enregistrement en cache mémoire
    if (this.cache.size >= this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Méthodes utilitaires pour réinitialiser l'état (utile en tests unitaires)
   */
  public clearCache(): void {
    this.cache.clear();
  }

  public clearRateLimits(): void {
    this.userRequestTimestamps.clear();
  }

  public resetQueue(): void {
    this.waitingQueueLength = 0;
    this.throttleQueue = Promise.resolve();
    this.lastRequestTime = 0;
  }
}

export const geocoderService = new GeocoderService();
