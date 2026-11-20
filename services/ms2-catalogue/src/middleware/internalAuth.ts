// src/middleware/internalAuth.ts
// Protects internal service-to-service endpoints.
// These endpoints must NEVER be exposed through Traefik — only accessible
// on the internal Docker network.

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { Errors } from '../utils/apiError';

export function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-api-key'];
  if (!key || key !== env.INTERNAL_API_KEY) {
    Errors.unauthorized(res, 'Missing or invalid internal API key.');
    return;
  }
  next();
}
