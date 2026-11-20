// src/middleware/auth.ts
// Verifies asymmetric RS256 JWT tokens issued by MS1 (Accounts & Shops).
// MS2 never issues tokens — it strictly verifies them using MS1's RSA 2048-bit public key.
// No symmetric HS256 secret is accepted.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, AuthenticatedRequest } from '../types';
import { Errors } from '../utils/apiError';
import { logger } from '../config/logger';

let activePublicKey: string = env.JWT_PUBLIC_KEY || env.MS1_JWT_PUBLIC_KEY;

/**
 * Attempts to load or refresh MS1's RSA public key from the MS1 endpoint.
 * Called during startup or as fallback if the key is not preset via environment variable.
 */
export async function loadMs1PublicKey(): Promise<string | null> {
  // If a valid PEM key is already set via environment, retain it
  if (activePublicKey && activePublicKey.includes('BEGIN PUBLIC KEY')) {
    return activePublicKey;
  }

  try {
    const res = await fetch(env.MS1_PUBLIC_KEY_URL);
    if (res.ok) {
      const data = await res.json() as any;
      const key = data.publicKey || data.key || (typeof data === 'string' ? data : null);
      if (typeof key === 'string' && key.includes('PUBLIC KEY')) {
        activePublicKey = key.replace(/\\n/g, '\n');
        logger.info('Successfully fetched MS1 RS256 public key from endpoint', { url: env.MS1_PUBLIC_KEY_URL });
        return activePublicKey;
      }
    }
  } catch (err: any) {
    logger.debug('Could not dynamically fetch MS1 public key (MS1 may not be running yet)', { message: err?.message });
  }

  return activePublicKey || null;
}

export function getActivePublicKey(): string {
  return activePublicKey;
}

export function setActivePublicKey(key: string): void {
  activePublicKey = key.replace(/\\n/g, '\n');
}

/**
 * Middleware: Verifies the RS256 JWT in the Authorization Bearer header.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    Errors.unauthorized(res, 'Authentication token required.');
    return;
  }

  const token = authHeader.slice(7);
  const keyToUse = activePublicKey || env.JWT_PUBLIC_KEY || env.MS1_JWT_PUBLIC_KEY;

  if (!keyToUse) {
    logger.error('Cannot verify JWT: MS1 RS256 public key is not configured.');
    Errors.internal(res);
    return;
  }

  try {
    // Strictly enforce RS256 algorithm only — rejects any HS256 symmetric secret
    const payload = jwt.verify(token, keyToUse, {
      algorithms: ['RS256'],
    }) as JwtPayload;

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
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
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  authenticate(req, res, next);
}
