import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@forsa/common';
import { normalizeToE164 } from '../utils/phone';
import { prisma } from '../config/prisma';

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
          return next(new ApiError(429, 'RATE_LIMITED', message));
        }
      }
    }

    next();
  };
}

/**
 * Rate limit sur /auth/telegram/start :
 * 1. Mode dev : limiteur mémoire par IP conservé (en prod, le rate-limiting IP est délégué à Traefik).
 * 2. Par numéro : STRICTEMENT depuis la base de données (table auth_challenges sur les 10 dernières minutes).
 *    Si count >= RATE_LIMIT_START_MAX (défaut 3) -> 429 RATE_LIMITED avec en-tête Retry-After.
 */
export const startRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Limiteur mémoire IP (actif uniquement en environnement de développement)
  if (process.env.NODE_ENV === 'development') {
    const ip = req.ip || 'unknown_ip';
    const key = `ip_start:${ip}`;
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    let record = rateLimitStore.get(key);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
      if (record.count > 10) {
        return next(new ApiError(429, 'RATE_LIMITED', 'Trop de demandes de vérification depuis cette IP (dev).'));
      }
    }
  }

  // 2. Limite par téléphone depuis la base de données
  const rawPhone = req.body?.phone;
  if (!rawPhone || typeof rawPhone !== 'string') {
    return next(); // Laisse le validateur Zod renvoyer 400 Bad Request
  }

  const normalizedPhone = normalizeToE164(rawPhone);
  if (!normalizedPhone) {
    return next();
  }

  const maxAttempts = parseInt(process.env.RATE_LIMIT_START_MAX || '3', 10);
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const windowStart = new Date(Date.now() - windowMs);

  try {
    const count = await prisma.authChallenge.count({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: windowStart },
      },
    });

    if (count >= maxAttempts) {
      const oldestInWindow = await prisma.authChallenge.findFirst({
        where: {
          phone: normalizedPhone,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const retryAfterSeconds = oldestInWindow
        ? Math.max(1, Math.ceil((oldestInWindow.createdAt.getTime() + windowMs - Date.now()) / 1000))
        : 600;

      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Trop de demandes de vérification pour ce numéro. Veuillez patienter avant de réessayer.',
          retryAfter: retryAfterSeconds,
        },
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Rate limit sur /auth/telegram/verify : max 10 tentatives par IP en 5 min
 */
export const verifyRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives de vérification. Veuillez patienter avant de réessayer.',
  keyGenerator: (req) => [`verify_ip:${req.ip || 'unknown'}`],
});
