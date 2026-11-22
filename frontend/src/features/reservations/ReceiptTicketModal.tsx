import React, { useState, useEffect } from 'react';
import type { Reservation } from './types';
import IconTick from './assets/icons/Icône tick-02.svg';
import IconClock from './assets/icons/Icône clock-01.svg';
import IconLocation from './assets/icons/location-05.svg';
import IconMotifQR from './assets/icons/Motif QR.svg';
import IconCancel from './assets/icons/cancel-01.svg';
import IconNavigation from './assets/icons/Navigation icon.svg';

interface ReceiptTicketModalProps {
  isOpen: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onCancel?: (reservation: Reservation) => void;
}

/**
 * Composant Zigzag SVG pour les découpes crantées du ticket thermique
 */
const ZigzagEdge: React.FC<{ inverted?: boolean; className?: string }> = ({ inverted, className = '' }) => (
  <svg
    viewBox="0 0 348 10"
    className={`w-full h-[10px] block text-white fill-current ${className} ${inverted ? 'rotate-180' : ''}`}
    preserveAspectRatio="none"
  >
    <path d="M0 0 L6 10 L12 0 L18 10 L24 0 L30 10 L36 0 L42 10 L48 0 L54 10 L60 0 L66 10 L72 0 L78 10 L84 0 L90 10 L96 0 L102 10 L108 0 L114 10 L120 0 L126 10 L132 0 L138 10 L144 0 L150 10 L156 0 L162 10 L168 0 L174 10 L180 0 L186 10 L192 0 L198 10 L204 0 L210 10 L216 0 L222 10 L228 0 L234 10 L240 0 L246 10 L252 0 L258 10 L264 0 L270 10 L276 0 L282 10 L288 0 L294 10 L300 0 L306 10 L312 0 L318 10 L324 0 L330 10 L336 0 L342 10 L348 0 L348 10 L0 10 Z" />
  </svg>
);

/**
 * Ticket de caisse imprimante thermique avec animation de sortie progressive
 * Référence Figma : node #838:30359 ("Desktop · Réservations — Justificatif de retraitCOPI")
 */
