
import IconHeaderLocation from './assets/icons/header-location.svg';
import IconHeaderBell from './assets/icons/header-bell.svg';
import IconHeaderDot from './assets/icons/header-unread-dot.svg';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Reservation, ReservationStatus } from './types';
import { ReservationsApi } from './services/reservationsApi';
import { CancelReservationModal } from './CancelReservationModal';
import { CancelImpossibleModal } from './CancelImpossibleModal';
import { ReservationSkeleton } from './ReservationSkeleton';
import { ExpiredBanner } from './ExpiredBanner';
import { ReceiptTicketModal } from './ReceiptTicketModal';
import { ReservationDialog, type OfferDetail, type ReservationCreateParams, type ReservationCreateResult } from './ReservationDialog';

// SVG icon imports from assets/icons
import IconClock from './assets/icons/Icône clock-01.svg';
import IconTick from './assets/icons/Icône tick-02.svg';
import IconWallet from './assets/icons/Icône wallet-02.svg';
import IconCalendar from './assets/icons/calendar-03.svg';
import IconLocation from './assets/icons/location-05.svg';
import IconArrowRight from './assets/icons/Icône arrow-right-02-round.svg';
import IconCancel from './assets/icons/cancel-01.svg';
import IconQrCode from './assets/icons/Icône qr-code.svg';
import IconStar from './assets/icons/Icône star.svg';
import IconFlag from './assets/icons/Icône flag-02.svg';
import IconView from './assets/icons/Icône view.svg';
import IconCheckmark from './assets/icons/checkmark-circle-02.svg';
import IconHandBag from './assets/icons/Icône hand-bag-01.svg';
import IconMotifQR from './assets/icons/Motif QR.svg';

// ---------------------------------------------------------------------------
// Props — maintains interface expected by ReservationScreen
// ---------------------------------------------------------------------------
interface ReservationListProps {
  onSelect: (id: string) => void;
  onCreate: () => void;
  onMerchant: () => void;
  previewMode?: boolean;
  previewReservations?: Reservation[];
  onReserve?: (params: ReservationCreateParams) => Promise<ReservationCreateResult>;
}

// ---------------------------------------------------------------------------
// Filter tab type
// ---------------------------------------------------------------------------
type FilterTab = 'all' | 'active' | 'picked_up' | 'cancelled';

