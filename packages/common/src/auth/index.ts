import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../errors';

export type UserRole = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

export interface UserPayload {
  sub: string;             // userId
  email: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  shopId?: string | null;
  shopStatus?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * Middleware qui vérifie le JWT signé par MS1 en utilisant la clé publique RS256.
 * Zéro appel réseau vers MS1 ! Vérification 100% locale ultra-rapide.
 */
export const requireAuth = (publicKey: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Token d\'authentification manquant.'));
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
      }) as UserPayload;

      req.user = decoded;
      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Session expirée. Veuillez vous reconnecter.'));
      }
      return next(new UnauthorizedError('Token d\'authentification invalide.'));
    }
  };
};

/**
 * Middleware pour restreindre l'accès à un ou plusieurs rôles (ex: requireRole('ADMIN', 'MERCHANT'))
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Accès réservé aux rôles : ${allowedRoles.join(', ')}`));
    }

    next();
  };
};

/**
 * Middleware pour sécuriser les routes /internal/* appelées entre services (ex: MS3 -> MS2)
 */
export const requireInternalKey = (expectedApiKey: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.headers['x-internal-api-key'];
    if (!key || key !== expectedApiKey) {
      return next(new ForbiddenError('Appel interne non autorisé.'));
    }
    next();
  };
};
