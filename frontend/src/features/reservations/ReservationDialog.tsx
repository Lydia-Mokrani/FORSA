import React, { useState, useEffect } from 'react';
import type { Reservation } from './types';
import { ReservationsApi } from './services/reservationsApi';
import IconTick from './assets/icons/Icône tick-02.svg';
import IconClock from './assets/icons/Icône clock-01.svg';
import IconLocation from './assets/icons/location-05.svg';
import IconStar from './assets/icons/Icône star.svg';
import IconHandBag from './assets/icons/Icône hand-bag-01.svg';
import IconQrCode from './assets/icons/Icône qr-code.svg';

export interface OfferDetail {
  id: string;
  name: string;
  categoryName?: string;
  photoUrl?: string;
  discountedPrice: number;
  originalPrice?: number;
  quantityAvailable: number;
  description?: string;
  pickupStart?: string;
  pickupEnd?: string;
  shopId: string;
  shopName: string;
  shopAddress?: string;
  shopDistance?: string;
  shopRating?: number;
  shopReviewCount?: number;
}

interface ReservationDialogProps {
  isOpen: boolean;
  offer: OfferDetail | null;
  onClose: () => void;
  onSuccess?: (reservation: Reservation) => void;
  onReservationCreated?: (reservation: Reservation) => void;
  onViewReceipt?: (reservation: Reservation) => void;
  onNavigateToReservations?: () => void;
}

/**
 * Dialog de réservation / Popup Détails de l'offre
 * Figma spec : Desktop node #717:14855, Mobile node #717:13896
 * Inclut :
 * - Choix de quantité interactif [- 1 +]
 * - Confirmation de réservation vers le backend MS3 (POST /api/reservations)
 * - État de succès « Ajouté au panier » / « Réservation confirmée »
 * - Redirection directe vers « Mes réservations »
 */