// ---------------------------------------------------------------------------
// Helpers for dates & dynamic display
// ---------------------------------------------------------------------------
function formatPickupDate(startStr: string, endStr: string): string {
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const now = new Date();

    const isToday =
      start.getDate() === now.getDate() &&
      start.getMonth() === now.getMonth() &&
      start.getFullYear() === now.getFullYear();

    const startTime = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Aujourd'hui · ${startTime} – ${endTime}`;
    }
    const day = String(start.getDate()).padStart(2, '0');
    const month = String(start.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} · ${startTime} – ${endTime}`;
  } catch {
    return 'Horaire de retrait indiqué sur place';
  }
}

interface ActionDef {
  id: string;
  label: string;
  variant: 'primary' | 'outline';
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface DisplayData {
  productName: string;
  shopName: string;
  shopDistance: string;
  quantity: string;
  price: string;
  status: ReservationStatus;
  badgeLabel: string;
  dateLabel: string;
  progressLabel?: string;
  progressPercent?: number;
  infoBox?: string;
  actions: ActionDef[];
}

// ----- Reusable Icon Pastilles (Figma 44×44, fill #EEF7EC, stroke #235347 1px, r100) -----
const CardIconPastille: React.FC<{ icon: string; alt: string }> = ({ icon, alt }) => (
  <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[#EEF7EC] border border-[#235347] shrink-0">
    <img src={icon} alt={alt} className="w-[22px] h-[22px]" />
  </div>
);

// Figma 40×40, fill #EBEEE1, r100
const SmallPastille: React.FC<{ icon: string; alt: string }> = ({ icon, alt }) => (
  <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#EBEEE1] shrink-0">
    <img src={icon} alt={alt} className="w-[20px] h-[20px]" />
  </div>
);

export const ReservationList: React.FC<ReservationListProps> = ({
  onSelect,
  previewMode = false,
  previewReservations,
  onReserve,
}) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Modal states
  const [qrModalReservation, setQrModalReservation] = useState<Reservation | null>(null);
  const [confirmCancelReservation, setConfirmCancelReservation] = useState<Reservation | null>(null);
  const [impossibleCancelReservation, setImpossibleCancelReservation] = useState<{
    reservation: Reservation;
    reason?: string;
  } | null>(null);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [selectedOfferForDialog] = useState<OfferDetail | null>(null);

  // Load reservations from API
  const loadReservations = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (previewMode) {
        setReservations(previewReservations ?? []);
        setLoading(false);
        return;
      }
      const res = await ReservationsApi.getMyReservationsDetailed();
      if (res.error) {
        setErrorMessage(res.error);
        setReservations([]);
      } else {
        setReservations(res.data);
      }
    } catch {
      setErrorMessage('Impossible de charger vos réservations');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [previewMode, previewReservations]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Notification auto-dismiss
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  // Counts for tabs and activity widget
  const counts = useMemo(() => {
    const active = reservations.filter(
      (r) => r.status === 'PENDING' || r.status === 'ACCEPTED'
    ).length;
    const pickedUp = reservations.filter((r) => r.status === 'PICKED_UP').length;
    const cancelled = reservations.filter(
      (r) => r.status === 'CANCELLED' || r.status === 'REFUSED'
    ).length;
    return { all: reservations.length, active, pickedUp, cancelled };
  }, [reservations]);

  // The next active reservation for the "Prochain retrait" card (mobile & hero)
  const nextPickup = useMemo(
    () => reservations.find((r) => r.status === 'PENDING' || r.status === 'ACCEPTED'),
    [reservations]
  );

  // Check for expired reservations
  const expiredReservation = useMemo(
    () => reservations.find((r) => r.status === 'EXPIRED'),
    [reservations]
  );

  // Filtered list — ALL reservations for desktop list
  const filteredList = useMemo(() => {
    if (activeTab === 'all') return reservations;
    if (activeTab === 'active')
      return reservations.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED');
    if (activeTab === 'picked_up')
      return reservations.filter((r) => r.status === 'PICKED_UP');
    return reservations.filter(
      (r) => r.status === 'CANCELLED' || r.status === 'REFUSED'
    );
  }, [reservations, activeTab]);

  // Mobile other reservations list — excludes nextPickup on mobile when present
  const mobileOtherReservations = useMemo(() => {
    const list = nextPickup ? reservations.filter((r) => r.id !== nextPickup.id) : reservations;
    if (activeTab === 'all') return list;
    if (activeTab === 'active')
      return list.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED');
    if (activeTab === 'picked_up')
      return list.filter((r) => r.status === 'PICKED_UP');
    return list.filter(
      (r) => r.status === 'CANCELLED' || r.status === 'REFUSED'
    );
  }, [reservations, nextPickup, activeTab]);

  // Total amount to pay for pending/accepted items
  const totalToPay = useMemo(
    () =>
      reservations
        .filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED')
        .reduce((sum, r) => sum + Math.round(parseFloat(r.totalPrice) || 0), 0),
    [reservations]
  );

  // Cancellation handler with eligibility check
  const handleRequestCancel = useCallback((r: Reservation) => {
    if (r.status === 'PICKED_UP') {
      const prodName = r.offerTitle || 'votre commande';
      setImpossibleCancelReservation({
        reservation: r,
        reason: `Le ticket « ${prodName} » a déjà été scanné par le commerçant. Une réservation retirée ne peut plus être annulée.`,
      });
      return;
    }
    if (r.status === 'EXPIRED') {
      const prodName = r.offerTitle || 'votre commande';
      setImpossibleCancelReservation({
        reservation: r,
        reason: `Le créneau de retrait pour « ${prodName} » est expiré. Une réservation expirée ne peut plus être annulée.`,
      });
      return;
    }
    if (r.status === 'CANCELLED' || r.status === 'REFUSED') {
      setImpossibleCancelReservation({
        reservation: r,
        reason: 'Cette réservation a déjà été annulée ou refusée.',
      });
      return;
    }

    // Otherwise status is PENDING or ACCEPTED: open confirmation modal
    setConfirmCancelReservation(r);
  }, []);

  // Helper to build presentation data for any reservation
  const getDisplayData = useCallback(
    (r: Reservation): DisplayData => {
      const price = `${Math.round(parseFloat(r.totalPrice) || 0)} DA`;
      const dateText = formatPickupDate(r.pickupStart, r.pickupEnd);

      const productName =
        r.offerTitle ||
        (r.id === 'res-1'
          ? 'Pain complet'
          : r.id === 'res-2'
            ? 'Part de gâteau au chocolat'
            : r.id === 'res-3'
              ? 'Le panier laitier'
              : r.id === 'res-4'
                ? 'Farine'
                : `Réservation #${r.id.slice(0, 6)}`);

      const shopName =
        r.shopName ||
        (r.id === 'res-1'
          ? 'La Boulangerie'
          : r.id === 'res-2'
            ? 'Pâtisserie Nour'
            : r.id === 'res-3'
              ? 'Laiterie Atlas'
              : r.id === 'res-4'
                ? 'Épicerie El Baraka'
                : 'Commerçant');

      const shopDistance =
        r.shopDistance ||
        (r.id === 'res-1'
          ? 'Bab Ezzouar'
          : r.id === 'res-2'
            ? '350 m'
            : r.id === 'res-3'
              ? '650 m'
              : r.id === 'res-4'
                ? '500 m'
                : 'Alger');

      const quantity = `${r.quantity} unité${r.quantity > 1 ? 's' : ''}`;

      // Status: PENDING / ACCEPTED
      if (r.status === 'PENDING' || r.status === 'ACCEPTED') {
        const isReady = r.status === 'ACCEPTED';
        return {
          productName,
          shopName,
          shopDistance,
          quantity,
          price,
          status: r.status,
          badgeLabel: isReady ? 'Ticket prêt' : 'En attente',
          dateLabel: dateText,
          progressLabel: 'Ticket généré · à retirer avant 20:00',
          progressPercent: 50,
          actions: [
            {
              id: 'qr',
              label: 'Voir le QR',
              variant: 'primary',
              icon: IconQrCode,
              onClick: () => setQrModalReservation(r),
            },
            {
              id: 'cancel',
              label: 'Annuler',
              variant: 'outline',
              onClick: () => handleRequestCancel(r),
            },
          ],
        };
      }

      // Status: PICKED_UP
      if (r.status === 'PICKED_UP') {
        return {
          productName,
          shopName,
          shopDistance,
          quantity,
          price,
          status: r.status,
          badgeLabel: 'Retirée',
          dateLabel: `${r.pickedUpAt ? new Date(r.pickedUpAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '29/10'} · ticket scanné`,
          progressLabel: 'Retiré · ticket scanné',
          progressPercent: 100,
          actions: [
            {
              id: 'review',
              label: 'Donner un avis',
              variant: 'primary',
              icon: IconStar,
              onClick: () =>
                setNotification({ message: 'Module avis disponible prochainement.', type: 'info' }),
            },
            {
              id: 'report',
              label: 'Signaler',
              variant: 'outline',
              icon: IconFlag,
              onClick: () =>
                setNotification({ message: 'Signalement transmis à la modération MS4.', type: 'info' }),
            },
          ],
        };
      }

      // Status: CANCELLED / REFUSED / EXPIRED
      const isRefused = r.status === 'REFUSED';
      const isExpired = r.status === 'EXPIRED';
      const badgeText = isRefused ? 'Refusée' : isExpired ? 'Expirée' : 'Annulée';

      return {
        productName,
        shopName,
        shopDistance,
        quantity,
        price,
        status: r.status,
        badgeLabel: badgeText,
        dateLabel: isExpired
          ? 'Aujourd\u2019hui · retrait expiré à 20:00'
          : `${r.cancelledAt ? new Date(r.cancelledAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '28/10'} · annulée avant le retrait`,
        infoBox: isRefused
          ? 'Refusée par le commerçant · aucun montant dû'
          : isExpired
            ? 'Non retirée dans le créneau · aucun montant dû'
            : 'Annulée avant le retrait · aucun montant dû',
        actions: [
          {
            id: 'details',
            label: 'Voir le détail',
            variant: 'outline',
            icon: IconView,
            onClick: () => setQrModalReservation(r),
          },
        ],
      };
    },
    [handleRequestCancel]
  );

  // Navigation handlers
  const handleExploreOffers = () => {
    setIsReservationDialogOpen(true);
  };

  const handleViewHistory = () => {
    setActiveTab('picked_up');
    const el = document.getElementById('reservations-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };



  return (
    <div className="w-full flex flex-col gap-[16px] md:gap-[24px] p-4 sm:p-6 md:p-[30px_40px_28px] min-h-screen bg-forsa-cream font-poppins">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border transition-all ${notification.type === 'success'
            ? 'bg-[#EEF7EC] border-[#17664E] text-[#0B2C25]'
            : notification.type === 'error'
              ? 'bg-[#FBE4E1] border-[#A3362B] text-[#A3362B]'
              : 'bg-white border-[#DBF0DD] text-forsa-dark'
            }`}
        >
          <span className="text-[13px] font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================================================================
          PAGE HEADER — Figma Desktop #1:15459 & Mobile #1:21226
          ================================================================ */}
      <div className="flex items-center justify-between gap-4 md:gap-[24px]">
        {/* Page introduction */}
        <div className="flex flex-col gap-[2px] md:gap-[3px] flex-1 min-w-0">
          <span className="font-poppins font-normal text-[11px] text-forsa-dark">
            Mon espace / Mes réservations
          </span>
          <h1 className="font-poppins font-semibold text-[22px] md:text-[48px] leading-tight md:leading-[1.5em] tracking-[-0.0167em] text-forsa-dark">
            Mes réservations
          </h1>
          <p className="font-poppins font-normal text-[12px] md:text-[20px] leading-normal md:leading-[1.5em] text-[rgba(11,44,37,0.71)]">
            Retrouvez vos codes de retrait et suivez chaque réservation.
          </p>
        </div>

        {/* Account actions — Figma #1:15464 & Mobile #1:21230 */}
        <div className="flex items-center gap-2.5 md:gap-[14px] shrink-0">
          {/* Current location - Desktop only */}
          <div className="hidden md:flex items-center gap-[7px] pr-[12px]">
            <div className="relative size-[18px] shrink-0 overflow-clip">
              <div className="absolute inset-[8.33%_12.49%_8.33%_12.5%]">
                <div className="absolute inset-[-5%_-5.56%]">
                  <img src={IconHeaderLocation} alt="" className="block size-full max-w-none" />
                </div>
              </div>
            </div>
            <span className="font-poppins font-normal text-[12px] leading-[1.5em] text-forsa-dark whitespace-nowrap">
              Bab Ezzouar, Alger
            </span>
          </div>

          {/* Notifications entry - Mobile: white round 38x38 with red badge; Desktop: 42x42 with green dot */}
          <div
            className="relative flex size-[38px] md:size-[42px] shrink-0 items-center justify-center rounded-full bg-white md:bg-transparent shadow-xs md:shadow-none border border-black/5 md:border-0 cursor-pointer"
            title="Notifications"
          >
            <div className="relative size-[20px] md:size-[22px] shrink-0 overflow-clip">
              <div className="absolute inset-[8.33%_12.5%]">
                <div className="absolute inset-[-4.09%_-4.55%]">
                  <img src={IconHeaderBell} alt="Notifications" className="block size-full max-w-none" />
                </div>
              </div>
            </div>
            <div className="absolute right-[4px] top-[4px] md:right-[8px] md:top-[8px] size-[10px] md:size-[7px] rounded-full bg-[#A3362B] md:bg-forsa-emerald border-2 md:border-[1.5px] border-white" />
          </div>

          {/* Avatar - Desktop only */}
          <div
            className="hidden md:flex size-[48px] shrink-0 items-center justify-center rounded-full bg-[#D9D9D9] font-bold text-xs text-forsa-dark"
            title="Mon profil"
          >
            CL
          </div>
        </div>
      </div>

      {/* ================================================================
          LOADING SKELETON
          ================================================================ */}
      {loading && <ReservationSkeleton />}

      {/* ================================================================
          MAIN CONTENT — Figma #1:15472 Colonnes: row, gap 24px
          ================================================================ */}
      {!loading && (
        <div className="flex flex-col lg:flex-row gap-[12px] md:gap-[24px] items-start w-full min-w-0">
          {/* ============================================================
              MAIN COLUMN — flex-1
              ============================================================ */}
          <div className="w-full flex-1 flex flex-col gap-[12px] md:gap-[24px] min-w-0">
            {/* Expired banner */}
            {expiredReservation && !errorMessage && (
              <ExpiredBanner
                reservation={expiredReservation}
                onExploreOffers={handleExploreOffers}
              />
            )}

            {/* ==========================================================
                CARTE PROCHAIN RETRAIT — Mobile (< md) — Figma #1:21234
                Condition : visible uniquement sur mobile (< md) si nextPickup existe
                ========================================================== */}
            {nextPickup && !errorMessage && (
              <div className="flex md:hidden flex-col gap-[10px] p-[12px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[20px] w-full min-w-0">
                {/* En-tête de carte */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-[6px]">
                    <img src={IconClock} alt="" className="size-[16px]" />
                    <span className="font-poppins font-semibold text-[13px] text-forsa-dark">
                      Prochain retrait
                    </span>
                  </div>
                  <div className="flex items-center gap-[4px] py-[3px] pl-[8px] pr-[10px] bg-[#DBF0DD] rounded-full">
                    <img src={IconTick} alt="" className="size-[11px]" />
                    <span className="font-poppins font-semibold text-[11px] text-[#235347]">
                      Ticket prêt
                    </span>
                  </div>
                </div>

                {/* Contenu dynamique depuis nextPickup */}
                <div className="flex items-center gap-[10px] w-full">
                  {/* Détails */}
                  <div className="flex-1 flex flex-col gap-[3px] min-w-0">
                    <span className="font-poppins font-semibold text-[15px] text-forsa-dark truncate">
                      {nextPickup.offerTitle || getDisplayData(nextPickup).productName}
                    </span>
                    <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.72)] truncate">
                      {nextPickup.quantity} unité{nextPickup.quantity > 1 ? 's' : ''} · {nextPickup.shopName || getDisplayData(nextPickup).shopName}
                    </span>
                    <div className="flex items-center gap-[5px]">
                      <img src={IconClock} alt="" className="size-[13px]" />
                      <span className="font-poppins font-semibold text-[12px] text-forsa-dark truncate">
                        {formatPickupDate(nextPickup.pickupStart, nextPickup.pickupEnd)}
                      </span>
                    </div>
                    <div className="flex items-center gap-[5px]">
                      <img src={IconWallet} alt="" className="size-[13px]" />
                      <span className="font-poppins font-semibold text-[12px] text-forsa-emerald truncate">
                        {Math.round(parseFloat(nextPickup.totalPrice) || 0)} DA sur place
                      </span>
                    </div>
                  </div>

                  {/* Photo produit */}
                  <div className="size-[60px] rounded-[14px] bg-[#D9D9D9] shrink-0 flex items-center justify-center text-[10px] text-gray-500 font-medium">
                    Photo
                  </div>

                  {/* Code de retrait & QR */}
                  <div className="flex flex-col items-center gap-[3px] p-[6px] bg-forsa-cream border border-[#DBF0DD] rounded-[14px] shrink-0">
                    <div className="w-[66px] p-[4px] bg-white border border-[#E8EBDF] rounded-[7px] flex items-center justify-center">
                      <img src={IconMotifQR} alt="QR Code" className="size-[56px]" />
                    </div>
                    <span className="font-poppins font-semibold text-[10px] text-forsa-dark tracking-wide">
                      {nextPickup.pickupCode || 'FRS-7K29'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-[8px] w-full">
                  <button
                    onClick={() => setQrModalReservation(nextPickup)}
                    className="flex-1 flex items-center justify-center gap-[6px] h-[40px] bg-forsa-dark text-white rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Voir le justificatif</span>
                    <img
                      src={IconArrowRight}
                      alt=""
                      className="size-[14px]"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  </button>
                  <button
                    onClick={() => handleRequestCancel(nextPickup)}
                    className="w-[88px] h-[40px] flex items-center justify-center border border-[#78847F] text-forsa-dark rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* ==========================================================
                CARTE MON ACTIVITÉ — Mobile (< md) — Figma #1:21264
                Placée directement avant la liste des réservations
                ========================================================== */}
            {!errorMessage && (
              <div className="flex md:hidden flex-col gap-[10px] p-[12px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[20px] w-full min-w-0">
                {/* En-tête de carte */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-[8px]">
                    <div className="size-[28px] rounded-full bg-[#EEF7EC] border border-[#235347] flex items-center justify-center shrink-0">
                      <img src={IconCalendar} alt="" className="size-[14px]" />
                    </div>
                    <span className="font-poppins font-semibold text-[14px] text-forsa-dark">
                      Mon activité
                    </span>
                  </div>
                  <button
                    onClick={handleViewHistory}
                    className="flex items-center gap-[4px] font-poppins font-semibold text-[12px] text-forsa-emerald hover:underline cursor-pointer"
                  >
                    <span>Historique</span>
                    <img src={IconArrowRight} alt="" className="size-[12px]" />
                  </button>
                </div>

                {/* Chiffres */}
                <div className="flex gap-[8px] w-full">
                  {/* Tuile En cours */}
                  <div
                    onClick={() => setActiveTab('active')}
                    className="flex-1 flex flex-col items-center justify-center gap-[2px] py-[10px] px-[6px] bg-[#FDF3D8] rounded-[14px] cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img src={IconClock} alt="" className="size-[16px]" />
                    <span className="font-poppins font-bold text-[20px] text-forsa-dark">
                      {counts.active}
                    </span>
                    <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                      En cours
                    </span>
                  </div>

                  {/* Tuile Retirées */}
                  <div
                    onClick={() => setActiveTab('picked_up')}
                    className="flex-1 flex flex-col items-center justify-center gap-[2px] py-[10px] px-[6px] bg-[#DBF0DD] rounded-[14px] cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img src={IconTick} alt="" className="size-[16px]" />
                    <span className="font-poppins font-bold text-[20px] text-forsa-dark">
                      {counts.pickedUp}
                    </span>
                    <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                      Retirées
                    </span>
                  </div>

                  {/* Tuile Annulées */}
                  <div
                    onClick={() => setActiveTab('cancelled')}
                    className="flex-1 flex flex-col items-center justify-center gap-[2px] py-[10px] px-[6px] bg-[#EBEEE1] rounded-[14px] cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img src={IconCancel} alt="" className="size-[16px]" />
                    <span className="font-poppins font-bold text-[20px] text-forsa-dark">
                      {counts.cancelled}
                    </span>
                    <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                      Annulées
                    </span>
                  </div>
                </div>

                {/* À régler sur place */}
                <div className="flex items-center gap-[10px] p-[10px] bg-[#EEF7EC] border border-[#DBF0DD] rounded-[14px] w-full">
                  <div className="size-[28px] rounded-full bg-forsa-emerald flex items-center justify-center shrink-0">
                    <img
                      src={IconWallet}
                      alt=""
                      className="size-[14px]"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-poppins font-semibold text-[13px] text-forsa-dark truncate">
                      {totalToPay} DA à régler sur place
                    </span>
                    <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.72)] truncate">
                      {counts.active === 0
                        ? 'Aucun retrait prévu'
                        : `${counts.active} retrait${counts.active > 1 ? 's' : ''} aujourd'hui`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {errorMessage ? (
              /* ------------------------------------------------------
                 ERROR STATE
                 ------------------------------------------------------ */
              <div className="flex flex-col gap-[16px] p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px]">
                <div className="flex items-center gap-[12px]">
                  <CardIconPastille icon={IconCalendar} alt="Réservations" />
                  <span className="font-poppins font-medium text-[20px] text-forsa-dark">
                    Réservations
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center text-center py-[56px] px-4 gap-[16px]">
                  <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[#F7DCD8] shrink-0">
                    <img src={IconCancel} alt="" className="w-[32px] h-[32px]" />
                  </div>
                  <h3 className="font-poppins font-semibold text-[18px] text-[#0B2C25]">
                    Impossible de charger vos réservations
                  </h3>
                  <p className="max-w-[420px] font-poppins font-normal text-[14px] leading-[1.5] text-[rgba(11,44,37,0.7)]">
                    Vérifiez votre connexion puis réessayez. Vos tickets ne sont pas perdus.
                  </p>
                  <div className="flex items-center gap-[12px] pt-[8px]">
                    <button
                      type="button"
                      onClick={loadReservations}
                      className="flex items-center justify-center h-[44px] px-[24px] bg-[#0B2C25] text-white rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                    >
                      Réessayer
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNotification({
                          message: 'Support client : contact@forsa.dz ou +213 21 00 00 00',
                          type: 'info',
                        })
                      }
                      className="flex items-center justify-center h-[44px] px-[24px] border border-[rgba(11,44,37,0.4)] rounded-[12px] font-poppins font-semibold text-[13px] text-[rgba(11,44,37,0.75)] hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
                    >
                      Aide et support
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ------------------------------------------------------
                 SECTION RÉSERVATIONS — Figma Desktop #1:15474 / Mobile #1:21292
                 ------------------------------------------------------ */
              <div
                id="reservations-section"
                className="w-full min-w-0 flex flex-col gap-[10px] md:gap-[16px] md:p-[24px] md:bg-white md:border-[1.5px] md:border-[#DBF0DD] md:rounded-[24px]"
              >
                {/* Mobile Section Header — Figma #1:21293 */}
                <div className="flex md:hidden items-center gap-[8px]">
                  <span className="font-poppins font-semibold text-[14px] text-forsa-dark">
                    {nextPickup ? 'Autres réservations' : 'Réservations'}
                  </span>
                  <div className="flex items-center px-[8px] py-[1px] bg-[#EBEEE1] rounded-full">
                    <span className="font-poppins font-semibold text-[11px] text-forsa-dark">
                      {nextPickup && activeTab === 'all'
                        ? Math.max(0, counts.all - 1)
                        : filteredList.length}
                    </span>
                  </div>
                </div>

                {/* Desktop En-tête — Figma #1:15475: row, justify space-between, alignItems center */}
                <div className="hidden md:flex flex-row items-center justify-between gap-0 w-full min-w-0">
                  {/* Titre — Figma #1:15476: row, gap 12, center */}
                  <div className="flex items-center gap-[12px] min-w-0">
                    <CardIconPastille icon={IconCalendar} alt="Réservations" />
                    <span className="font-poppins font-medium text-[20px] text-forsa-dark">
                      Réservations
                    </span>
                  </div>

                  {/* Filtres Desktop — Figma #1:15480: row, gap 6px */}
                  <div className="flex items-center gap-[6px] overflow-x-auto max-w-full">
                    {(
                      [
                        { key: 'all' as FilterTab, label: 'Toutes', count: counts.all },
                        { key: 'active' as FilterTab, label: 'En cours', count: counts.active },
                        { key: 'picked_up' as FilterTab, label: 'Retirées', count: counts.pickedUp },
                        { key: 'cancelled' as FilterTab, label: 'Annulées', count: counts.cancelled },
                      ] as const
                    ).map((tab) => {
                      const isActive = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`whitespace-nowrap px-[12px] py-[7px] rounded-full font-poppins font-semibold text-[12px] transition-all cursor-pointer ${
                            isActive
                              ? 'bg-forsa-dark text-white'
                              : 'bg-white border-[1.5px] border-[#DBF0DD] text-forsa-dark hover:bg-gray-50'
                          }`}
                        >
                          {tab.label} · {tab.count}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filtres Mobile — Figma #1:21297 */}
                <div className="flex md:hidden items-center gap-[6px] overflow-x-auto w-full max-w-full pb-1">
                  {(
                    [
                      { key: 'all' as FilterTab, label: 'Toutes', count: counts.all },
                      { key: 'active' as FilterTab, label: 'En cours', count: counts.active },
                      { key: 'picked_up' as FilterTab, label: 'Retirées', count: counts.pickedUp },
                      { key: 'cancelled' as FilterTab, label: 'Annulées', count: counts.cancelled },
                    ] as const
                  ).map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`whitespace-nowrap px-[10px] py-[6px] rounded-full font-poppins font-semibold text-[12px] transition-all cursor-pointer ${
                          isActive
                            ? 'bg-forsa-dark text-white'
                            : 'bg-white border-[1.5px] border-[#DBF0DD] text-forsa-dark'
                        }`}
                      >
                        {tab.label} {tab.count}
                      </button>
                    );
                  })}
                </div>

                {/* Liste — Figma #1:15489: column, gap 10px, stretch */}
                {reservations.length === 0 ? (
                  /* ÉTAT VIDE */
                  <div className="flex flex-col items-center justify-center text-center py-[56px] px-4 gap-[16px]">
                    <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[rgba(219,240,221,0.6)] shrink-0">
                      <img src={IconCalendar} alt="" className="w-[32px] h-[32px]" />
                    </div>
                    <h3 className="font-poppins font-semibold text-[18px] text-[#0B2C25]">
                      Aucune réservation pour le moment
                    </h3>
                    <p className="max-w-[440px] font-poppins font-normal text-[14px] leading-[1.5] text-[rgba(11,44,37,0.7)]">
                      Parcourez les offres près de chez vous et réservez en quelques secondes : votre
                      ticket apparaîtra ici.
                    </p>
                    <div className="pt-[4px]">
                      <button
                        type="button"
                        onClick={handleExploreOffers}
                        className="flex items-center justify-center gap-[8px] h-[44px] px-[24px] bg-[#0B2C25] text-white rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>Explorer les offres</span>
                        <img
                          src={IconArrowRight}
                          alt=""
                          className="w-[14px] h-[14px]"
                          style={{ filter: 'brightness(0) invert(1)' }}
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-[8px] md:gap-[10px] w-full min-w-0">
                    {filteredList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
                        <p className="font-poppins text-[13px] text-forsa-muted">
                          Aucune réservation dans cette catégorie.
                        </p>
                        <button
                          onClick={handleExploreOffers}
                          className="text-xs text-forsa-emerald font-semibold hover:underline mt-1 cursor-pointer"
                        >
                          Découvrir les offres disponibles →
                        </button>
                      </div>
                    ) : (
                      filteredList.map((r) => {
                        const isHeroOnMobile = nextPickup && r.id === nextPickup.id && activeTab === 'all';
                        const d = getDisplayData(r);
                        return (
                          <div
                            key={r.id}
                            className={isHeroOnMobile ? 'hidden md:block w-full min-w-0' : 'w-full min-w-0'}
                          >
                            <ReservationRowItem
                              reservation={r}
                              display={d}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================
              SIDEBAR — Figma #1:15553: column, gap 24px, w 340px
              ============================================================ */}
          <div className="w-full lg:w-[340px] flex flex-col gap-[12px] md:gap-[24px] shrink-0">
            {/* ----------------------------------------------------------
                CARD: Mon activité — Desktop only (sur mobile, placée avant la liste)
                ---------------------------------------------------------- */}
            <div className="hidden md:flex flex-col gap-[20px] p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px]">
              {/* En-tête — row, gap 12px */}
              <div className="flex items-center gap-[12px]">
                <CardIconPastille icon={IconCalendar} alt="Mon activité" />
                {/* Poppins Medium 500/20px #0B2C25 */}
                <span className="font-poppins font-medium text-[20px] text-forsa-dark">
                  Mon activité
                </span>
              </div>

              {/* Chiffres — Figma #1:15559: row, gap 10px */}
              <div className="flex gap-[10px]">
                {/* Tuile En cours — Figma: fill #FDF3D8, r16 */}
                <div
                  onClick={() => setActiveTab('active')}
                  className="flex-1 flex flex-col items-center gap-[4px] py-[14px] px-[6px] bg-[#FDF3D8] rounded-[16px] cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={IconClock} alt="" className="w-[20px] h-[20px]" />
                  {/* Poppins Bold 700/22px */}
                  <span className="font-poppins font-bold text-[22px] text-forsa-dark">
                    {counts.active}
                  </span>
                  {/* Poppins Regular 400/11px */}
                  <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                    En cours
                  </span>
                </div>

                {/* Tuile Retirées — Figma: fill #DBF0DD, r16 */}
                <div
                  onClick={() => setActiveTab('picked_up')}
                  className="flex-1 flex flex-col items-center gap-[4px] py-[14px] px-[6px] bg-[#DBF0DD] rounded-[16px] cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={IconTick} alt="" className="w-[20px] h-[20px]" />
                  <span className="font-poppins font-bold text-[22px] text-forsa-dark">
                    {counts.pickedUp}
                  </span>
                  <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                    Retirées
                  </span>
                </div>

                {/* Tuile Annulées — Figma: fill #EBEEE1, r16 */}
                <div
                  onClick={() => setActiveTab('cancelled')}
                  className="flex-1 flex flex-col items-center gap-[4px] py-[14px] px-[6px] bg-[#EBEEE1] rounded-[16px] cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={IconCancel} alt="" className="w-[20px] h-[20px]" />
                  <span className="font-poppins font-bold text-[22px] text-forsa-dark">
                    {counts.cancelled}
                  </span>
                  <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                    Annulées
                  </span>
                </div>
              </div>

              {/* À régler sur place — Figma #1:15572:
                  row, padding 12px 14px 12px 12px, gap 12px,
                  fill #EEF7EC, border 1px #DBF0DD, r16 */}
              <div className="flex items-center gap-[12px] p-[12px_14px_12px_12px] bg-[#EEF7EC] border border-[#DBF0DD] rounded-[16px]">
                {/* Pastille 40×40, fill #17664E, r100 */}
                <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-forsa-emerald shrink-0">
                  <img
                    src={IconWallet}
                    alt=""
                    className="w-[20px] h-[20px]"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                </div>
                <div className="flex flex-col gap-[1px]">
                  {/* Poppins SemiBold 600/14px #0B2C25 */}
                  <span className="font-poppins font-semibold text-[14px] text-forsa-dark">
                    {totalToPay} DA à régler sur place
                  </span>
                  {/* Poppins Regular 400/11px #0B2C25 */}
                  <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                    {counts.active === 0
                      ? 'Aucun retrait prévu'
                      : `${counts.active} retrait${counts.active > 1 ? 's' : ''} aujourd'hui`}
                  </span>
                </div>
              </div>

              {/* Lien historique — Poppins SemiBold 600/12px #17664E */}
              <button
                onClick={handleViewHistory}
                className="font-poppins font-semibold text-[12px] text-forsa-emerald text-left hover:underline cursor-pointer"
              >
                Voir l&apos;historique {'  →'}
              </button>
            </div>

            {/* ----------------------------------------------------------
                CARD: Bon à savoir — Figma #1:15579
                column, padding 24px, gap 8px, fill #FFF,
                border 1.5px #DBF0DD, radius 24px
                ---------------------------------------------------------- */}
            <div className="flex flex-col gap-[8px] p-4 md:p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[20px] md:rounded-[24px]">
              {/* En-tête */}
              <div className="flex items-center gap-[12px]">
                <CardIconPastille icon={IconCheckmark} alt="Bon à savoir" />
                <span className="font-poppins font-medium text-[20px] text-forsa-dark">
                  Bon à savoir
                </span>
              </div>

              {/* Séparateur — 1px #EBEEE1 */}
              <div className="h-[1px] bg-[#EBEEE1]" />

              {/* Tip rows — Figma: padding 12px 0, gap 12px */}
              {[
                {
                  icon: IconWallet,
                  title: 'Paiement sur place',
                  sub: 'Réglez au moment du retrait',
                },
                {
                  icon: IconHandBag,
                  title: 'Apportez votre sac',
                  sub: 'Pour emporter vos produits',
                },
                {
                  icon: IconQrCode,
                  title: 'Présentez votre QR code',
                  sub: 'Le commerçant le scanne',
                },
              ].map((tip, idx, arr) => (
                <React.Fragment key={tip.title}>
                  <div className="flex items-center gap-[12px] py-[12px]">
                    <SmallPastille icon={tip.icon} alt={tip.title} />
                    <div className="flex flex-col gap-[1px]">
                      {/* Poppins SemiBold 600/14px */}
                      <span className="font-poppins font-semibold text-[14px] text-forsa-dark">
                        {tip.title}
                      </span>
                      {/* Poppins Regular 400/11px */}
                      <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                        {tip.sub}
                      </span>
                    </div>
                  </div>
                  {idx < arr.length - 1 && <div className="h-[1px] bg-[#EBEEE1]" />}
                </React.Fragment>
              ))}

              <div className="h-[1px] bg-[#EBEEE1]" />

              {/* Bouton Explorer — Figma #1:15605:
                  row, center, gap 8px, h40, fill #0B2C25, r12,
                  text Poppins 600/13px white, icon 14×14 */}
              <button
                onClick={handleExploreOffers}
                className="flex items-center justify-center gap-[8px] h-[40px] bg-forsa-dark rounded-[12px] mt-[4px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
              >
                <span className="font-poppins font-semibold text-[13px] text-white">
                  Explorer les offres
                </span>
                <img
                  src={IconArrowRight}
                  alt=""
                  className="w-[14px] h-[14px]"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          TICKET DE CAISSE QR CODE & JUSTIFICATIF (Figma #838:30359)
          ================================================================ */}
      <ReceiptTicketModal
        isOpen={Boolean(qrModalReservation)}
        reservation={qrModalReservation}
        onClose={() => setQrModalReservation(null)}
        onCancel={(r) => handleRequestCancel(r)}
      />

      {/* ================================================================
          MODAL: Confirmation d'annulation (Figma #994:17901)
          ================================================================ */}
      <CancelReservationModal
        isOpen={Boolean(confirmCancelReservation)}
        reservation={confirmCancelReservation}
        onClose={() => setConfirmCancelReservation(null)}
        onForbidden={(res, reason) => {
          setConfirmCancelReservation(null);
          setImpossibleCancelReservation({ reservation: res, reason });
        }}
        onSuccess={(id) => {
          setReservations((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, status: 'CANCELLED', cancelledAt: new Date().toISOString() }
                : item
            )
          );
          setNotification({
            message: 'La réservation a été annulée avec succès.',
            type: 'success',
          });
        }}
        previewMode={previewMode}
      />

      {/* ================================================================
          MODALE « ANNULATION IMPOSSIBLE » (Figma #994:18099)
          ================================================================ */}
      <CancelImpossibleModal
        isOpen={Boolean(impossibleCancelReservation)}
        reservation={impossibleCancelReservation?.reservation}
        reason={impossibleCancelReservation?.reason}
        onClose={() => setImpossibleCancelReservation(null)}
      />

      {/* ================================================================
          DIALOG DE RÉSERVATION
          ================================================================ */}
      <ReservationDialog
        isOpen={isReservationDialogOpen}
        offer={selectedOfferForDialog || {
          id: 'off-bakery-01',
          name: 'Panier Surprise Viennoiseries & Pains',
          categoryName: 'Boulangerie & Pâtisserie',
          photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
          discountedPrice: 450,
          originalPrice: 1200,
          quantityAvailable: 4,
          description: 'Composé de baguettes artisanales, croissants au beurre et pains au chocolat dorés du jour, invendus mais préparés avec soin le matin même.',
          pickupStart: '18:00',
          pickupEnd: '19:30',
          shopId: 'shop-01',
          shopName: 'Le Moulin Doré',
          shopAddress: '14 Rue Didouche Mourad, Alger',
          shopDistance: '350m',
          shopRating: 4.8,
          shopReviewCount: 142,
        }}
        onClose={() => setIsReservationDialogOpen(false)}
        onReservationCreated={(newRes) => {
          setReservations((prev) => [newRes, ...prev.filter((r) => r.id !== newRes.id)]);
        }}
        onViewReceipt={(res) => {
          setIsReservationDialogOpen(false);
          setReservations((prev) => [res, ...prev.filter((r) => r.id !== res.id)]);
          setQrModalReservation(res);
        }}
        onSuccess={(newRes) => {
          setIsReservationDialogOpen(false);
          setReservations((prev) => [newRes, ...prev.filter((r) => r.id !== newRes.id)]);
          setNotification({
            message: `Réservation confirmée avec succès ! Code de retrait : ${newRes.pickupCode}`,
            type: 'success',
          });
        }}
        onNavigateToReservations={() => {
          setIsReservationDialogOpen(false);
        }}
        onReserve={onReserve}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single Reservation Row — Figma EL-012fc836
// row, padding 12px 14px 12px 12px, alignItems center, gap 16px,
// fill #FFFAF0, border #DBF0DD 1px, radius 16px
// ---------------------------------------------------------------------------
interface ReservationRowItemProps {
  reservation: Reservation;
  display: DisplayData;
}

const ReservationRowItem: React.FC<ReservationRowItemProps> = ({
  reservation,
  display: d,
}) => {
  const isExpired = d.status === 'EXPIRED';
  const isCancelled = d.status === 'CANCELLED' || d.status === 'REFUSED';

  // Badge styling matching Figma tokens
  const badgeStyle = (() => {
    if (isExpired) {
      // Figma Puce « Expirée » : fill rgba(238,214,134,0.45), text #8c641e, sans bordure
      return {
        bg: 'bg-[rgba(238,214,134,0.45)]',
        border: '',
        text: 'text-[#8c641e]',
        icon: IconCancel,
      };

    }
    if (isCancelled) {
      // Figma Puce Annulée: fill #FBE4E1, text #A3362B
      return { bg: 'bg-[#FBE4E1]', border: '', text: 'text-[#A3362B]', icon: IconCancel };
    }
    if (d.status === 'PICKED_UP') {
      // Figma Puce Retirée: fill #DBF0DD, text #235347
      return { bg: 'bg-[#DBF0DD]', border: '', text: 'text-[#235347]', icon: IconTick };
    }
    // PENDING / ACCEPTED — Figma Puce Acceptée: fill #FDF3D8, text #6B4E00
    return { bg: 'bg-[#FDF3D8]', border: '', text: 'text-[#6B4E00]', icon: IconClock };
  })();

  const isInactive = isCancelled || isExpired;
  // Figma: cancelled price = rgba(11,44,37,0.6), active = #17664E
  const priceColor = isInactive ? 'text-[rgba(11,44,37,0.6)]' : 'text-forsa-emerald';
  // Figma: cancelled photo opacity 0.6
  const photoOpacity = isInactive ? 'opacity-60' : '';

  return (
    <>
      {/* ================================================================
          MOBILE ROW ITEM (< md) — Exact Figma #1:21307 (EL-415b4029)
          ================================================================ */}
      <div className="flex md:hidden items-center justify-between gap-[10px] p-[10px] bg-forsa-cream border border-[#DBF0DD] rounded-[16px] w-full min-w-0">
        {/* Photo produit: 52x52, r12 */}
        <div
          className={`size-[52px] rounded-[12px] bg-[#D9D9D9] shrink-0 flex items-center justify-center text-[10px] text-gray-500 font-medium ${photoOpacity}`}
        >
          Photo
        </div>

        {/* Détails: Titre + Prix, Commerce, Statut */}
        <div className="flex-1 flex flex-col gap-[2px] min-w-0">
          <div className="flex items-center justify-between gap-[6px] min-w-0">
            <span className="font-poppins font-semibold text-[14px] text-forsa-dark truncate">
              {d.productName}
            </span>
            <span
              className={`font-poppins font-bold text-[14px] shrink-0 ${
                isInactive ? 'text-[#78847F]' : 'text-forsa-emerald'
              }`}
            >
              {d.price}
            </span>
          </div>

          <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.72)] truncate">
            {d.shopName} · {d.shopDistance}
          </span>

          <div className="flex items-center gap-[5px] min-w-0">
            <div
              className={`size-[7px] rounded-full shrink-0 ${
                isInactive
                  ? 'bg-[#A3362B]'
                  : d.status === 'PICKED_UP'
                  ? 'bg-forsa-emerald'
                  : 'bg-[#6B4E00]'
              }`}
            />
            <span
              className={`font-poppins font-semibold text-[11px] truncate ${
                isInactive
                  ? 'text-[#A3362B]'
                  : d.status === 'PICKED_UP'
                  ? 'text-[#235347]'
                  : 'text-[#6B4E00]'
              }`}
            >
              {isInactive
                ? 'Annulée · aucun montant dû'
                : d.status === 'PICKED_UP'
                ? 'Retiré · donnez votre avis'
                : 'Ticket prêt · avant 20:00'}
            </span>
          </div>
        </div>

        {/* Mobile Action Button: Round 36x36 (Figma EL-7814dd85) */}
        {d.status === 'PENDING' || d.status === 'ACCEPTED' ? (
          <button
            type="button"
            onClick={() => d.actions[0]?.onClick()}
            className="size-[36px] rounded-full bg-forsa-dark flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/90 active:scale-95 transition-all"
            title="Voir le QR"
          >
            <img
              src={IconQrCode}
              alt="QR Code"
              className="size-[16px]"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </button>
        ) : d.status === 'PICKED_UP' ? (
          <button
            type="button"
            onClick={() => d.actions[0]?.onClick()}
            className="size-[36px] rounded-full bg-forsa-dark flex items-center justify-center shrink-0 cursor-pointer hover:bg-black/90 active:scale-95 transition-all"
            title="Donner un avis"
          >
            <img
              src={IconStar}
              alt="Avis"
              className="size-[14px]"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => d.actions[0]?.onClick()}
            className="size-[36px] rounded-full bg-white border border-[#78847F] flex items-center justify-center shrink-0 cursor-pointer hover:bg-gray-50 active:scale-95 transition-all"
            title="Voir le détail"
          >
            <img src={IconView} alt="Détail" className="size-[14px]" />
          </button>
        )}
      </div>

      {/* ================================================================
          DESKTOP ROW ITEM (md+) — Figma Desktop #1:15489
          100% intact desktop representation
          ================================================================ */}
      <div className="hidden md:flex items-center justify-between gap-[16px] p-[12px_14px_12px_12px] bg-forsa-cream border border-[#DBF0DD] rounded-[16px] hover:border-forsa-sand transition-colors w-full min-w-0">
        <div
          className={`size-[72px] rounded-[14px] bg-[#D9D9D9] shrink-0 flex items-center justify-center text-[10px] text-gray-500 font-medium ${photoOpacity}`}
        >
          Photo
        </div>

        <div className="flex-1 flex flex-col gap-[4px] min-w-0">
          <div className="flex items-center gap-[8px] min-w-0">
            <span className="font-poppins font-semibold text-[14px] text-forsa-dark truncate">
              {d.productName}
            </span>
            <div
              className={`flex items-center gap-[6px] py-[5px] pl-[10px] pr-[12px] rounded-full shrink-0 ${badgeStyle.bg} ${badgeStyle.border || ''}`}
            >
              <img src={badgeStyle.icon} alt="" className="size-[13px]" />
              <span className={`font-poppins font-semibold text-[11px] ${badgeStyle.text}`}>
                {d.badgeLabel}
              </span>
            </div>
          </div>

          <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.71)] truncate">
            {d.shopName} · {d.shopDistance} · {d.quantity}
          </span>

          <span className="font-poppins font-semibold text-[11px] text-forsa-dark truncate">
            {d.dateLabel}
          </span>

          {d.progressLabel !== undefined && !isInactive && (
            <div className="flex items-center gap-[10px] min-w-0">
              <div className="relative w-[110px] h-[6px] bg-[#EBEEE1] rounded-[3px] shrink-0">
                <div
                  className="absolute top-0 left-0 h-[6px] bg-forsa-emerald rounded-[3px]"
                  style={{ width: `${d.progressPercent ?? 0}%` }}
                />
              </div>
              <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.71)] truncate min-w-0">
                {d.progressLabel}
              </span>
            </div>
          )}

          {d.infoBox && (
            <div
              className={`inline-flex px-[10px] py-[4px] rounded-[8px] w-fit max-w-full ${
                isExpired ? 'bg-[rgba(238,214,134,0.4)]' : 'bg-[#FBE4E1]'
              }`}
            >
              <span
                className={`font-poppins font-normal text-[11px] truncate ${
                  isExpired ? 'text-[#8c641e]' : 'text-[#A3362B]'
                }`}
              >
                {d.infoBox}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-center gap-[10px] shrink-0">
          <span className={`font-poppins font-bold text-[16px] ${priceColor}`}>{d.price}</span>
          <div className="flex items-center gap-[8px]">
            {d.actions.map((a) => (
              <button
                key={a.id}
                disabled={a.disabled}
                onClick={a.onClick}
                className={
                  a.variant === 'primary'
                    ? 'flex items-center justify-center gap-[8px] h-[36px] px-[14px] bg-forsa-dark text-white rounded-[10px] font-poppins font-semibold text-[12px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer whitespace-nowrap'
                    : 'flex items-center justify-center gap-[8px] h-[36px] px-[14px] border border-forsa-muted rounded-[10px] font-poppins font-semibold text-[12px] text-forsa-dark hover:bg-gray-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap'
                }
              >
                {a.icon && (
                  <img
                    src={a.icon}
                    alt=""
                    className="size-[14px]"
                    style={a.variant === 'primary' ? { filter: 'brightness(0) invert(1)' } : undefined}
                  />
                )}
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReservationList;
