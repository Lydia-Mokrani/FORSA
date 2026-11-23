// src/middleware/auth.ts
// Verifies asymmetric RS256 JWT tokens issued by MS1 (Accounts & Shops).
// MS2 never issues tokens — it strictly verifies them using MS1's RSA 2048-bit public key.
// Enforces single-flight cooldown key refresh, background loading, and strict Zod claim validation.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { JwtPayload, AuthenticatedRequest } from '../types';
import { Errors, sendError } from '../utils/apiError';
import { logger } from '../config/logger';

let activePublicKey: string | null = null;
let lastRefreshAttemptTimestamp = 0;
let inFlightRefreshPromise: Promise<string | null> | null = null;

const KEY_REFRESH_COOLDOWN_MS = Number(process.env.KEY_REFRESH_COOLDOWN_MS) || 60000;
const JWT_ISSUER = process.env.JWT_ISSUER || 'forsa-ms1-accounts';

// ─── Claims Validation Schema (Decision D1 & Item E) ──────────────────────────
const JwtClaimsSchema = z.object({
  sub:            z.string().min(1),
  role:           z.enum(['CUSTOMER', 'MERCHANT', 'ADMIN']),
  email:          z.string().email().optional(),
  fullName:       z.string().optional(),
  emailVerified:  z.boolean(),
  merchantStatus: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']).nullable().optional(),
  shopId:         z.string().nullable().optional(),
  merchantId:     z.string().nullable().optional(),
  iss:            z.string().optional(),
  iat:            z.number().optional(),
  exp:            z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'MERCHANT') {
    if (!data.shopId || typeof data.shopId !== 'string' || data.shopId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Role MERCHANT requires a non-empty shopId claim.',
        path: ['shopId'],
      });
    }
  }
});

export function hasMs1PublicKey(): boolean {
  const key = getActivePublicKey();
  return key !== null && key.trim().length > 0;
}

export function getActivePublicKey(): string | null {
  if (activePublicKey) return activePublicKey;
  const envKey = env.JWT_PUBLIC_KEY || env.MS1_JWT_PUBLIC_KEY;
  if (envKey && envKey.includes('BEGIN PUBLIC KEY')) {
    return envKey.replace(/\\n/g, '\n');
  }
  return null;
}

export function setActivePublicKey(key: string | null): void {
  activePublicKey = key ? key.replace(/\\n/g, '\n') : null;
}

/**
 * Refreshes the MS1 public key with single-flight and cooldown (Item F).
 * The attempt timestamp is recorded BEFORE the fetch.
 * Cooldown applies to both success and failure.
 */
export async function refreshMs1PublicKey(): Promise<string | null> {
  const now = Date.now();
  if (now - lastRefreshAttemptTimestamp < KEY_REFRESH_COOLDOWN_MS) {
    logger.debug('Skipping MS1 public key refresh: cooldown active.');
    return getActivePublicKey();
  }

  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  lastRefreshAttemptTimestamp = now;
  inFlightRefreshPromise = (async () => {
    try {
      const endpointUrl = env.MS1_PUBLIC_KEY_URL;
      const res = await fetch(endpointUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json() as any;
        const key = data.publicKey || data.key || (typeof data === 'string' ? data : null);
        if (typeof key === 'string' && key.includes('PUBLIC KEY')) {
          activePublicKey = key.replace(/\\n/g, '\n');
          logger.info('Refreshed MS1 RS256 public key from endpoint', { url: endpointUrl });
          return activePublicKey;
        }
      }
      logger.warn('MS1 public key endpoint returned non-200 or invalid key', { status: res.status });
    } catch (err: any) {
      logger.warn('Failed to refresh MS1 public key from endpoint', { message: err?.message });
    } finally {
      inFlightRefreshPromise = null;
    }
    return getActivePublicKey();
  })();

  return inFlightRefreshPromise;
}

export async function loadMs1PublicKey(maxRetries = 3, retryDelayMs = 2000): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const key = await refreshMs1PublicKey();
    if (key) return key;
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  return getActivePublicKey();
}

/**
 * Background key refresh that never blocks service startup (Item G).
 */
export function startBackgroundKeyRefresh(): void {
  refreshMs1PublicKey().catch(() => {});
  const interval = setInterval(() => {
    if (!activePublicKey) {
      refreshMs1PublicKey().catch(() => {});
    }
  }, 60000);
  interval.unref();
}

/**
 * Middleware: Verifies RS256 JWT in Authorization header.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    Errors.unauthorized(res, 'Authentication token required.');
    return;
  }

  const token = authHeader.slice(7);
  let keyToUse = getActivePublicKey();

  if (!keyToUse) {
    keyToUse = await refreshMs1PublicKey();
  }

  if (!keyToUse) {
    logger.warn('Cannot verify JWT: MS1 RS256 public key is not available.');
    res.set('Retry-After', '30');
    sendError(res, 503, 'AUTH_KEY_UNAVAILABLE', 'Authentication service temporarily unavailable');
    return;
  }

  const verifyOptions: jwt.VerifyOptions = {
    algorithms: ['RS256'],
    issuer:     JWT_ISSUER,
  };

  try {
    const rawPayload = jwt.verify(token, keyToUse, verifyOptions);
    const parsed = JwtClaimsSchema.safeParse(rawPayload);
    if (!parsed.success) {
      Errors.unauthorized(res, 'Invalid token');
      return;
    }
    (req as AuthenticatedRequest).user = parsed.data as JwtPayload;
    next();
  } catch (err: any) {
    const isSignatureError = err instanceof jwt.JsonWebTokenError && err.message.toLowerCase().includes('signature');
    if (isSignatureError) {
      const refreshedKey = await refreshMs1PublicKey();
      if (refreshedKey && refreshedKey !== keyToUse) {
        try {
          const rawPayload = jwt.verify(token, refreshedKey, verifyOptions);
          const parsed = JwtClaimsSchema.safeParse(rawPayload);
          if (parsed.success) {
            (req as AuthenticatedRequest).user = parsed.data as JwtPayload;
            next();
            return;
          }
        } catch { /* signature still fails */ }
      }
    }

    if (err instanceof jwt.TokenExpiredError) {
      Errors.unauthorized(res, 'Token expired');
    } else {
      Errors.unauthorized(res, 'Invalid token');
    }
  }
}

/**
 * Optional authentication: populates req.user if valid token is provided, continues otherwise.
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  await authenticate(req, res, next);
}
