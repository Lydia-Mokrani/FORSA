import React from 'react';
import type { Reservation } from './types';
import IconClock from './assets/icons/Icône clock-01.svg';


interface ExpiredBannerProps {
  reservation?: Reservation;
  onExploreOffers?: () => void;
}

/**
 * Bannière Réservation expirée
 * Figma spec: node #994:17552 ("Bannière Réservation expirée")
 * Background: #FCF3D6, Border: 1px solid #EED686, Radius: 16px
 * Pastille icône: 44x44, white, clock-01
 * Titre: 16px SemiBold #0B2C25
 * Description: 14px Regular rgba(11, 44, 37, 0.75)
 * Bouton: 40px height, #0B2C25, "Explorer les offres"
 */
export const ExpiredBanner: React.FC<ExpiredBannerProps> = ({
  reservation,
  onExploreOffers,
}) => {
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
            : 'Pain complet');

  const formattedHour = (() => {
    if (!reservation?.pickupEnd) return '20:00';
    try {
      const d = new Date(reservation.pickupEnd);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '20:00';
    }
  })();

  const handleExplore = () => {
    if (onExploreOffers) {
      onExploreOffers();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/explore';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] pl-[18px] pr-[20px] py-[16px] bg-[#FCF3D6] border border-[#EED686] rounded-[16px]">
      <div className="flex items-center gap-[16px] flex-1 min-w-0">
        <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-white shrink-0">
          <img
            src={IconClock}
            alt=""
            className="w-[22px] h-[22px]"
            style={{
              filter:
                'invert(48%) sepia(82%) saturate(460%) hue-rotate(5deg) brightness(92%) contrast(98%)',
            }}
          />
        </div>

        <div className="flex flex-col gap-[3px] min-w-0 flex-1">
          <span className="font-poppins font-semibold text-[16px] text-[#0B2C25] leading-normal">
            Réservation expirée
          </span>
          <p className="font-poppins font-normal text-[13px] text-[rgba(11,44,37,0.75)] leading-normal">
            Vous n’avez pas retiré « {productName} » avant {formattedHour}. Le stock a été remis en vente,
            aucun montant n’est dû.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleExplore}
        className="flex items-center justify-center h-[46px] px-[18px] bg-[#0B2C25] text-white rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
      >
        Explorer les offres
      </button>
    </div>
  );
};

export default ExpiredBanner;
