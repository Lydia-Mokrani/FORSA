// frontend/src/features/reservations/services/reservationsApi.ts
// API layer for MS3 reservations — native fetch, strictly aligned with backend MS3
import type { Reservation, ReservationsApiResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3003';

/** Retrieve the JWT token from localStorage (same convention as auth & catalogue API). */
function getToken(): string | null {
  return localStorage.getItem('token');
}

/** Normalise backend response: may wrap in { items }, { data }, or return a bare array. */
function extractArray(json: unknown): Reservation[] {
  if (Array.isArray(json)) return json as Reservation[];
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as Reservation[];
    if (Array.isArray(obj.data)) return obj.data as Reservation[];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Mock data — available for testing/demo when requested via query param ?demo=mock
// ---------------------------------------------------------------------------
export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'res-1',
    customerId: 'cust-1',
    customerEmail: 'client@forsa.dz',
    shopId: 'shop-1',
    offerId: 'offer-1',
    offerTitle: 'Pain complet',
    shopName: 'La Boulangerie',
    shopDistance: 'Bab Ezzouar',
    quantity: 2,
    totalPrice: '360.00',
    status: 'ACCEPTED',
    pickupCode: 'FRS-7K29',
    qrCodeData: null,
    pickupStart: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    pickupEnd: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    acceptedAt: new Date().toISOString(),
    refusedAt: null,
    cancelledAt: null,
    pickedUpAt: null,
    expiredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-2',
    customerId: 'cust-1',
    customerEmail: 'client@forsa.dz',
    shopId: 'shop-2',
    offerId: 'offer-2',
    offerTitle: 'Part de gâteau au chocolat',
    shopName: 'Pâtisserie Nour',
    shopDistance: '350 m',
    quantity: 1,
    totalPrice: '180.00',
    status: 'ACCEPTED',
    pickupCode: 'FRS-9M41',
    qrCodeData: null,
    pickupStart: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    pickupEnd: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    acceptedAt: new Date().toISOString(),
    refusedAt: null,
    cancelledAt: null,
    pickedUpAt: null,
    expiredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'res-3',
    customerId: 'cust-1',
    customerEmail: 'client@forsa.dz',
    shopId: 'shop-3',
    offerId: 'offer-3',
    offerTitle: 'Le panier laitier',
    shopName: 'Laiterie Atlas',
    shopDistance: '650 m',
    quantity: 1,
    totalPrice: '100.00',
    status: 'PICKED_UP',
    pickupCode: 'FRS-3L88',
    qrCodeData: null,
    pickupStart: new Date('2026-10-29T14:00:00').toISOString(),
    pickupEnd: new Date('2026-10-29T18:00:00').toISOString(),
    acceptedAt: new Date('2026-10-29T10:00:00').toISOString(),
    refusedAt: null,
    cancelledAt: null,
    pickedUpAt: new Date('2026-10-29T15:30:00').toISOString(),
    expiredAt: null,
    createdAt: new Date('2026-10-29T08:00:00').toISOString(),
    updatedAt: new Date('2026-10-29T15:30:00').toISOString(),
  },
  {
    id: 'res-4',
    customerId: 'cust-1',
    customerEmail: 'client@forsa.dz',
    shopId: 'shop-4',
    offerId: 'offer-4',
    offerTitle: 'Farine',
    shopName: 'Épicerie El Baraka',
    shopDistance: '500 m',
    quantity: 1,
    totalPrice: '60.00',
    status: 'CANCELLED',
    pickupCode: 'FRS-5P12',
    qrCodeData: null,
    pickupStart: new Date('2026-10-28T10:00:00').toISOString(),
    pickupEnd: new Date('2026-10-28T14:00:00').toISOString(),
    acceptedAt: null,
    refusedAt: null,
    cancelledAt: new Date('2026-10-28T09:00:00').toISOString(),
    pickedUpAt: null,
    expiredAt: null,
    createdAt: new Date('2026-10-28T07:00:00').toISOString(),
    updatedAt: new Date('2026-10-28T09:00:00').toISOString(),
  },
];

