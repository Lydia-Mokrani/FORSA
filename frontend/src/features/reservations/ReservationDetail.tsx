import React, { useEffect, useState } from 'react';
import { ReservationsApi } from './services/reservationsApi';
import { CancelReservationModal } from './CancelReservationModal';
import type { Reservation } from './types';

interface ReservationDetailProps {
  reservationId: string;
  onBack: () => void;
  previewReservation?: Reservation | null;
}

function formatPickupWindow(reservation: Reservation): string {
  try {
    const start = new Date(reservation.pickupStart).toLocaleString('fr-FR');
    const end = new Date(reservation.pickupEnd).toLocaleString('fr-FR');
    return `${start} – ${end}`;
  } catch {
    return `${reservation.pickupStart} – ${reservation.pickupEnd}`;
  }
}

export const ReservationDetail: React.FC<ReservationDetailProps> = ({ reservationId, onBack, previewReservation }) => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (previewReservation) {
          setReservation(previewReservation);
        } else {
          setReservation(await ReservationsApi.getReservationById(reservationId));
        }
      } catch (e: any) {
        setError(e.message || 'Error loading reservation');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reservationId, previewReservation]);

  if (loading) return <p className="text-center">Chargement...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!reservation) return <p>Aucune donnée.</p>;

  const canCancel = reservation.status === 'PENDING' || reservation.status === 'ACCEPTED';

  return (
    <div>
      <h2 className="font-poppins font-medium text-lg mb-4">Détails de la réservation</h2>

      {reservation.offerTitle && <p>{reservation.offerTitle}</p>}
      {reservation.pickupCode && <p>Code de retrait : {reservation.pickupCode}</p>}
      {reservation.qrCodeData && (
        <img
          src={reservation.qrCodeData}
          alt={`QR ${reservation.pickupCode}`}
          className="mt-2 size-[132px] object-contain"
        />
      )}
      {(reservation.shopName || reservation.shopAddress) && (
        <p>
          {reservation.shopName}
          {reservation.shopName && reservation.shopAddress ? ' · ' : ''}
          {reservation.shopAddress}
        </p>
      )}
      <p>Créneau de retrait : {formatPickupWindow(reservation)}</p>
      <p>Total : {reservation.totalPrice} DA</p>

      <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(reservation, null, 2)}</pre>

      {canCancel && (
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="mt-4 h-[42px] px-[16px] rounded-[12px] border border-[#78847f] text-[#0b2c25]"
        >
          Annuler avant le retrait
        </button>
      )}

      <button className="mt-4 px-4 py-2 bg-gray-300 rounded" onClick={onBack}>Retour</button>

      <CancelReservationModal
        isOpen={cancelling}
        reservation={reservation}
        onClose={() => setCancelling(false)}
        onSuccess={(id) => {
          setReservation((prev) =>
            prev && prev.id === id
              ? { ...prev, status: 'CANCELLED', cancelledAt: new Date().toISOString() }
              : prev
          );
          setCancelling(false);
        }}
        onForbidden={(res, reason) => {
          setCancelling(false);
          setError(reason || 'Cette réservation ne peut plus être annulée.');
        }}
        previewMode={Boolean(previewReservation)}
      />
    </div>
  );
};