export const ReservationDialog: React.FC<ReservationDialogProps> = ({
  isOpen,
  offer,
  onClose,
  onSuccess,
  onReservationCreated,
  onViewReceipt,
  onNavigateToReservations,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  // Reset when dialog opens with a new offer
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setLoading(false);
      setError(null);
      setIsSuccess(false);
      setCreatedReservation(null);
    }
  }, [isOpen, offer]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !offer) return null;

  const maxQuantity = Math.max(1, offer.quantityAvailable || 1);

  const handleDecrease = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const handleIncrease = () => {
    setQuantity((q) => Math.min(maxQuantity, q + 1));
  };

  const totalPrice = offer.discountedPrice * quantity;
  const originalTotalPrice = (offer.originalPrice || offer.discountedPrice * 2) * quantity;
  const savings = Math.max(0, originalTotalPrice - totalPrice);
  const discountPercent =
    offer.originalPrice && offer.originalPrice > offer.discountedPrice
      ? Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100)
      : 50;

  const handleReserve = async () => {
    setLoading(true);
    setError(null);

    const result = await ReservationsApi.createReservation({
      shopId: offer.shopId,
      offerId: offer.id,
      quantity,
      unitPrice: offer.discountedPrice,
      offerTitle: offer.name,
      shopName: offer.shopName,
      shopAddress: offer.shopAddress,
      shopDistance: offer.shopDistance,
      pickupStart: offer.pickupStart,
      pickupEnd: offer.pickupEnd,
    });

    if (result.success && result.data) {
      setLoading(false);
      setIsSuccess(true);
      setCreatedReservation(result.data);
      if (onReservationCreated) {
        onReservationCreated(result.data);
      }
    } else {
      setLoading(false);
      setError(result.error || 'Erreur lors de la réservation.');
    }
  };

  const handleGoToReservations = () => {
    onClose();
    if (onNavigateToReservations) {
      onNavigateToReservations();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/my-reservations';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-[11.5px] overflow-y-auto animate-in fade-in duration-200"
      onClick={loading ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Conteneur Popup : 1000px x 760px sur Desktop (Figma #717:14967) */}
      <div
        className="relative w-full max-w-[1000px] max-h-[92vh] flex flex-col md:flex-row bg-[#FFFAF0] rounded-[24px] sm:rounded-[28px] shadow-[0px_24px_64px_0px_rgba(11,44,37,0.3)] border border-[#DBF0DD] font-poppins overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton Fermer (Figma #717:15104 : 40x40 ronde, blanc, top: 20px, right: 20px) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#0B2C25]/10 shadow-[0px_4px_16px_rgba(11,44,37,0.12)] text-[#0B2C25] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
          aria-label="Fermer"
        >
          ✕
        </button>

        {/* ============================================================
            COLONNE GAUCHE : Galerie photo (400px sur Desktop)
            Figma spec : node #717:14968 (Galerie photo 400x760px)
            ============================================================ */}
        <div className="relative w-full md:w-[400px] h-[220px] sm:h-[280px] md:h-auto shrink-0 bg-[#E5EBE7] overflow-hidden">
          {offer.photoUrl ? (
            <img
              src={offer.photoUrl}
              alt={offer.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#E2ECE5] to-[#C7DED0] p-6 text-center">
              <span className="text-4xl mb-2">🥖</span>
              <span className="font-semibold text-[15px] text-[#0B2C25]">Photo de l’offre</span>
              <span className="text-[12px] text-[#0B2C25]/70">{offer.name}</span>
            </div>
          )}

          {/* Badge Quantité restante (Figma #717:14970) */}
          <div className="absolute top-4 left-4 flex items-center px-3.5 py-1.5 rounded-full bg-[#0B2C25] text-[#FFFAF0] text-[12px] font-semibold shadow-xs">
            {offer.quantityAvailable} restant{offer.quantityAvailable > 1 ? 's' : ''}
          </div>

          {/* Indicateur de position galerie (Figma #717:14972) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center px-3 py-1 rounded-full bg-[#0B2C25]/80 backdrop-blur-xs text-[#FFFAF0] text-[11px] font-medium">
            1 / 1
          </div>
        </div>

        {/* ============================================================
            COLONNE DROITE : Détails & Actions de réservation (600px)
            Figma spec : node #717:14974 (Colonne détails)
            ============================================================ */}
        <div className="flex-1 flex flex-col min-w-0 max-h-[calc(92vh-220px)] md:max-h-[760px] overflow-hidden">
          {/* Zone défilante des détails de l'offre (Figma #717:14975) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col gap-4">
            {/* Tag catégorie & Localisation (Figma #717:14977) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-[#DBF0DD] text-[#17664E] font-medium text-[11px]">
                {offer.categoryName || 'Boulangerie & Pâtisserie'}
              </span>
              <span className="text-[12px] text-[rgba(11,44,37,0.7)]">
                {offer.shopAddress || offer.shopDistance || 'Bab Ezzouar · 100 m'}
              </span>
            </div>

            {/* Titre de l'offre (Figma #717:14981) */}
            <h2 className="font-poppins font-semibold text-[22px] sm:text-[28px] text-[#0B2C25] leading-snug">
              {offer.name}
            </h2>

            {/* Ligne des Prix & Économies (Figma #717:14982) */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-poppins font-semibold text-[28px] sm:text-[32px] text-[#17664E]">
                {offer.discountedPrice} DA
              </span>
              {offer.originalPrice && (
                <span className="text-[16px] text-[rgba(11,44,37,0.6)] line-through">
                  {offer.originalPrice} DA
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-[#EDBD4D] text-[#0B2C25] font-semibold text-[13px]">
                -{discountPercent}%
              </span>
              {savings > 0 && (
                <span className="text-[12px] font-semibold text-[#17664E] ml-auto">
                  Vous économisez {savings} DA
                </span>
              )}
            </div>

            {/* Description (Figma #717:14989) */}
            <p className="text-[13.5px] text-[rgba(11,44,37,0.75)] leading-relaxed">
              {offer.description ||
                'Produits artisanaux frais préparés aujourd’hui. Un geste gourmand sauvé du gaspillage, à moitié prix.'}
            </p>

            {/* Créneau de retrait (Figma #717:14990) */}
            <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-[14px] bg-[#DBF0DD]">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#17664E] text-white shrink-0">
                <img src={IconClock} alt="" className="w-5 h-5 filter brightness-0 invert" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-[#17664E]">À récupérer aujourd’hui</span>
                <span className="font-poppins font-semibold text-[16px] sm:text-[18px] text-[#0B2C25]">
                  {offer.pickupStart && offer.pickupEnd
                    ? `${offer.pickupStart.slice(11, 16)} – ${offer.pickupEnd.slice(11, 16)}`
                    : '13:00 – 13:45'}
                </span>
              </div>
            </div>

            {/* Carte commerçant (Figma #717:14996) */}
            <div className="flex items-center justify-between p-3.5 rounded-[14px] bg-white border border-[#0B2C25]/10 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-[10px] bg-[#EEF7EC] text-[#17664E] font-bold text-sm shrink-0">
                  🏪
                </div>
                <div className="flex flex-col">
                  <span className="font-poppins font-semibold text-[14px] text-[#0B2C25] uppercase tracking-wide">
                    {offer.shopName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[rgba(11,44,37,0.7)]">
                    <img src={IconStar} alt="" className="w-3 h-3" />
                    <span>{offer.shopRating || '4.8'}</span>
                    <span>· {offer.shopReviewCount || '63'} avis</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Adresse de retrait (Figma #717:15009) */}
            <div className="flex items-center gap-3 p-3.5 rounded-[14px] bg-white border border-[#0B2C25]/10 shadow-xs">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#EEF7EC] shrink-0">
                <img src={IconLocation} alt="" className="w-4 h-4" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-poppins font-semibold text-[13px] text-[#0B2C25] truncate">
                  {offer.shopAddress || 'Bab Ezzouar · Quartier des affaires'}
                </span>
                <span className="text-[11px] text-[rgba(11,44,37,0.7)]">
                  {offer.shopDistance || '100 m'}
                </span>
              </div>
            </div>

            {/* Rappel sac (Figma #717:15081) */}
            <div className="flex items-center gap-3 p-3.5 rounded-[14px] bg-[#DBF0DD]">
              <img src={IconHandBag} alt="" className="w-5 h-5 shrink-0" />
              <p className="text-[11px] text-[#17664E] leading-relaxed">
                Apportez votre sac ou cabas pour le retrait. Ensemble, limitons nos déchets !
              </p>
            </div>
          </div>

          {/* ============================================================
              PIED DE POPUP FIXE (Figma #717:15090)
              Deux états : Choix de quantité / Ajouté au panier (Succès)
              ============================================================ */}
          <div className="p-4 sm:p-[16px_28px_22px] bg-[#FFFAF0] border-t border-[#0B2C25]/10 flex flex-col gap-2.5 shrink-0">
            {error && (
              <div className="w-full p-2.5 rounded-[10px] bg-[#FBE4E1] border border-[#A3362B]/20 text-[#A3362B] text-[12px] text-center">
                {error}
              </div>
            )}

            {/* ÉTAT 2 : SUCCÈS « AJOUTÉ AU PANIER » (Figma #717:14855 & #717:13896) */}
            {isSuccess ? (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                {/* Confirmation d'ajout verte */}
                <div className="flex items-center gap-3 p-3.5 rounded-[14px] bg-[#DBF0DD]">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#17664E] text-white shrink-0">
                    <img src={IconTick} alt="" className="w-4 h-4 filter brightness-0 invert" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-poppins font-semibold text-[13px] text-[#17664E]">
                      Ajouté à votre panier
                    </span>
                    <span className="text-[11px] text-[rgba(11,44,37,0.75)]">
                      {quantity} × {offer.name} · {totalPrice} DA{createdReservation?.pickupCode ? ` · Code: ${createdReservation.pickupCode}` : ''}
                    </span>
                  </div>
                </div>

                {/* Boutons d'action après confirmation */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSuccess && createdReservation) {
                        onSuccess(createdReservation);
                      }
                      onClose();
                    }}
                    className="w-full sm:flex-1 flex items-center justify-center h-[48px] px-4 rounded-[14px] border border-[#0B2C25]/25 bg-white font-poppins font-semibold text-[13px] text-[#0B2C25] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                  >
                    Continuer mes achats
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (createdReservation) {
                        if (onViewReceipt) {
                          onViewReceipt(createdReservation);
                        } else if (onSuccess) {
                          onSuccess(createdReservation);
                        } else {
                          handleGoToReservations();
                        }
                      } else {
                        handleGoToReservations();
                      }
                    }}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2.5 h-[48px] px-4 rounded-[14px] bg-[#0B2C25] text-[#FFFAF0] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <img src={IconQrCode} alt="" className="w-4 h-4 filter brightness-0 invert" />
                    <span>Voir mon justificatif</span>
                    <span className="text-[14px]">→</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ÉTAT 1 : CHOIX DE QUANTITÉ & CONFIRMATION */
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {/* Sélecteur de quantité [- 1 +] (Figma #717:14844: 112x48px) */}
                  <div className="flex items-center justify-between w-[112px] h-[48px] px-3 bg-white border border-[#0B2C25]/15 rounded-[14px] shrink-0">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      disabled={quantity <= 1 || loading}
                      className="w-7 h-7 flex items-center justify-center text-[#0B2C25] font-bold text-lg disabled:opacity-30 cursor-pointer hover:bg-black/5 rounded-md"
                    >
                      −
                    </button>
                    <span className="font-poppins font-semibold text-[15px] text-[#0B2C25]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrease}
                      disabled={quantity >= maxQuantity || loading}
                      className="w-7 h-7 flex items-center justify-center text-[#0B2C25] font-bold text-lg disabled:opacity-30 cursor-pointer hover:bg-black/5 rounded-md"
                    >
                      +
                    </button>
                  </div>

                  {/* Bouton Ajouter au panier / Réserver (Figma #717:14848: h: 48px, #0B2C25) */}
                  <button
                    type="button"
                    disabled={loading || offer.quantityAvailable <= 0}
                    onClick={handleReserve}
                    className="flex-1 flex items-center justify-center gap-2.5 h-[48px] px-5 rounded-[14px] bg-[#0B2C25] text-white font-poppins font-semibold text-[14px] hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Ajouter au panier</span>
                        <span className="font-normal opacity-80">· {totalPrice} DA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Mention paiement sur place (Figma #717:14851) */}
                <p className="text-[11px] text-center text-[rgba(11,44,37,0.7)]">
                  Paiement sur place au retrait · {offer.quantityAvailable} restant{offer.quantityAvailable > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationDialog;
