// frontend/src/features/reservations/types.ts
// Reservation domain types for MS3

export type ReservationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REFUSED'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Reservation {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName?: string | null;
  shopId: string;
  offerId: string;

  // Optional display properties enriched by client or joined API
  offerTitle?: string;
  shopName?: string;
  shopDistance?: string;
  shopAddress?: string;

  quantity: number;
  totalPrice: string; // Decimal from backend

  status: ReservationStatus;

  pickupCode: string;
  qrCodeData?: string | null;

  pickupStart: string; // ISO date
  pickupEnd: string;   // ISO date

  acceptedAt?: string | null;
  refusedAt?: string | null;
  cancelledAt?: string | null;
  pickedUpAt?: string | null;
  expiredAt?: string | null;

  refusalReason?: string | null;
  cancelReason?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ReservationsApiResponse {
  data: Reservation[];
  isFallback: boolean;
  error?: string | null;
}
