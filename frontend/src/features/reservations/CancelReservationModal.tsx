import React, { useState, useEffect } from 'react';
import type { Reservation } from './types';
import { ReservationsApi } from './services/reservationsApi';

interface CancelReservationModalProps {
  isOpen: boolean;
  reservation: Reservation | null;
  productName?: string;
  shopName?: string;
  onClose: () => void;
  onSuccess: (cancelledReservationId: string) => void;
  onForbidden?: (reservation: Reservation, reason?: string) => void;
}

export const CancelReservationModal: React.FC<CancelReservationModalProps> = ({
  isOpen,
  reservation,
  productName,
  shopName,
  onClose,
  onSuccess,
  onForbidden,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setLoading(false);
    setError(null);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading]);

  if (!isOpen || !reservation) return null;

  const displayProductName =
    productName ||
    reservation.offerTitle ||
    (reservation.id === 'res-1'
      ? 'Pain complet'
      : reservation.id === 'res-2'
      ? 'Part de gâteau au chocolat'
      : reservation.id === 'res-3'
      ? 'Le panier laitier'
      : reservation.id === 'res-4'
      ? 'Farine'
      : `Réservation #${reservation.id.slice(0, 6)}`);

  const displayShopName =
    shopName ||
    reservation.shopName ||
    (reservation.id === 'res-1'
      ? 'La Boulangerie'
      : reservation.id === 'res-2'
      ? 'Pâtisserie Nour'
      : reservation.id === 'res-3'
      ? 'Laiterie Atlas'
      : reservation.id === 'res-4'
      ? 'Épicerie El Baraka'
      : 'Commerce partenaire');

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    const result = await ReservationsApi.cancelReservation(reservation.id);

    if (result.success) {
      setLoading(false);
      onSuccess(reservation.id);
      onClose();
    } else {
      setLoading(false);
      if (result.isForbidden && onForbidden) {
        onClose();
        onForbidden(reservation, result.error);
      } else {
        setError(result.error || "Une erreur est survenue lors de l'annulation.");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(11,44,37,0.55)] backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={loading ? undefined : handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div
        className="w-full max-w-[500px] flex flex-col items-center gap-[16px] pt-[36px] px-[36px] pb-[32px] bg-[#FFFAF0] rounded-[28px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.25)] border border-[#DBF0DD] font-poppins transition-transform transform scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pastille icône - Figma: 72x72, borderRadius: 36px, bg: #F7DCD8 */}
        <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[#F7DCD8] shrink-0">
          <svg
            width="32"
            height="32"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#B13B3B]"
          >
            <path
              d="M15.8327 4.16602L4.16602 15.8327M4.16602 4.16602L15.8327 15.8327"
              stroke="#B13B3B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Titre - Figma: 22px SemiBold #0B2C25 */}
        <h2
          id="cancel-modal-title"
          className="font-poppins font-semibold text-[22px] leading-[1.3] text-[#0B2C25] text-center w-full"
        >
          Annuler cette réservation ?
        </h2>

        {/* Description - Figma: 14px Regular rgba(11, 44, 37, 0.7) */}
        <p className="font-poppins font-normal text-[14px] leading-[1.5] text-[rgba(11,44,37,0.7)] text-center w-full">
          « {displayProductName} » · {displayShopName}. Le stock sera remis à disposition et aucun
          montant n’est dû.
        </p>

        {/* Error message banner if backend returned a non-forbidden error */}
        {error && (
          <div className="w-full p-3 rounded-[12px] bg-[#FBE4E1] border border-[#A3362B]/20 text-[#A3362B] text-[12px] text-center">
            {error}
          </div>
        )}

        {/* Actions - Figma: mode row, gap 12px, height 46px each, borderRadius 12px */}
        <div className="flex w-full gap-[12px] pt-[8px]">
          {/* Bouton Garder ma réservation - Figma: border 1px rgba(11, 44, 37, 0.4), text rgba(11, 44, 37, 0.75), 13px SemiBold */}
          <button
            type="button"
            disabled={loading}
            onClick={handleClose}
            className="flex-1 flex items-center justify-center h-[46px] px-[18px] rounded-[12px] border border-[rgba(11,44,37,0.4)] font-poppins font-semibold text-[13px] text-[rgba(11,44,37,0.75)] hover:bg-black/5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            Garder ma réservation
          </button>

          {/* Bouton Oui, annuler - Figma: bg #B13B3B, text #FFFFFF, 13px SemiBold */}
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center h-[46px] px-[18px] rounded-[12px] bg-[#B13B3B] font-poppins font-semibold text-[13px] text-white hover:bg-[#962f2f] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Oui, annuler'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelReservationModal;
