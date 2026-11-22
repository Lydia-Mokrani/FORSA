import React, { useEffect } from 'react';
import type { Reservation } from './types';
import IconClock from './assets/icons/Icône clock-01.svg';

interface CancelImpossibleModalProps {
  isOpen: boolean;
  reservation?: Reservation | null;
  reason?: string;
  onClose: () => void;
}

/**
 * Modale « Annulation impossible »
 * Figma spec: node #994:18099
 * Width: 500px, padding: 36px 36px 32px, borderRadius: 28px
 * Pastille: 72x72, borderRadius: 36px, bg: rgba(238, 214, 134, 0.5)
 * Titre: 22px SemiBold #0B2C25
 * Description: 14px Regular rgba(11, 44, 37, 0.7)
 * Bouton: 46px height, borderRadius: 12px, bg: #0B2C25, text: #FFFFFF
 */
export const CancelImpossibleModal: React.FC<CancelImpossibleModalProps> = ({
  isOpen,
  reservation,
  reason,
  onClose,
}) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const productName =
    reservation?.offerTitle ||
    (reservation?.id === 'res-1'
      ? 'Pain complet'
      : reservation?.id === 'res-2'
      ? 'Part de gâteau au chocolat'
      : reservation?.id === 'res-3'
      ? 'Le panier laitier'
      : reservation?.id === 'res-4'
      ? 'Farine'
      : 'votre commande');

  // Build descriptive message according to context/status
  const description =
    reason ||
    (reservation?.status === 'PICKED_UP'
      ? `Le ticket « ${productName} » a déjà été scanné par le commerçant. Une réservation retirée ne peut plus être annulée.`
      : reservation?.status === 'EXPIRED'
      ? `Le créneau de retrait pour « ${productName} » est expiré. Une réservation expirée ne peut plus être annulée.`
      : reservation?.status === 'REFUSED'
      ? `Cette réservation a déjà été refusée par le commerçant.`
      : `Le ticket « ${productName} » ne peut plus être annulé selon les règles du commerçant.`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(11,44,37,0.55)] backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-impossible-title"
    >
      <div
        className="w-full max-w-[500px] flex flex-col items-center gap-[16px] pt-[36px] px-[36px] pb-[32px] bg-[#FFFAF0] rounded-[28px] shadow-[0px_16px_40px_0px_rgba(0,0,0,0.25)] border border-[#DBF0DD] font-poppins transition-transform transform scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pastille icône - Figma: 72x72, borderRadius: 36px, bg: rgba(238, 214, 134, 0.5) */}
        <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[rgba(238,214,134,0.5)] shrink-0">
          <img
            src={IconClock}
            alt=""
            className="w-[32px] h-[32px]"
            style={{
              filter:
                'invert(48%) sepia(82%) saturate(460%) hue-rotate(5deg) brightness(92%) contrast(98%)',
            }}
          />
        </div>

        {/* Titre - Figma: 22px SemiBold #0B2C25 */}
        <h2
          id="cancel-impossible-title"
          className="font-poppins font-semibold text-[22px] leading-[1.3] text-[#0B2C25] text-center w-full"
        >
          Annulation impossible
        </h2>

        {/* Description - Figma: 14px Regular rgba(11, 44, 37, 0.7) */}
        <p className="font-poppins font-normal text-[14px] leading-[1.5] text-[rgba(11,44,37,0.7)] text-center w-full">
          {description}
        </p>

        {/* Action: Bouton Compris - Figma: height 46px, borderRadius 12px, bg: #0B2C25, text: #FFFFFF */}
        <div className="w-full pt-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center h-[46px] rounded-[12px] bg-[#0B2C25] text-white font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelImpossibleModal;
