// src/middleware/internalAuth.ts
// Protects internal service-to-service endpoints.
// These endpoints must NEVER be exposed through Traefik — only accessible
// on the internal Docker network.

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { Errors } from '../utils/apiError';

export function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-api-key'];
  if (!key || typeof key !== 'string') {
    Errors.unauthorized(res, 'Missing or invalid internal API key.');
    return;
  }

  const expectedKey = env.INTERNAL_API_KEY;
  const keyBuf = Buffer.from(key, 'utf8');
  const expectedBuf = Buffer.from(expectedKey, 'utf8');

  if (keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
    Errors.unauthorized(res, 'Missing or invalid internal API key.');
    return;
  }
  next();
}