export const ReceiptTicketModal: React.FC<ReceiptTicketModalProps> = ({
  isOpen,
  reservation,
  onClose,
  onCancel,
}) => {
  const [isPrinting, setIsPrinting] = useState(true);
  const [showTicket, setShowTicket] = useState(false);

  // Trigger smooth progressive printing animation on open
  useEffect(() => {
    if (!isOpen) {
      setIsPrinting(true);
      setShowTicket(false);
      return;
    }

    setIsPrinting(true);
    setShowTicket(false);
    const timer = setTimeout(() => {
      setIsPrinting(false);
      // after printing ends, start slide animation
      setTimeout(() => setShowTicket(true), 100);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isOpen]);

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

  if (!isOpen || !reservation) return null;

  const productName =
    reservation.offerTitle ||
    (reservation.id === 'res-1'
      ? 'Pain complet'
      : reservation.id === 'res-2'
      ? 'Part de gâteau au chocolat'
      : reservation.id === 'res-3'
      ? 'Le panier laitier'
      : reservation.id === 'res-4'
      ? 'Farine'
      : 'Commande FORSA');

  const shopName =
    reservation.shopName ||
    (reservation.id === 'res-1'
      ? 'La Boulangerie'
      : reservation.id === 'res-2'
      ? 'Pâtisserie Nour'
      : reservation.id === 'res-3'
      ? 'Laiterie Atlas'
      : 'Commerce partenaire');

  const shopDistance = reservation.shopDistance || 'Bab Ezzouar · 350 m';
  const price = `${Math.round(parseFloat(reservation.totalPrice) || 0)} DA`;
  const unitPrice =
    reservation.quantity > 0
      ? `${Math.round((parseFloat(reservation.totalPrice) || 0) / reservation.quantity)} DA`
      : price;

  const reservationNum = `FORSA-${(reservation.pickupCode || '3010').replace('-', '')}-${reservation.id.slice(-3).toUpperCase()}`;

  // Formattage date de retrait
  const pickupTimeStr = (() => {
    try {
      const start = new Date(reservation.pickupStart);
      const end = new Date(reservation.pickupEnd);
      const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `Aujourd’hui · ${startTime} – ${endTime}`;
    } catch {
      return 'Aujourd’hui · 16:00 – 20:00';
    }
  })();

  const pickupEndTime = (() => {
    try {
      const end = new Date(reservation.pickupEnd);
      return end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '20:00';
    }
  })();

  // Statuts et badges visuels
  const isAccepted = reservation.status === 'ACCEPTED';
  const isPickedUp = reservation.status === 'PICKED_UP';
  const isExpired = reservation.status === 'EXPIRED';
  const isCancelled = reservation.status === 'CANCELLED' || reservation.status === 'REFUSED';

  const statusBadge = (() => {
    if (isPickedUp) {
      return {
        label: 'Retirée · Ticket scanné',
        bg: 'bg-[#DBF0DD]',
        text: 'text-[#235347]',
        icon: IconTick,
      };
    }
    if (isExpired) {
      return {
        label: 'Réservation expirée',
        bg: 'bg-[#FDF3D8]',
        text: 'text-[#8A5B00]',
        icon: IconClock,
      };
    }
    if (isCancelled) {
      return {
        label: 'Réservation annulée',
        bg: 'bg-[#FBE4E1]',
        text: 'text-[#A3362B]',
        icon: IconCancel,
      };
    }
    return {
      label: isAccepted ? 'Réservation confirmée' : 'Ticket en attente',
      bg: 'bg-[#DBF0DD]',
      text: 'text-[#17664E]',
      icon: isAccepted ? IconTick : IconClock,
    };
  })();

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-[rgba(11,44,37,0.7)] backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 max-w-[1080px] w-full my-auto font-poppins"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================
            COLONNE GAUCHE : Scène de l'imprimante thermique & Ticket
            Figma spec: node #838:30379 (Scène du ticket 500x775px)
            ============================================================ */}
        <div className="w-full max-w-[460px] sm:max-w-[500px] flex flex-col items-center p-4 sm:p-[20px] rounded-[32px] bg-gradient-to-b from-[rgba(238,247,236,0.95)] to-[rgba(213,236,215,0.95)] border-[1.5px] border-[#DBF0DD] shadow-[0px_24px_48px_rgba(10,43,36,0.2)]">
          {/* Fente imprimante sombre (Figma #838:30420: 396x31.2px, #0B2C25) */}
          <div className="relative w-full max-w-[396px] h-[34px] rounded-[17px] bg-[#0B2C25] shadow-[0px_6px_16px_rgba(0,0,0,0.35)] flex items-center justify-between px-5 z-20 shrink-0">
            {/* Lèvre interne de la fente */}
            <div className="w-[82%] h-[6px] rounded-full bg-black/60 shadow-inner" />

            {/* Voyant lumineux */}
            <div className="flex items-center gap-2">
              <span
                className={`w-[8px] h-[8px] rounded-full transition-all duration-300 ${
                  isPrinting
                    ? 'bg-[#EDBD4D] shadow-[0_0_8px_#EDBD4D] animate-ping'
                    : isCancelled || isExpired
                    ? 'bg-[#E15241]'
                    : 'bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]'
                }`}
                title={isPrinting ? 'Impression thermique...' : 'Prêt'}
              />
              <span className="text-[9px] font-mono uppercase text-[#DBF0DD]/70 tracking-widest hidden sm:inline">
                {isPrinting ? 'PRINT' : 'READY'}
              </span>
            </div>
          </div>

          {/* Zone de sortie du ticket avec masque de découpe */}
          <div className="relative w-full max-w-[348px] overflow-hidden -mt-[14px] pt-[14px] pb-4">
            {/* Ticket thermique avec animation fluide de sortie */}
            <div
              className={`relative w-full bg-white rounded-b-[4px] shadow-[0px_12px_32px_rgba(10,43,36,0.14)] transition-all duration-700 ease-out flex flex-col ${
                isPrinting
                  ? 'translate-y-0 opacity-100 animate-in slide-in-from-top-6 duration-700'
                  : 'translate-y-0 opacity-100'
              }`}
            >
              {/* Dentelure supérieure */}
              <div className="-mt-[1px]">
                <ZigzagEdge inverted className="text-white" />
              </div>

              {/* Contenu du ticket */}
              <div className="p-[20px_22px_16px] flex flex-col items-center gap-[12px] text-center">
                {/* Statut pill */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text}`}
                >
                  <img src={statusBadge.icon} alt="" className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-semibold">{statusBadge.label}</span>
                </div>

                {/* Produit & Commerce */}
                <div className="flex flex-col gap-1 w-full">
                  <h3 className="font-poppins font-bold text-[22px] text-[#17664E] leading-tight">
                    {productName}
                  </h3>
                  <p className="font-poppins font-normal text-[12px] text-[rgba(11,44,37,0.7)]">
                    {shopName} · {shopDistance}
                  </p>
                </div>

                {/* Ligne pointillée */}
                <div className="w-full border-b border-dashed border-[#0B2C25]/20 my-0.5" />

                {/* Date & créneau */}
                <div className="w-full text-center">
                  <span className="font-poppins font-semibold text-[12px] text-[#0B2C25] tracking-wide uppercase">
                    RETRAIT : {pickupTimeStr}
                  </span>
                </div>

                {/* Ligne pointillée */}
                <div className="w-full border-b border-dashed border-[#0B2C25]/20 my-0.5" />

                {/* Ligne article */}
                <div className="flex items-center justify-between w-full text-left py-1">
                  <div className="flex flex-col">
                    <span className="font-poppins font-medium text-[13px] text-[#0B2C25]">
                      {productName}
                    </span>
                    <span className="font-poppins text-[11px] text-[rgba(11,44,37,0.65)]">
                      {reservation.quantity} unité{reservation.quantity > 1 ? 's' : ''} × {unitPrice}
                    </span>
                  </div>
                  <span className="font-poppins font-bold text-[18px] text-[#0B2C25]">
                    {price}
                  </span>
                </div>

                {/* Ligne pointillée */}
                <div className="w-full border-b border-dashed border-[#0B2C25]/20 my-0.5" />

                {/* QR Code scannable */}
                <div className="flex items-center justify-center p-[7.2px] bg-white border border-[#E8EBDF] rounded-[12.6px] shadow-xs my-1">
                  {reservation.qrCodeData ? (
                    <img
                      src={reservation.qrCodeData}
                      alt={`QR ${reservation.pickupCode}`}
                      className="w-[99px] h-[99px] object-contain"
                    />
                  ) : (
                    <img src={IconMotifQR} alt="QR Code" className="w-[99px] h-[99px] object-contain" />
                  )}
                </div>

                {/* Code de retrait */}
                <div className="flex flex-col items-center gap-0.5 w-full">
                  <span className="text-[10px] font-semibold text-[rgba(11,44,37,0.6)] uppercase tracking-widest">
                    CODE DE RETRAIT
                  </span>
                  <span className="font-poppins font-bold text-[26px] text-[#0B2C25] tracking-[0.14em] select-all">
                    {reservation.pickupCode}
                  </span>
                  <span className="text-[10px] font-normal text-[rgba(11,44,37,0.6)]">
                    N° de réservation : {reservationNum}
                  </span>
                </div>

                {/* Message anti-gaspillage */}
                <p className="font-poppins font-semibold text-[11px] text-[#17664E] pt-1">
                  Merci de lutter contre le gaspillage !
                </p>
              </div>

              {/* Dentelure inférieure crantée */}
              <div className="-mb-[1px]">
                <ZigzagEdge className="text-white" />
              </div>
            </div>
          </div>

          {/* Boutons d'action du ticket */}
          <div className="flex items-center gap-3 w-full max-w-[348px] pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 h-[42px] rounded-[12px] bg-[#0B2C25] text-white font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <span>Imprimer le ticket</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-[42px] px-5 rounded-[12px] border border-[rgba(11,44,37,0.3)] bg-white/70 text-[#0B2C25] font-poppins font-semibold text-[13px] hover:bg-white active:scale-95 transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* ============================================================
            COLONNE DROITE (Desktop) : Panneau récapitulatif & Suivi
            Figma spec: node #838:30425 (Colonne principale)
            ============================================================ */}
        <div className="flex-1 flex flex-col gap-5 w-full max-w-[520px]">
          {/* Carte retrait à venir sombre (Figma #838:30426) */}
          <div className="flex flex-col gap-4 p-6 sm:p-7 bg-[#0B2C25] rounded-[24px] text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                <span className="text-[12px] font-semibold text-white">
                  {isAccepted ? 'Prêt à retirer' : isPickedUp ? 'Retiré' : isExpired ? 'Expiré' : 'En attente'}
                </span>
              </div>
              <span className="text-[11px] text-[#DBF0DD] font-mono">{reservationNum}</span>
            </div>

            <div className="flex items-end justify-between pt-2">
              <div className="flex flex-col">
                <span className="text-[12px] text-[#DBF0DD]">À retirer avant</span>
                <span className="font-poppins font-bold text-[48px] sm:text-[54px] leading-tight text-white">
                  {pickupEndTime}
                </span>
                <span className="text-[12px] text-[#DBF0DD]">{pickupTimeStr}</span>
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="text-[12px] text-[#DBF0DD]">À payer sur place</span>
                <span className="font-poppins font-bold text-[32px] sm:text-[36px] text-[#DBF0DD]">
                  {price}
                </span>
                <span className="text-[11px] text-[#DBF0DD]/80">
                  {reservation.quantity} unité{reservation.quantity > 1 ? 's' : ''} × {unitPrice}
                </span>
              </div>
            </div>

            {/* Jauge de temps */}
            {!isPickedUp && !isExpired && !isCancelled && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/15">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-white">
                    <img src={IconClock} alt="" className="w-3.5 h-3.5 filter invert" />
                    Créneau de retrait actif
                  </span>
                  <span className="text-[#DBF0DD] font-mono">{pickupEndTime}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-[#4ADE80] rounded-full w-[65%]" />
                </div>
              </div>
            )}
          </div>

          {/* Carte Suivi de la réservation (Figma #838:30451) */}
          <div className="flex flex-col gap-4 p-5 sm:p-6 bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#EEF7EC] border border-[#235347]">
                  <img src={IconTick} alt="" className="w-4 h-4" />
                </div>
                <span className="font-poppins font-semibold text-[16px] text-[#0B2C25]">
                  Suivi de la réservation
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#FDF3D8] text-[#6B4E00]">
                {isPickedUp ? 'Étape 3 sur 3' : isAccepted ? 'Étape 2 sur 3' : 'Étape 1 sur 3'}
              </span>
            </div>

            {/* Étapes du suivi */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              {/* Étape 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#17664E] text-white">
                  <img src={IconTick} alt="" className="w-3.5 h-3.5 filter brightness-0 invert" />
                </div>
                <span className="text-[12px] font-semibold text-[#0B2C25]">Réservée</span>
                <span className="text-[10px] text-[rgba(11,44,37,0.6)]">Validée</span>
              </div>

              {/* Étape 2 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full ${
                    isAccepted || isPickedUp
                      ? 'bg-[#17664E] text-white'
                      : 'border-2 border-[#17664E] bg-white text-[#17664E]'
                  }`}
                >
                  <img
                    src={IconTick}
                    alt=""
                    className={`w-3.5 h-3.5 ${
                      isAccepted || isPickedUp ? 'filter brightness-0 invert' : ''
                    }`}
                  />
                </div>
                <span className="text-[12px] font-semibold text-[#0B2C25]">Acceptée</span>
                <span className="text-[10px] text-[rgba(11,44,37,0.6)]">{shopName}</span>
              </div>

              {/* Étape 3 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full ${
                    isPickedUp
                      ? 'bg-[#17664E] text-white'
                      : 'border-2 border-gray-300 bg-gray-50 text-gray-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                </div>
                <span
                  className={`text-[12px] font-semibold ${
                    isPickedUp ? 'text-[#17664E]' : 'text-gray-400'
                  }`}
                >
                  Retirée
                </span>
                <span className="text-[10px] text-[rgba(11,44,37,0.6)]">Sur place</span>
              </div>
            </div>
          </div>

          {/* Carte Commerce & Itinéraire (Figma #838:30484) */}
          <div className="flex items-center justify-between p-4 bg-white border border-[#DBF0DD] rounded-[18px] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#EEF7EC] shrink-0">
                <img src={IconLocation} alt="" className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-poppins font-semibold text-[14px] text-[#0B2C25]">
                  {shopName}
                </span>
                <span className="text-[11px] text-[rgba(11,44,37,0.7)]">{shopDistance}</span>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopName + ' ' + shopDistance)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-[36px] px-3.5 bg-[#0B2C25] text-white rounded-[10px] text-[12px] font-semibold hover:bg-black/90 active:scale-95 transition-all"
            >
              <img src={IconNavigation} alt="" className="w-3.5 h-3.5 filter invert" />
              <span>Itinéraire</span>
            </a>
          </div>

          {/* Option d'annulation si éligible */}
          {(reservation.status === 'PENDING' || reservation.status === 'ACCEPTED') && onCancel && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCancel(reservation);
              }}
              className="text-center text-[12px] font-semibold text-[#A3362B] hover:underline cursor-pointer py-1"
            >
              Annuler cette réservation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptTicketModal;
