// src/types/index.ts
// Shared TypeScript types for MS2

import { Request } from 'express';

// ─── JWT Payload (from MS1 - RS256) ───────────────────────────────────────────
export interface JwtPayload {
  sub:             string;                  // User ID (merchant account ID)
  role:            UserRole;
  email?:          string;
  fullName?:       string;
  emailVerified:   boolean;
  merchantStatus?: MerchantStatus | null;   // Null for CUSTOMER / ADMIN
  shopId?:         string | null;           // Null for CUSTOMER / ADMIN, required for MERCHANT
  merchantId?:     string | null;           // Legacy alias in MS1 tokens; never used for authorization
  iss?:            string;
  iat?:            number;
  exp?:            number;
}

export type UserRole       = 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
export type MerchantStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';

// ─── Express Request extension ───────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── Authenticated request ────────────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── Standard API error response ─────────────────────────────────────────────
export interface ApiError {
  error: {
    code:    string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationParams {
  page:  number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data:       T[];
  pagination: {
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
    hasNext:    boolean;
    hasPrev:    boolean;
  };
}

// ─── Offer search/filter params ───────────────────────────────────────────────
export interface OfferSearchParams extends PaginationParams {
  lat?:         number;
  lng?:         number;
  radius?:      number;    // km
  q?:           string;
  category?:    string;    // category slug
  productType?: 'PACKAGED' | 'FRESH';
  minPrice?:    number;
  maxPrice?:    number;
  minDiscount?: number;    // 0-100
  available?:   boolean;
  sort?:        'distance' | 'price' | 'deadline' | 'discount';
}

// ─── RabbitMQ event envelope ──────────────────────────────────────────────────
export interface DomainEvent<T = unknown> {
  eventId:    string;
  type:       string;
  occurredAt: string;   // ISO 8601 UTC
  payload:    T;
}
