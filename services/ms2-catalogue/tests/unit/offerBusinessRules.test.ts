// tests/unit/offerBusinessRules.test.ts
// Complete unit tests for MS2 offer business rules & domain validations — no database required

describe('Offer business rules & domain validations', () => {

  // ── 1. Discount calculation ──────────────────────────────────────────────────
  describe('discount percentage calculation', () => {
    function calcDiscount(original: number, discounted: number): number {
      return Math.round((1 - discounted / original) * 100);
    }

    test('50% discount calculates correctly', () => {
      expect(calcDiscount(1000, 500)).toBe(50);
    });

    test('62% discount (bakery example from seed)', () => {
      expect(calcDiscount(650, 250)).toBe(62);
    });

    test('0% discount when prices are equal', () => {
      expect(calcDiscount(500, 500)).toBe(0);
    });

    test('100% discount when discounted is 0', () => {
      expect(calcDiscount(500, 0)).toBe(100);
    });
  });

  // ── 2. Price validation ──────────────────────────────────────────────────────
  describe('price validation rule', () => {
    function isPriceValid(original: number, discounted: number): boolean {
      return discounted < original && discounted > 0 && original > 0;
    }

    test('discounted < original is valid', () => {
      expect(isPriceValid(1000, 500)).toBe(true);
    });

    test('discounted === original is INVALID', () => {
      expect(isPriceValid(1000, 1000)).toBe(false);
    });

    test('discounted > original is INVALID', () => {
      expect(isPriceValid(500, 600)).toBe(false);
    });

    test('zero or negative prices are INVALID', () => {
      expect(isPriceValid(0, 0)).toBe(false);
      expect(isPriceValid(-100, -200)).toBe(false);
    });
  });

  // ── 3. Date & Deadline validations ───────────────────────────────────────────
  describe('date and pickup deadline validation rules', () => {
    function validateDates(productExpiryDate: Date, pickupDeadline: Date, now: Date) {
      if (productExpiryDate <= now) {
        return { valid: false, error: 'Product expiry date cannot be in the past.' };
      }
      if (pickupDeadline <= now) {
        return { valid: false, error: 'Pickup deadline cannot be in the past.' };
      }
      if (pickupDeadline > productExpiryDate) {
        return { valid: false, error: 'Pickup deadline cannot be after the product expiry date.' };
      }
      return { valid: true };
    }

    const now = new Date('2026-11-20T12:00:00Z');

    test('future expiry date and earlier future pickup deadline are valid', () => {
      const expiry = new Date('2026-11-25T12:00:00Z');
      const deadline = new Date('2026-11-21T18:00:00Z');
      const res = validateDates(expiry, deadline, now);
      expect(res.valid).toBe(true);
    });

    test('pickup deadline exactly equal to product expiry date is valid', () => {
      const expiry = new Date('2026-11-25T12:00:00Z');
      const deadline = new Date('2026-11-25T12:00:00Z');
      const res = validateDates(expiry, deadline, now);
      expect(res.valid).toBe(true);
    });

    test('product expiry date in the past is INVALID', () => {
      const expiry = new Date('2026-11-19T12:00:00Z');
      const deadline = new Date('2026-11-21T12:00:00Z');
      const res = validateDates(expiry, deadline, now);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Product expiry date cannot be in the past.');
    });

    test('pickup deadline in the past is INVALID', () => {
      const expiry = new Date('2026-11-25T12:00:00Z');
      const deadline = new Date('2026-11-19T12:00:00Z');
      const res = validateDates(expiry, deadline, now);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Pickup deadline cannot be in the past.');
    });

    test('pickup deadline after product expiry date is INVALID', () => {
      const expiry = new Date('2026-11-22T12:00:00Z');
      const deadline = new Date('2026-11-25T12:00:00Z');
      const res = validateDates(expiry, deadline, now);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Pickup deadline cannot be after the product expiry date.');
    });
  });

  // ── 4. Same-day expiry in Africa/Algiers timezone ─────────────────────────────
  describe('same-day expiry calendar date in Africa/Algiers', () => {
    function getAlgiersCalendarDate(date: Date): string {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Algiers',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    }

    test('dates on the same local date in Algeria match', () => {
      // 2026-11-21 at 10:00 UTC = 11:00 in Algeria
      const expiry = new Date('2026-11-21T10:00:00Z');
      // 2026-11-21 at 20:00 UTC = 21:00 in Algeria
      const deadline = new Date('2026-11-21T20:00:00Z');
      expect(getAlgiersCalendarDate(expiry)).toBe(getAlgiersCalendarDate(deadline));
    });

    test('dates crossing midnight in Algeria are detected as different days', () => {
      // 2026-11-21 at 22:50 UTC = 23:50 in Algeria (Day 21)
      const date1 = new Date('2026-11-21T22:50:00Z');
      // 2026-11-21 at 23:10 UTC = 00:10 in Algeria (Day 22)
      const date2 = new Date('2026-11-21T23:10:00Z');
      expect(getAlgiersCalendarDate(date1)).toBe('2026-11-21');
      expect(getAlgiersCalendarDate(date2)).toBe('2026-11-22');
      expect(getAlgiersCalendarDate(date1)).not.toBe(getAlgiersCalendarDate(date2));
    });
  });

  // ── 5. Stock adjustment calculation & bounds ─────────────────────────────────
  describe('stock adjustment calculation', () => {
    function computeTargetQuantity(
      currentAvailable: number,
      input: { quantityDelta?: number; newQuantity?: number }
    ): { target: number; delta: number; valid: boolean } {
      let target: number;
      let delta: number;

      if (input.newQuantity !== undefined) {
        target = input.newQuantity;
        delta = target - currentAvailable;
      } else {
        delta = input.quantityDelta!;
        target = currentAvailable + delta;
      }

      return {
        target,
        delta,
        valid: target >= 0,
      };
    }

    test('positive quantityDelta increases available stock', () => {
      const result = computeTargetQuantity(5, { quantityDelta: 3 });
      expect(result.valid).toBe(true);
      expect(result.target).toBe(8);
      expect(result.delta).toBe(3);
    });

    test('negative quantityDelta decreases stock within available limit', () => {
      const result = computeTargetQuantity(5, { quantityDelta: -2 });
      expect(result.valid).toBe(true);
      expect(result.target).toBe(3);
      expect(result.delta).toBe(-2);
    });

    test('negative quantityDelta exceeding available is INVALID', () => {
      const result = computeTargetQuantity(5, { quantityDelta: -10 });
      expect(result.valid).toBe(false);
      expect(result.target).toBe(-5);
    });

    test('explicit newQuantity sets target directly', () => {
      const result = computeTargetQuantity(5, { newQuantity: 12 });
      expect(result.valid).toBe(true);
      expect(result.target).toBe(12);
      expect(result.delta).toBe(7);
    });

    test('setting newQuantity to 0 triggers sold-out boundary', () => {
      const result = computeTargetQuantity(5, { newQuantity: 0 });
      expect(result.valid).toBe(true);
      expect(result.target).toBe(0);
      expect(result.delta).toBe(-5);
    });
  });

  // ── 6. Active reservation guard on withdrawal ────────────────────────────────
  describe('offer withdrawal guard', () => {
    function canWithdraw(reservedCount: number, releasedOrPickedUpCount: number): boolean {
      const activePendingReservations = reservedCount - releasedOrPickedUpCount;
      return activePendingReservations <= 0;
    }

    test('offer with 0 reservations can be withdrawn', () => {
      expect(canWithdraw(0, 0)).toBe(true);
    });

    test('offer where all reservations are picked up can be withdrawn', () => {
      expect(canWithdraw(5, 5)).toBe(true);
    });

    test('offer with active uncompleted reservation CANNOT be withdrawn', () => {
      expect(canWithdraw(3, 1)).toBe(false);
    });
  });

  // ── 7. Pickup after release guard ────────────────────────────────────────────
  describe('pickup guard against released reservation', () => {
    function canRecordPickup(isAlreadyReleased: boolean): boolean {
      return !isAlreadyReleased;
    }

    test('pickup allowed if not released', () => {
      expect(canRecordPickup(false)).toBe(true);
    });

    test('pickup rejected if reservation was already released', () => {
      expect(canRecordPickup(true)).toBe(false);
    });
  });

  // ── 8. Public visibility guards ──────────────────────────────────────────────
  describe('public offer visibility filter', () => {
    const PUBLIC_ALLOWED_STATUSES = ['ACTIVE', 'SOLD_OUT'];

    function isOfferPubliclyVisible(status: string, expiresAt: Date, now: Date): boolean {
      return PUBLIC_ALLOWED_STATUSES.includes(status) && expiresAt > now;
    }

    const now = new Date('2026-11-20T12:00:00Z');
    const future = new Date('2026-11-21T12:00:00Z');
    const past = new Date('2026-11-19T12:00:00Z');

    test('ACTIVE future offer is visible', () => {
      expect(isOfferPubliclyVisible('ACTIVE', future, now)).toBe(true);
    });

    test('SOLD_OUT future offer is visible as unavailable', () => {
      expect(isOfferPubliclyVisible('SOLD_OUT', future, now)).toBe(true);
    });

    test('DRAFT offer is HIDDEN from public', () => {
      expect(isOfferPubliclyVisible('DRAFT', future, now)).toBe(false);
    });

    test('PENDING_VERIFICATION offer is HIDDEN from public', () => {
      expect(isOfferPubliclyVisible('PENDING_VERIFICATION', future, now)).toBe(false);
    });

    test('REJECTED offer is HIDDEN from public', () => {
      expect(isOfferPubliclyVisible('REJECTED', future, now)).toBe(false);
    });

    test('WITHDRAWN offer is HIDDEN from public', () => {
      expect(isOfferPubliclyVisible('WITHDRAWN', future, now)).toBe(false);
    });

    test('Expired ACTIVE offer is HIDDEN from public', () => {
      expect(isOfferPubliclyVisible('ACTIVE', past, now)).toBe(false);
    });
  });

  // ── 9. Coordinate pair & range validation ────────────────────────────────────
  describe('coordinate pair and range validation', () => {
    function validateCoordinates(lat?: number, lng?: number): { valid: boolean; error?: string } {
      const hasLat = lat !== undefined;
      const hasLng = lng !== undefined;
      if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
        return { valid: false, error: 'Both latitude and longitude must be provided together.' };
      }
      if (hasLat && (lat! < -90 || lat! > 90)) {
        return { valid: false, error: 'Latitude must be between -90 and 90 degrees.' };
      }
      if (hasLng && (lng! < -180 || lng! > 180)) {
        return { valid: false, error: 'Longitude must be between -180 and 180 degrees.' };
      }
      return { valid: true };
    }

    test('valid coordinate pair in Algeria passes', () => {
      expect(validateCoordinates(36.7372, 3.0865).valid).toBe(true);
    });

    test('missing latitude fails', () => {
      const res = validateCoordinates(undefined, 3.0865);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Both latitude and longitude must be provided together.');
    });

    test('missing longitude fails', () => {
      const res = validateCoordinates(36.7372, undefined);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Both latitude and longitude must be provided together.');
    });

    test('latitude out of bounds fails', () => {
      const res = validateCoordinates(95.0, 3.0);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Latitude must be between -90 and 90 degrees.');
    });

    test('longitude out of bounds fails', () => {
      const res = validateCoordinates(36.0, 195.0);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Longitude must be between -180 and 180 degrees.');
    });
  });

  // ── 10. Photo upload total limit check ───────────────────────────────────────
  describe('photo upload total limit', () => {
    const MAX_PHOTOS = 5;

    function canAddPhotos(existingCount: number, newFilesCount: number): boolean {
      return existingCount + newFilesCount <= MAX_PHOTOS;
    }

    test('uploading 2 photos when 2 exist is valid (total 4 <= 5)', () => {
      expect(canAddPhotos(2, 2)).toBe(true);
    });

    test('uploading 4 photos when 2 exist is rejected (total 6 > 5)', () => {
      expect(canAddPhotos(2, 4)).toBe(false);
    });

    test('uploading 1 photo when 5 already exist is rejected', () => {
      expect(canAddPhotos(5, 1)).toBe(false);
    });
  });

  // ── 11. Haversine distance ───────────────────────────────────────────────────
  describe('haversine distance calculation', () => {
    function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat  = toRad(lat2 - lat1);
      const dLng  = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    test('same point = 0 km', () => {
      expect(haversineKm(36.73, 3.08, 36.73, 3.08)).toBeCloseTo(0, 1);
    });

    test('Alger to Oran ≈ 350km', () => {
      const dist = haversineKm(36.73, 3.08, 35.69, -0.63);
      expect(dist).toBeGreaterThan(300);
      expect(dist).toBeLessThan(400);
    });

    test('offer within 5km radius is included', () => {
      const userLat = 36.7372, userLng = 3.0865;
      const shopLat = 36.7400, shopLng = 3.0900;
      expect(haversineKm(userLat, userLng, shopLat, shopLng)).toBeLessThan(5);
    });

    test('offer beyond 5km radius is excluded', () => {
      const userLat = 36.7372, userLng = 3.0865;
      const shopLat = 36.8000, shopLng = 3.2000;
      expect(haversineKm(userLat, userLng, shopLat, shopLng)).toBeGreaterThan(5);
    });
  });

  // ── 12. Pagination ───────────────────────────────────────────────────────────
  describe('pagination', () => {
    function parsePagination(query: Record<string, unknown>) {
      const page  = Math.max(1, parseInt(String(query.page  ?? '1'), 10));
      const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10)));
      return { page, limit };
    }

    test('defaults to page 1, limit 20', () => {
      expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
    });

    test('clamps limit to max 100', () => {
      expect(parsePagination({ limit: '999' })).toEqual({ page: 1, limit: 100 });
    });

    test('clamps page minimum to 1', () => {
      expect(parsePagination({ page: '-5' })).toEqual({ page: 1, limit: 20 });
    });
  });
});
