import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@forsa/common';
import { normalizeToE164 } from '../utils/phone';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Nettoyage régulier toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string | string[];
}) {
  const { windowMs, max, message = 'Trop de requêtes, veuillez réessayer plus tard.' } = options;

  return (req: Request, _res: Response, next: NextFunction) => {
    const keys: string[] = [];

    if (options.keyGenerator) {
      const gen = options.keyGenerator(req);
      if (Array.isArray(gen)) keys.push(...gen);
      else if (gen) keys.push(gen);
    } else {
      keys.push(req.ip || 'unknown_ip');
    }

    const now = Date.now();

    for (const key of keys) {
      if (!key) continue;
      let record = rateLimitStore.get(key);
      if (!record || record.resetAt <= now) {
        record = { count: 1, resetAt: now + windowMs };
        rateLimitStore.set(key, record);
      } else {
        record.count++;
        if (record.count > max) {
          return next(new ApiError(429, 'RATE_LIMIT_EXCEEDED', message));
        }
      }
    }

    next();
  };
}

/**
 * Rate limit sur /auth/telegram/start : max 3 démarrages en 10 min par numéro et par IP
 */
export const startRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: 'Trop de demandes de vérification. Veuillez patienter 10 minutes avant de réessayer.',
  keyGenerator: (req) => {
    const ipKey = `ip:${req.ip || 'unknown'}`;
    const rawPhone = req.body?.phone;
    if (rawPhone) {
      const normalized = normalizeToE164(rawPhone);
      return [ipKey, `phone:${normalized}`];
    }
    return [ipKey];
  },
});

/**
 * Rate limit sur /auth/telegram/verify : max 10 tentatives par IP en 5 min
 */
export const verifyRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives de vérification. Veuillez patienter avant de réessayer.',
  keyGenerator: (req) => [`verify_ip:${req.ip || 'unknown'}`],
});
