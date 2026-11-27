import React from 'react';
import type { Reservation } from './types';

interface ReservationSuccessProps {
  onBack: () => void;
  reservation?: Reservation | null;
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

export const ReservationSuccess: React.FC<ReservationSuccessProps> = ({ onBack, reservation }) => {
  return (
    <div className="text-center">
      <h2 className="font-poppins font-medium text-lg mb-4">Réservation créée avec succès</h2>
      <p>Votre réservation a été enregistrée.</p>

      {reservation && (
        <div className="mt-4">
          {reservation.offerTitle && <p>{reservation.offerTitle}</p>}
          {reservation.pickupCode && <p>Code de retrait : {reservation.pickupCode}</p>}
          {reservation.qrCodeData && (
            <img
              src={reservation.qrCodeData}
              alt={`QR ${reservation.pickupCode}`}
              className="mx-auto mt-2 size-[132px] object-contain"
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
        </div>
      )}

      <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Retour à la liste
      </button>
    </div>
  );
};
