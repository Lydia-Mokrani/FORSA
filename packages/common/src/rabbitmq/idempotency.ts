/**
 * Cache LRU borné avec TTL pour garantir l'idempotence des consommateurs RabbitMQ.
 * 
 * Mémoire estimée par instance :
 * Chaque entrée contient un UUID v4 (36 caractères = ~72 octets UTF-16) + timestamp (8 octets) + overhead Map.
 * Pour maxSize = 10 000 événements et TTL = 24 heures :
 * 10 000 * ~200 octets ≈ 2 Mo de mémoire RAM par consommateur.
 */
export class BoundedIdempotencyCache {
  private cache = new Map<string, number>();

  constructor(
    private readonly maxSize: number = 10000,
    private readonly ttlMs: number = 24 * 60 * 60 * 1000
  ) {}

  /**
   * Vérifie si l'eventId a déjà été traité et n'est pas expiré.
   */
  public has(eventId: string): boolean {
    if (!eventId) return false;
    const expiresAt = this.cache.get(eventId);
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
      this.cache.delete(eventId);
      return false;
    }
    return true;
  }

  /**
   * Enregistre un eventId traité avec un TTL.
   * Éviction LRU : supprime l'entrée la plus ancienne si maxSize est atteint.
   */
  public add(eventId: string): void {
    if (!eventId) return;

    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(eventId, Date.now() + this.ttlMs);
  }

  public get size(): number {
    return this.cache.size;
  }

  public clear(): void {
    this.cache.clear();
  }
}
