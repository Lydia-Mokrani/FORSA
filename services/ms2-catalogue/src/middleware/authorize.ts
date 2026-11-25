// src/middleware/authorize.ts
// Role-based and merchant-status authorization middleware

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { Errors } from '../utils/apiError';

/**
 * Requires the authenticated user to have one of the specified roles.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      Errors.unauthorized(res);
      return;
    }
    if (!roles.includes(authReq.user.role)) {
      Errors.forbidden(res, `Role '${authReq.user.role}' cannot access this resource.`);
      return;
    }
    next();
  };
}

/**
 * Requires that the merchant's email is verified.
 */
export function requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.emailVerified) {
    Errors.forbidden(res, 'Email address must be verified to perform this action.');
    return;
  }
  next();
}

/**
 * Requires that the merchant account is APPROVED by the platform.
 * Also rejects SUSPENDED merchants.
 */
export function requireApprovedMerchant(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  const status = authReq.user?.merchantStatus;
  if (status !== 'APPROVED') {
    if (status === 'SUSPENDED') {
      Errors.forbidden(res, 'Your account has been suspended. You cannot publish offers.');
    } else {
      Errors.forbidden(res, 'Your merchant account must be approved to perform this action.');
    }
    return;
  }
  next();
}

