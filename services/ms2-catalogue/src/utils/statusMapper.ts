// src/utils/statusMapper.ts
// Maps shop status strings from MS1 into MS2's ShopStatus enum according to Binding Decision D3.

import { ShopStatus } from '@prisma/client';

/**
 * Pure function to map external MS1 shop status to MS2 ShopStatus enum:
 * - APPROVED or ACTIVE  → ACTIVE
 * - SUSPENDED           → SUSPENDED
 * - PENDING, REJECTED or CLOSED → CLOSED
 * - Anything else       → null (invalid)
 */
export function mapShopStatus(input: unknown): ShopStatus | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().toUpperCase();
  if (s === 'APPROVED' || s === 'ACTIVE') return ShopStatus.ACTIVE;
  if (s === 'SUSPENDED') return ShopStatus.SUSPENDED;
  if (s === 'PENDING' || s === 'REJECTED' || s === 'CLOSED') return ShopStatus.CLOSED;
  return null;
}
