// src/middleware/auth.ts
// Verifies asymmetric RS256 JWT tokens issued by MS1 (Accounts & Shops).
// MS2 never issues tokens — it strictly verifies them using MS1's RSA 2048-bit public key.
// Includes automatic key refreshment on signature failure and dynamic endpoint fetching.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, AuthenticatedRequest } from '../types';
import { Errors } from '../utils/apiError';
import { logger } from '../config/logger';

let activePublicKey: string = '';
let lastRefreshTimestamp = 0;

/**
 * Attempts to load MS1's RSA public key from the MS1/Traefik endpoint.
 * Prefers the dynamic endpoint (e.g. through Traefik) and retries on startup.
 * Falls back to static environment variable if endpoint is unreachable.
 */
export async function loadMs1PublicKey(maxRetries = 3, retryDelayMs = 2000): Promise<string | null> {
  const endpointUrl = env.MS1_PUBLIC_KEY_URL;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(endpointUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json() as any;
        const key = data.publicKey || data.key || (typeof data === 'string' ? data : null);
        if (typeof key === 'string' && key.includes('PUBLIC KEY')) {
          activePublicKey = key.replace(/\\n/g, '\n');
          lastRefreshTimestamp = Date.now();
          logger.info('Loaded MS1 RS256 public key from endpoint', { url: endpointUrl });
          return activePublicKey;
        }
      }
    } catch (err: any) {
      logger.debug(`MS1 public key fetch attempt ${attempt}/${maxRetries} failed: ${err?.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }

  // Fallback to static environment variable if provided
  const envKey = env.JWT_PUBLIC_KEY || env.MS1_JWT_PUBLIC_KEY;
  if (envKey && envKey.includes('BEGIN PUBLIC KEY')) {
    activePublicKey = envKey;
    logger.info('Using static MS1 JWT public key from environment configuration');
    return activePublicKey;
  }

  logger.warn('No MS1 public key could be loaded from endpoint or environment.');
  return null;
}

export function getActivePublicKey(): string {
  return activePublicKey || env.JWT_PUBLIC_KEY || env.MS1_JWT_PUBLIC_KEY;
}

export function setActivePublicKey(key: string): void {
  activePublicKey = key.replace(/\\n/g, '\n');
}

/**
 * Middleware: Verifies the RS256 JWT in the Authorization Bearer header.
 * On signature verification failure, attempts a rate-limited key refresh from MS1 (at most once per minute).
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
    // Attempt lazy load if key not yet loaded
    await loadMs1PublicKey(1);
    keyToUse = getActivePublicKey();
  }

  if (!keyToUse) {
    logger.error('Cannot verify JWT: MS1 RS256 public key is not configured or reachable.');
    Errors.internal(res);
    return;
  }

  const verifyOptions: jwt.VerifyOptions = {
    algorithms: ['RS256'],
  };

  try {
    const payload = jwt.verify(token, keyToUse, verifyOptions) as JwtPayload;
    if (payload.iss && payload.iss !== 'forsa-ms1-accounts') {
      Errors.unauthorized(res, 'Invalid token');
      return;
    }
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err: any) {
    // If signature failed, MS1 may have rebuilt and rotated its keypair.
    // Refresh the key from MS1_PUBLIC_KEY_URL (at most once every 60 seconds) and retry.
    const isSignatureError = err instanceof jwt.JsonWebTokenError && err.message.toLowerCase().includes('signature');
    const canRefresh = (Date.now() - lastRefreshTimestamp) > 60000;

    if (isSignatureError && canRefresh) {
      logger.info('JWT signature check failed. Attempting on-demand refresh of MS1 public key...');
      const refreshedKey = await loadMs1PublicKey(1);
      if (refreshedKey && refreshedKey !== keyToUse) {
        try {
          const payload = jwt.verify(token, refreshedKey, verifyOptions) as JwtPayload;
          if (payload.iss && payload.iss !== 'forsa-ms1-accounts') {
            Errors.unauthorized(res, 'Invalid token');
            return;
          }
          (req as AuthenticatedRequest).user = payload;
          next();
          return;
        } catch {
          // Token still invalid with refreshed key
        }
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
