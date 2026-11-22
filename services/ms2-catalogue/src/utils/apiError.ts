// src/utils/apiError.ts
// Factory for consistent API error responses

import { Response } from 'express';
import { ApiError } from '../types';

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): void {
  const body: ApiError = { error: { code, message } };
  if (details) body.error.details = details;
  res.status(status).json(body);
}

// Convenience shortcuts
export const Errors = {
  badRequest:   (res: Response, message: string, details?: Record<string, unknown>) =>
    sendError(res, 400, 'BAD_REQUEST', message, details),
  unauthorized: (res: Response, message = 'Authentication required') =>
    sendError(res, 401, 'UNAUTHORIZED', message),
  forbidden:    (res: Response, message = 'Access denied') =>
    sendError(res, 403, 'FORBIDDEN', message),
  notFound:     (res: Response, message = 'Resource not found') =>
    sendError(res, 404, 'NOT_FOUND', message),
  conflict:     (res: Response, message: string) =>
    sendError(res, 409, 'CONFLICT', message),
  tooMany:      (res: Response, message = 'Too many requests') =>
    sendError(res, 429, 'TOO_MANY_REQUESTS', message),
  internal:     (res: Response, message = 'Internal server error') =>
    sendError(res, 500, 'INTERNAL_ERROR', message),
};
