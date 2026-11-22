import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Reservation, ReservationStatus } from './types';
import { ReservationsApi } from './services/reservationsApi';
import { CancelReservationModal } from './CancelReservationModal';
import { CancelImpossibleModal } from './CancelImpossibleModal';
import { ReservationSkeleton } from './ReservationSkeleton';
import { ExpiredBanner } from './ExpiredBanner';
import { ReceiptTicketModal } from './ReceiptTicketModal';
import { ReservationDialog, type OfferDetail } from './ReservationDialog';

// SVG icon imports from assets/icons
import IconClock from './assets/icons/Icône clock-01.svg';
import IconTick from './assets/icons/Icône tick-02.svg';
import IconTime from './assets/icons/Icône time-02.svg';
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
      return `Aujourd’hui · ${startTime} – ${endTime}`;
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

// ----- Reusable Icon Pastilles -----
const CardIconPastille: React.FC<{ icon: string; alt: string }> = ({ icon, alt }) => (
  <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[#EEF7EC] border border-[#235347] shrink-0">
    <img src={icon} alt={alt} className="w-[22px] h-[22px]" />
  </div>
);

const SmallPastille: React.FC<{ icon: string; alt: string }> = ({ icon, alt }) => (
  <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#EBEEE1] shrink-0">
    <img src={icon} alt={alt} className="w-[20px] h-[20px]" />
  </div>
);

export const ReservationList: React.FC<ReservationListProps> = ({
  onSelect,
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
  }, []);

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
      (r) => r.status === 'CANCELLED' || r.status === 'REFUSED' || r.status === 'EXPIRED'
    ).length;
    return { all: reservations.length, active, pickedUp, cancelled };
  }, [reservations]);

  // The next active reservation for the "Prochain retrait" card
  const nextPickup = useMemo(
    () => reservations.find((r) => r.status === 'PENDING' || r.status === 'ACCEPTED'),
    [reservations]
  );

  // Check for expired reservations
  const expiredReservation = useMemo(
    () => reservations.find((r) => r.status === 'EXPIRED'),
    [reservations]
  );

  // Filtered list for "Autres réservations" (excludes the nextPickup item)
  const filteredList = useMemo(() => {
    const others = reservations.filter((r) => r.id !== nextPickup?.id);
    if (activeTab === 'all') return others;
    if (activeTab === 'active')
      return others.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED');
    if (activeTab === 'picked_up')
      return others.filter((r) => r.status === 'PICKED_UP');
    return others.filter(
      (r) => r.status === 'CANCELLED' || r.status === 'REFUSED' || r.status === 'EXPIRED'
    );
  }, [reservations, activeTab, nextPickup]);

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
    (r: Reservation, isMainCard = false): DisplayData => {
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
        const actions: ActionDef[] = isMainCard
          ? [
              {
                id: 'view',
                label: 'Voir le justificatif',
                variant: 'primary',
                icon: IconArrowRight,
                onClick: () => setQrModalReservation(r),
              },
              {
                id: 'cancel',
                label: 'Annuler',
                variant: 'outline',
                onClick: () => handleRequestCancel(r),
              },
            ]
          : [
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
            ];

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
          actions,
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
          ? 'Aujourd’hui · retrait expiré à 20:00'
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
            onClick: () => onSelect(r.id),
          },
        ],
      };
    },
    [onSelect, handleRequestCancel]
  );

  // Navigation handlers
  const handleExploreOffers = () => {
    setIsReservationDialogOpen(true);
  };

  const handleViewHistory = () => {
    setActiveTab('picked_up');
    const el = document.getElementById('autres-reservations-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };



  return (
    <div className="w-full flex flex-col gap-[24px] p-4 sm:p-6 lg:p-[30px_40px_28px] min-h-screen bg-forsa-cream font-poppins">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border transition-all ${
            notification.type === 'success'
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
          PAGE HEADER (Common across all states)
          ================================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[20px] md:gap-[24px]">
        {/* Page introduction */}
        <div className="flex flex-col gap-[3px] flex-1 min-w-0">
          <span className="font-poppins font-normal text-[11px] text-forsa-dark">
            Mon espace / Mes réservations
          </span>
          <h1 className="font-poppins font-semibold text-[32px] sm:text-[40px] md:text-[48px] leading-[1.2] md:leading-[1.5em] tracking-[-0.0167em] text-forsa-dark">
            Mes réservations
          </h1>
          <p className="font-poppins font-normal text-[16px] sm:text-[18px] md:text-[20px] leading-[1.4] md:leading-[1.5em] text-[rgba(11,44,37,0.71)]">
            Retrouvez vos codes de retrait et suivez chaque réservation.
          </p>
        </div>

        {/* Account actions */}
        <div className="flex items-center gap-[14px] shrink-0 self-start md:self-auto">
          {/* Location */}
          <div className="flex items-center gap-[7px] pr-[12px]">
            <img src={IconLocation} alt="Localisation" className="w-[18px] h-[18px]" />
            <span className="font-poppins font-normal text-[12px] leading-[1.5em] text-forsa-dark">
              Bab Ezzouar, Alger
            </span>
          </div>
          {/* Nouveau Panier / Réserver (Figma #717:14855) */}
          <button
            type="button"
            onClick={() => setIsReservationDialogOpen(true)}
            className="flex items-center gap-[6px] h-[36px] px-[13px] bg-[#0B2C25] text-[#FFFAF0] rounded-[10px] font-poppins font-medium text-[12px] hover:bg-black/90 active:scale-95 transition-all shadow-xs cursor-pointer"
            title="Réserver un panier (Figma #717:14855)"
          >
            <img src={IconHandBag} alt="" className="w-[14px] h-[14px] brightness-200" />
            <span>+ Réserver</span>
          </button>
          {/* Notification bell */}
          <div
            className="relative flex items-center justify-center w-[42px] h-[42px] rounded-full hover:bg-black/5 cursor-pointer transition-colors"
            title="Notifications"
          >
            <img src={IconCalendar} alt="Notifications" className="w-[22px] h-[22px]" />
            <span className="absolute top-[8px] right-[8px] w-[7px] h-[7px] rounded-full bg-forsa-emerald border-[1.5px] border-white" />
          </div>
          {/* Avatar placeholder */}
          <div
            className="w-[48px] h-[48px] rounded-full bg-[#D9D9D9] border-2 border-white shadow-sm flex items-center justify-center font-bold text-xs text-forsa-dark"
            title="Mon profil"
          >
            CL
          </div>
        </div>
      </div>

      {/* ================================================================
          1. ÉTAT DE CHARGEMENT – SKELETON (Figma #994:17344)
          ================================================================ */}
      {loading && <ReservationSkeleton />}

      {/* ================================================================
          MAIN CONTENT COLUMNS (when not loading)
          ================================================================ */}
      {!loading && (
        <div className="flex flex-col lg:flex-row gap-[24px] items-start w-full">
          {/* ============================================================
              MAIN COLUMN
              ============================================================ */}
          <div className="flex-1 flex flex-col gap-[24px] min-w-0 w-full">
            {/* ----------------------------------------------------------
                4. BANNIÈRE DE RÉSERVATION EXPIRÉE (Figma #994:17552)
                Displayed ONLY when at least one reservation is expired.
                ---------------------------------------------------------- */}
            {expiredReservation && !errorMessage && (
              <ExpiredBanner
                reservation={expiredReservation}
                onExploreOffers={handleExploreOffers}
              />
            )}

            {/* ----------------------------------------------------------
                3. ÉTAT D'ERREUR DE CHARGEMENT (Figma #994:17436)
                ---------------------------------------------------------- */}
            {errorMessage ? (
              <div className="flex flex-col gap-[16px] p-4 sm:p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
                <div className="flex items-center gap-[12px]">
                  <CardIconPastille icon={IconCalendar} alt="Autres réservations" />
                  <span className="font-poppins font-medium text-[18px] sm:text-[20px] text-forsa-dark">
                    Autres réservations
                  </span>
                </div>

                {/* Error container matching Figma #994:17469 */}
                <div className="flex flex-col items-center justify-center text-center py-[56px] px-4 gap-[16px]">
                  {/* Pastille icône cancel-01 - 72x72, borderRadius: 44px, fill: #F7DCD8 */}
                  <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[#F7DCD8] shrink-0">
                    <img src={IconCancel} alt="" className="w-[32px] h-[32px]" />
                  </div>

                  {/* Titre - 18px SemiBold #0B2C25 */}
                  <h3 className="font-poppins font-semibold text-[18px] text-[#0B2C25]">
                    Impossible de charger vos réservations
                  </h3>

                  {/* Subtitle - 14px Regular rgba(11, 44, 37, 0.7), w: 420px */}
                  <p className="max-w-[420px] font-poppins font-normal text-[14px] leading-[1.5] text-[rgba(11,44,37,0.7)]">
                    Vérifiez votre connexion puis réessayez. Vos tickets ne sont pas perdus.
                  </p>

                  {/* Actions - mode row, gap 12px */}
                  <div className="flex items-center gap-[12px] pt-[8px]">
                    <button
                      type="button"
                      onClick={loadReservations}
                      className="flex items-center justify-center h-[44px] px-[24px] bg-[#0B2C25] text-white rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer shadow-xs"
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
              <>
                {/* ------------------------------------------------------
                    CARTE: Prochain retrait (Figma #994:17060 / #994:17731)
                    ABSENT when no active reservation or empty list!
                    ------------------------------------------------------ */}
                {nextPickup && (
                  <div className="flex flex-col gap-[16px] p-4 sm:p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-[12px]">
                        <CardIconPastille icon={IconClock} alt="Prochain retrait" />
                        <span className="font-poppins font-medium text-[18px] sm:text-[20px] text-forsa-dark">
                          Prochain retrait
                        </span>
                      </div>
                      {/* Badge Ticket prêt */}
                      <div className="flex items-center gap-[6px] px-[12px] py-[5px] pl-[10px] bg-[#EEF7EC] rounded-full">
                        <img src={IconTick} alt="" className="w-[13px] h-[13px]" />
                        <span className="font-poppins font-semibold text-[11px] text-[#235347]">
                          {nextPickup.status === 'ACCEPTED' ? 'Ticket prêt' : 'En attente'}
                        </span>
                      </div>
                    </div>

                    {/* Card content */}
                    {(() => {
                      const npData = getDisplayData(nextPickup, true);
                      return (
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-[20px]">
                          {/* Product photo placeholder */}
                          <div className="w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-[16px] bg-[#D9D9D9] shrink-0 flex items-center justify-center text-xs text-gray-500 font-medium">
                            Photo
                          </div>

                          {/* Details */}
                          <div className="flex-1 flex flex-col gap-[10px] min-w-0 w-full">
                            <span className="font-poppins font-semibold text-[18px] sm:text-[20px] text-forsa-dark truncate">
                              {npData.productName} · {npData.quantity}
                            </span>

                            <div className="flex items-center gap-[6px]">
                              <img src={IconLocation} alt="" className="w-[16px] h-[16px]" />
                              <span className="font-poppins font-normal text-[13px] text-[rgba(11,44,37,0.71)]">
                                {npData.shopName} · {npData.shopDistance}
                              </span>
                            </div>

                            {/* Info pills */}
                            <div className="flex items-center gap-[8px] flex-wrap">
                              <div className="flex items-center gap-[6px] py-[5px] pl-[10px] pr-[12px] bg-[#FDF3D8] rounded-full">
                                <img src={IconTime} alt="" className="w-[13px] h-[13px]" />
                                <span className="font-poppins font-semibold text-[11px] text-forsa-dark">
                                  {npData.dateLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-[6px] py-[5px] pl-[10px] pr-[12px] bg-[#EBEEE1] rounded-full">
                                <img src={IconWallet} alt="" className="w-[13px] h-[13px]" />
                                <span className="font-poppins font-semibold text-[11px] text-forsa-dark">
                                  {npData.price} à payer sur place
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-[10px] pt-1 flex-wrap">
                              {npData.actions.map((a) => (
                                <button
                                  key={a.id}
                                  disabled={a.disabled}
                                  onClick={a.onClick}
                                  className={
                                    a.variant === 'primary'
                                      ? 'flex items-center justify-center gap-[8px] h-[42px] px-[16px] bg-forsa-dark text-white rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer'
                                      : 'flex items-center justify-center h-[42px] px-[16px] border border-forsa-muted rounded-[12px] font-poppins font-semibold text-[13px] text-forsa-dark hover:bg-gray-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50'
                                  }
                                >
                                  <span>{a.label}</span>
                                  {a.icon && (
                                    <img
                                      src={a.icon}
                                      alt=""
                                      className="w-[16px] h-[16px]"
                                      style={{ filter: 'brightness(0) invert(1)' }}
                                    />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Pickup code block */}
                          <div className="flex flex-col items-center gap-[6px] p-[14px] bg-forsa-cream border border-[#DBF0DD] rounded-[16px] shrink-0 self-center md:self-auto shadow-sm">
                            <div className="flex items-center justify-center p-[7.2px] bg-white border-[0.9px] border-[#E8EBDF] rounded-[12.6px]">
                              {nextPickup.qrCodeData ? (
                                <img
                                  src={nextPickup.qrCodeData}
                                  alt={`QR Code ${nextPickup.pickupCode}`}
                                  className="w-[99px] h-[99px] object-contain"
                                />
                              ) : (
                                <img src={IconMotifQR} alt="QR Code" className="w-[99px] h-[99px]" />
                              )}
                            </div>
                            <span className="font-poppins font-semibold text-[14px] text-forsa-dark tracking-wide">
                              {nextPickup.pickupCode}
                            </span>
                            <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.71)]">
                              Code de retrait
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ------------------------------------------------------
                    CARTE: Autres réservations (ou ÉTAT « LISTE VIDE »)
                    ------------------------------------------------------ */}
                <div
                  id="autres-reservations-section"
                  className="flex flex-col gap-[16px] p-4 sm:p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm"
                >
                  {/* Card header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[14px]">
                    <div className="flex items-center gap-[12px]">
                      <CardIconPastille icon={IconCalendar} alt="Autres réservations" />
                      <span className="font-poppins font-medium text-[18px] sm:text-[20px] text-forsa-dark">
                        Autres réservations
                      </span>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-[6px] overflow-x-auto pb-1 sm:pb-0">
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
                                ? 'bg-forsa-dark text-white shadow-sm'
                                : 'bg-white border-[1.5px] border-[#DBF0DD] text-forsa-dark hover:bg-gray-50'
                            }`}
                          >
                            {tab.label} · {tab.count}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* --------------------------------------------------
                      1. ÉTAT « LISTE VIDE » (Figma #994:17249 / #994:17282)
                      Displayed when backend returns zero reservation.
                      -------------------------------------------------- */}
                  {reservations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-[56px] px-4 gap-[16px]">
                      {/* Pastille icône calendar-03: 72x72, borderRadius: 44px, fill: rgba(219, 240, 221, 0.6) */}
                      <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[rgba(219,240,221,0.6)] shrink-0">
                        <img src={IconCalendar} alt="" className="w-[32px] h-[32px]" />
                      </div>

                      {/* Titre: 18px SemiBold #0B2C25 */}
                      <h3 className="font-poppins font-semibold text-[18px] text-[#0B2C25]">
                        Aucune réservation pour le moment
                      </h3>

                      {/* Description: 14px Regular rgba(11, 44, 37, 0.7), max-w: 440px */}
                      <p className="max-w-[440px] font-poppins font-normal text-[14px] leading-[1.5] text-[rgba(11,44,37,0.7)]">
                        Parcourez les offres près de chez vous et réservez en quelques secondes : votre
                        ticket apparaîtra ici.
                      </p>

                      {/* Bouton Explorer les offres: 44px height, #0B2C25, white */}
                      <div className="pt-[4px]">
                        <button
                          type="button"
                          onClick={handleExploreOffers}
                          className="flex items-center justify-center gap-[8px] h-[44px] px-[24px] bg-[#0B2C25] text-white rounded-[12px] font-poppins font-semibold text-[13px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer shadow-xs"
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
                    /* Reservation rows in category */
                    <div className="flex flex-col gap-[10px]">
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
                          const d = getDisplayData(r);
                          return (
                            <ReservationRowItem
                              key={r.id}
                              reservation={r}
                              display={d}
                              onSelect={onSelect}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ============================================================
              SIDEBAR COLUMN
              ============================================================ */}
          <div className="w-full lg:w-[340px] flex flex-col gap-[24px] shrink-0">
            {/* ----------------------------------------------------------
                CARD: Mon activité
                ---------------------------------------------------------- */}
            <div className="flex flex-col gap-[20px] p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
              <div className="flex items-center gap-[12px]">
                <CardIconPastille icon={IconCalendar} alt="Mon activité" />
                <span className="font-poppins font-medium text-[20px] text-forsa-dark">
                  Mon activité
                </span>
              </div>

              {/* Stat tiles */}
              <div className="flex gap-[10px]">
                {/* En cours */}
                <div
                  onClick={() => setActiveTab('active')}
                  className="flex-1 flex flex-col items-center gap-[4px] py-[14px] px-[6px] bg-[#FDF3D8] rounded-[16px] cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={IconClock} alt="" className="w-[20px] h-[20px]" />
                  <span className="font-poppins font-bold text-[22px] text-forsa-dark">
                    {counts.active}
                  </span>
                  <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                    En cours
                  </span>
                </div>

                {/* Retirées */}
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

                {/* Annulées */}
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

              {/* À régler sur place */}
              <div className="flex items-center gap-[12px] p-[12px_14px_12px_12px] bg-[#EEF7EC] border border-[#DBF0DD] rounded-[16px]">
                <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-forsa-emerald shrink-0">
                  <img
                    src={IconWallet}
                    alt=""
                    className="w-[20px] h-[20px]"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                </div>
                <div className="flex flex-col gap-[1px]">
                  <span className="font-poppins font-semibold text-[14px] text-forsa-dark">
                    {totalToPay} DA à régler sur place
                  </span>
                  <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                    {counts.active === 0
                      ? 'Aucun retrait prévu'
                      : `${counts.active} retrait${counts.active > 1 ? 's' : ''} en attente`}
                  </span>
                </div>
              </div>

              {/* Link */}
              <button
                onClick={handleViewHistory}
                className="font-poppins font-semibold text-[12px] text-forsa-emerald text-left hover:underline cursor-pointer"
              >
                Voir l&apos;historique {'  →'}
              </button>
            </div>

            {/* ----------------------------------------------------------
                CARD: Bon à savoir
                ---------------------------------------------------------- */}
            <div className="flex flex-col gap-[8px] p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
              <div className="flex items-center gap-[12px]">
                <CardIconPastille icon={IconCheckmark} alt="Bon à savoir" />
                <span className="font-poppins font-medium text-[20px] text-forsa-dark">
                  Bon à savoir
                </span>
              </div>

              <div className="h-[1px] bg-[#EBEEE1]" />

              {/* Tip rows */}
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
                      <span className="font-poppins font-semibold text-[14px] text-forsa-dark">
                        {tip.title}
                      </span>
                      <span className="font-poppins font-normal text-[11px] text-forsa-dark">
                        {tip.sub}
                      </span>
                    </div>
                  </div>
                  {idx < arr.length - 1 && <div className="h-[1px] bg-[#EBEEE1]" />}
                </React.Fragment>
              ))}

              <div className="h-[1px] bg-[#EBEEE1]" />

              {/* Explorer les offres button */}
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
          1. TICKET DE CAISSE QR CODE & JUSTIFICATIF (Figma #838:30359)
          Sortie progressive depuis la fente imprimante thermique
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
      />

      {/* ================================================================
          5. MODALE « ANNULATION IMPOSSIBLE » (Figma #994:18099)
          ================================================================ */}
      <CancelImpossibleModal
        isOpen={Boolean(impossibleCancelReservation)}
        reservation={impossibleCancelReservation?.reservation}
        reason={impossibleCancelReservation?.reason}
        onClose={() => setImpossibleCancelReservation(null)}
      />

      {/* ================================================================
          DIALOG DE RÉSERVATION / AJOUT AU PANIER (Figma #717:14855 / #717:13896)
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
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single Reservation row in "Autres réservations"
// ---------------------------------------------------------------------------
interface ReservationRowItemProps {
  reservation: Reservation;
  display: DisplayData;
  onSelect: (id: string) => void;
}

const ReservationRowItem: React.FC<ReservationRowItemProps> = ({
  reservation,
  display: d,
  onSelect,
}) => {
  const isExpired = d.status === 'EXPIRED';
  const isCancelled = d.status === 'CANCELLED' || d.status === 'REFUSED';

  // Badge styling matching Figma tokens
  const badgeStyle = (() => {
    if (isExpired) {
      return {
        bg: 'bg-[#FDF3D8]',
        border: 'border border-[#EED686]',
        text: 'text-[#8A5B00]',
        icon: IconCancel,
      };
    }
    if (isCancelled) {
      return { bg: 'bg-[#FBE4E1]', border: '', text: 'text-[#A3362B]', icon: IconCancel };
    }
    if (d.status === 'PICKED_UP') {
      return { bg: 'bg-[#DBF0DD]', border: '', text: 'text-[#235347]', icon: IconTick };
    }
    // PENDING / ACCEPTED
    return { bg: 'bg-[#FDF3D8]', border: '', text: 'text-[#6B4E00]', icon: IconClock };
  })();

  const isInactive = isCancelled || isExpired;
  const priceColor = isInactive ? 'text-[rgba(11,44,37,0.6)]' : 'text-forsa-emerald';
  const photoOpacity = isInactive ? 'opacity-60' : '';

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] p-[12px_14px_12px_12px] bg-forsa-cream border border-[#DBF0DD] rounded-[16px] hover:border-forsa-sand transition-all"
    >
      <div
        className="flex items-center gap-[16px] flex-1 min-w-0 cursor-pointer"
        onClick={() => onSelect(reservation.id)}
      >
        {/* Photo placeholder (opacity: 60% for expired/cancelled in Figma #994:17577) */}
        <div
          className={`w-[72px] h-[72px] rounded-[14px] bg-[#D9D9D9] shrink-0 flex items-center justify-center text-[10px] text-gray-500 font-medium ${photoOpacity}`}
        >
          Photo
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col gap-[4px] min-w-0">
          <div className="flex items-center gap-[8px] flex-wrap">
            <span className="font-poppins font-semibold text-[14px] text-forsa-dark truncate">
              {d.productName}
            </span>
            {/* Badge */}
            <div
              className={`flex items-center gap-[6px] py-[4px] pl-[8px] pr-[10px] rounded-full shrink-0 ${badgeStyle.bg} ${badgeStyle.border || ''}`}
            >
              <img src={badgeStyle.icon} alt="" className="w-[12px] h-[12px]" />
              <span className={`font-poppins font-semibold text-[11px] ${badgeStyle.text}`}>
                {d.badgeLabel}
              </span>
            </div>
          </div>

          <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.71)]">
            {d.shopName} · {d.shopDistance} · {d.quantity}
          </span>

          <span className="font-poppins font-semibold text-[11px] text-forsa-dark">
            {d.dateLabel}
          </span>

          {/* Progress bar */}
          {d.progressLabel !== undefined && !isInactive && (
            <div className="flex items-center gap-[10px]">
              <div className="relative w-[110px] h-[6px] bg-[#EBEEE1] rounded-[3px]">
                <div
                  className="absolute top-0 left-0 h-[6px] bg-forsa-emerald rounded-[3px]"
                  style={{ width: `${d.progressPercent ?? 0}%` }}
                />
              </div>
              <span className="font-poppins font-normal text-[11px] text-[rgba(11,44,37,0.71)] truncate">
                {d.progressLabel}
              </span>
            </div>
          )}

          {/* Information box: amber for expired (Figma #994:17586), coral for cancelled */}
          {d.infoBox && (
            <div
              className={`inline-flex px-[10px] py-[4px] rounded-[8px] mt-[2px] w-fit ${
                isExpired ? 'bg-[#FCF3D6] border border-[#EED686]/60' : 'bg-[#FBE4E1]'
              }`}
            >
              <span
                className={`font-poppins font-normal text-[11px] ${
                  isExpired ? 'text-[#8A5B00]' : 'text-[#A3362B]'
                }`}
              >
                {d.infoBox}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Price + actions */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-[10px] shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EBEEE1]">
        <span className={`font-poppins font-bold text-[16px] ${priceColor}`}>{d.price}</span>

        {/* Action buttons */}
        <div className="flex items-center gap-[8px]" onClick={(e) => e.stopPropagation()}>
          {d.actions.map((a) => (
            <button
              key={a.id}
              disabled={a.disabled}
              onClick={a.onClick}
              className={
                a.variant === 'primary'
                  ? 'flex items-center justify-center gap-[8px] h-[36px] px-[14px] bg-forsa-dark text-white rounded-[10px] font-poppins font-semibold text-[12px] hover:bg-black/90 active:scale-95 transition-all cursor-pointer'
                  : 'flex items-center justify-center gap-[8px] h-[36px] px-[14px] border border-forsa-muted rounded-[10px] font-poppins font-semibold text-[12px] text-forsa-dark hover:bg-gray-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50'
              }
            >
              {a.icon && (
                <img
                  src={a.icon}
                  alt=""
                  className="w-[14px] h-[14px]"
                  style={a.variant === 'primary' ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
              )}
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReservationList;
