// tests/unit/offerBusinessRules.test.ts
// Tests for offer business rules — no database required

describe('Offer business rules', () => {

  // ── Discount calculation ────────────────────────────────────────────────────
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

  // ── Price validation ────────────────────────────────────────────────────────
  describe('price validation rule', () => {
    function isPriceValid(original: number, discounted: number): boolean {
      return discounted < original;
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
  });

  // ── Haversine distance ──────────────────────────────────────────────────────
  describe('haversine distance calculation', () => {
    // Import manually to avoid env load
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
      // Alger: 36.73N, 3.08E  |  Oran: 35.69N, -0.63E
      const dist = haversineKm(36.73, 3.08, 35.69, -0.63);
      expect(dist).toBeGreaterThan(300);
      expect(dist).toBeLessThan(400);
    });

    test('offer within 5km radius is included', () => {
      const userLat = 36.7372, userLng = 3.0865;
      const shopLat = 36.7400, shopLng = 3.0900; // ~400m away
      expect(haversineKm(userLat, userLng, shopLat, shopLng)).toBeLessThan(5);
    });

    test('offer beyond 5km radius is excluded', () => {
      const userLat = 36.7372, userLng = 3.0865;
      const shopLat = 36.8000, shopLng = 3.2000; // ~15km away
      expect(haversineKm(userLat, userLng, shopLat, shopLng)).toBeGreaterThan(5);
    });
  });

  // ── Pagination ──────────────────────────────────────────────────────────────
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
