// src/middleware/auth.ts
// Verifies the JWT token issued by MS1 (RS256).
// MS2 never issues tokens — it only verifies them.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, AuthenticatedRequest } from '../types';
import { Errors } from '../utils/apiError';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    Errors.unauthorized(res);
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.MS1_JWT_PUBLIC_KEY, {
      algorithms: [env.JWT_ALGORITHM],
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

// Optional authentication — attaches user if token present, continues if not
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  authenticate(req, res, next);
}