export const MOCK_EXPIRED_RESERVATIONS: Reservation[] = [
  {
    id: 'res-expired-1',
    customerId: 'cust-1',
    customerEmail: 'client@forsa.dz',
    shopId: 'shop-1',
    offerId: 'offer-1',
    offerTitle: 'Pain complet',
    shopName: 'La Boulangerie',
    shopDistance: 'Bab Ezzouar',
    quantity: 2,
    totalPrice: '360.00',
    status: 'EXPIRED',
    pickupCode: 'FRS-1X99',
    qrCodeData: null,
    pickupStart: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    pickupEnd: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    acceptedAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    refusedAt: null,
    cancelledAt: null,
    pickedUpAt: null,
    expiredAt: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    createdAt: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  ...MOCK_RESERVATIONS.slice(1),
];

let IN_MEMORY_MOCKS: Reservation[] = [...MOCK_RESERVATIONS];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const ReservationsApi = {
  /**
   * GET /api/reservations/mine
   * Queries the MS3 backend. If the backend responds with a real list (even []),
   * that list is returned. If the fetch fails, returns an error metadata so that
   * the UI can display the Figma error state.
   */
  async getMyReservationsDetailed(): Promise<ReservationsApiResponse> {
    // Check URL parameters for explicit demo preview
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const demo = params.get('demo') || params.get('state');
      if (demo === 'empty') {
        return { data: [], isFallback: false };
      }
      if (demo === 'expired') {
        return { data: [...MOCK_EXPIRED_RESERVATIONS], isFallback: true };
      }
      if (demo === 'mock') {
        return { data: [...IN_MEMORY_MOCKS], isFallback: true };
      }
      if (demo === 'error') {
        return { data: [], isFallback: false, error: 'Impossible de charger vos réservations' };
      }
    }

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/reservations/mine`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Erreur serveur MS3 (${res.status})`);
      }

      const json = await res.json();
      const list = extractArray(json);
      const enrichedList = list.map((item) => {
        const found = IN_MEMORY_MOCKS.find((m) => m.id === item.id);
        return {
          ...item,
          offerTitle: item.offerTitle || found?.offerTitle,
          shopName: item.shopName || found?.shopName,
          shopDistance: item.shopDistance || found?.shopDistance || 'Bab Ezzouar · 350 m',
        };
      });
      return { data: enrichedList, isFallback: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connexion impossible au back-end';
      console.warn('[MS3 ReservationsApi] Échec de la récupération des réservations :', message);
      // Return error with empty data so ReservationList displays the Figma error state
      return { data: [], isFallback: false, error: message };
    }
  },

  /** GET /api/reservations/mine — returns list directly */
  async getMyReservations(): Promise<Reservation[]> {
    const res = await this.getMyReservationsDetailed();
    return res.data;
  },

  /**
   * POST /api/reservations/:id/cancel
   * Calls the MS3 endpoint to cancel a PENDING or ACCEPTED reservation.
   * Returns isForbidden: true if HTTP 403 occurs (already picked up or expired).
   */
  async cancelReservation(id: string): Promise<{ success: boolean; error?: string; isForbidden?: boolean }> {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/reservations/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg =
          (errJson as { error?: { message?: string }; message?: string })?.error?.message ||
          (errJson as { message?: string })?.message ||
          (res.status === 403
            ? 'Cette réservation ne peut plus être annulée.'
            : `Échec de l'annulation (HTTP ${res.status})`);
        return { success: false, error: msg, isForbidden: res.status === 403 };
      }

      // Update in-memory mock if present
      IN_MEMORY_MOCKS = IN_MEMORY_MOCKS.map((r) =>
        r.id === id ? { ...r, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : r
      );

      return { success: true };
    } catch (err: unknown) {
      // If mock reservation exists, simulate cancel
      const isMock = IN_MEMORY_MOCKS.some((r) => r.id === id);
      if (isMock) {
        IN_MEMORY_MOCKS = IN_MEMORY_MOCKS.map((r) =>
          r.id === id ? { ...r, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : r
        );
        return { success: true };
      }
      const msg = err instanceof Error ? err.message : "Erreur lors de l'annulation";
      return { success: false, error: msg };
    }
  },

  /**
   * POST /api/reservations
   * Calls the MS3 endpoint to create a reservation.
   * Body: { shopId, offerId, quantity, unitPrice }
   */
  async createReservation(params: {
    shopId: string;
    offerId: string;
    quantity: number;
    unitPrice?: number;
    offerTitle?: string;
    shopName?: string;
    shopAddress?: string;
    shopDistance?: string;
    pickupStart?: string;
    pickupEnd?: string;
  }): Promise<{ success: boolean; data?: Reservation; error?: string }> {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          shopId: params.shopId,
          offerId: params.offerId,
          quantity: params.quantity,
          unitPrice: params.unitPrice,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg =
          (errJson as { error?: { message?: string }; message?: string })?.error?.message ||
          (errJson as { message?: string })?.message ||
          `Échec de la réservation (${res.status})`;
        return { success: false, error: msg };
      }

      const created = (await res.json()) as Reservation;
      const enriched: Reservation = {
        ...created,
        offerTitle: created.offerTitle || params.offerTitle || 'Panier Surprise Viennoiseries & Pains',
        shopName: created.shopName || params.shopName || 'Le Moulin Doré',
        shopAddress: params.shopAddress,
        shopDistance: created.shopDistance || params.shopDistance || 'Bab Ezzouar · 350 m',
        pickupStart: created.pickupStart || params.pickupStart || new Date().toISOString(),
        pickupEnd: created.pickupEnd || params.pickupEnd || new Date(Date.now() + 4 * 3600000).toISOString(),
      };
      IN_MEMORY_MOCKS.unshift(enriched);
      return { success: true, data: enriched };
    } catch {
      // Offline fallback: simulate creation in in-memory list
      const newMock: Reservation = {
        id: `res-${Date.now()}`,
        customerId: 'cust-1',
        customerEmail: 'client@forsa.dz',
        shopId: params.shopId,
        offerId: params.offerId,
        offerTitle: params.offerTitle || 'Panier Surprise Viennoiseries & Pains',
        shopName: params.shopName || 'Le Moulin Doré',
        shopAddress: params.shopAddress,
        shopDistance: params.shopDistance || 'Bab Ezzouar · 350 m',
        quantity: params.quantity,
        totalPrice: `${((params.unitPrice || 450) * params.quantity).toFixed(2)}`,
        status: 'PENDING',
        pickupCode: `FRS-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        qrCodeData: null,
        pickupStart: params.pickupStart || new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
        pickupEnd: params.pickupEnd || new Date(new Date().setHours(19, 30, 0, 0)).toISOString(),
        acceptedAt: null,
        refusedAt: null,
        cancelledAt: null,
        pickedUpAt: null,
        expiredAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      IN_MEMORY_MOCKS.unshift(newMock);
      return { success: true, data: newMock };
    }
  },
};
