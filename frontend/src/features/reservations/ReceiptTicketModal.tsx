import React, { useEffect } from 'react';
import type { Reservation } from './types';
import './ticket-animation.css';

import IconHeaderLocation from './assets/icons/header-location.svg';
import IconHeaderBell from './assets/icons/header-bell.svg';
import IconHeaderDot from './assets/icons/header-unread-dot.svg';

import ImgTicketZigzag from './assets/receipt/ticket-zigzag.svg';
import ImgTicketBorder from './assets/receipt/ticket-border.svg';
import ImgTicketDots from './assets/receipt/ticket-dots.svg';
import ImgTicketQr from './assets/receipt/ticket-qr.svg';
import ImgPrinterLed from './assets/receipt/printer-led.svg';
import ImgStatusTick from './assets/receipt/status-tick.svg';
import ImgArrowLeft from './assets/receipt/arrow-left.svg';
import ImgDarkTick from './assets/receipt/dark-tick.svg';
import ImgDarkClock from './assets/receipt/dark-clock.svg';
import ImgTrackCheck from './assets/receipt/track-check-circle.svg';
import ImgStepTick from './assets/receipt/step-tick.svg';
import ImgStepCurrent from './assets/receipt/step-current.svg';
import ImgStepStar from './assets/receipt/step-star.svg';
import ImgMapBg from './assets/receipt/map-bg.svg';
import ImgPinLocation from './assets/receipt/pin-location.svg';
import ImgNav from './assets/receipt/nav.svg';
import ImgTipQr from './assets/receipt/tip-qr.svg';
import ImgTipWallet from './assets/receipt/tip-wallet.svg';
import ImgTipBag from './assets/receipt/tip-bag.svg';

interface ReceiptTicketModalProps {
  isOpen: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onCancel?: (reservation: Reservation) => void;
}

/** Durée de sortie du ticket (choix d'implémentation, pas une valeur Figma). */
const TICKET_ANIMATION_DURATION_S = 1.8;

/** Icône Figma : conteneur + insets exacts exportés par Figma. */
const FigIcon: React.FC<{ src: string; size: number; inset: string; inner: string }> = ({
  src,
  size,
  inset,
  inner,
}) => (
  <div className="relative shrink-0 overflow-clip" style={{ width: size, height: size }}>
    <div className="absolute" style={{ inset }}>
      <div className="absolute" style={{ inset: inner }}>
        <img src={src} alt="" className="block size-full max-w-none" />
      </div>
    </div>
  </div>
);

const Dots: React.FC<{ top: number }> = ({ top }) => (
  <div className="absolute left-[33.6px] w-[280.8px]" style={{ top }}>
    <img src={ImgTicketDots} alt="" className="block w-full max-w-none -mt-[1.2px]" />
  </div>
);

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const isValid = (d: Date) => !Number.isNaN(d.getTime());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayLabel = (d: Date) => {
  const now = new Date();
  if (sameDay(d, now)) return 'Aujourd’hui';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Hier';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export const ReceiptTicketModal: React.FC<ReceiptTicketModalProps> = ({
  isOpen,
  reservation,
  onClose,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !reservation) return null;

  const productName = reservation.offerTitle || 'Commande FORSA';
  const shopName = reservation.shopName || 'Commerce partenaire';
  const shopDistance = reservation.shopDistance || 'Bab Ezzouar · 350 m';
  const totalNum = Math.round(parseFloat(reservation.totalPrice) || 0);
  const price = `${totalNum} DA`;
  const unitPrice =
    reservation.quantity > 0 ? `${Math.round(totalNum / reservation.quantity)} DA` : price;
  const unitsLabel = `${reservation.quantity} unité${reservation.quantity > 1 ? 's' : ''} × ${unitPrice}`;
  const reservationNum = `FORSA-${(reservation.pickupCode || '3010').replace('-', '')}-${reservation.id
    .slice(-3)
    .toUpperCase()}`;

  const start = new Date(reservation.pickupStart);
  const end = new Date(reservation.pickupEnd);
  const created = new Date(reservation.createdAt);
  const startStr = isValid(start) ? hhmm(start) : '16:00';
  const endStr = isValid(end) ? hhmm(end) : '20:00';
  const slotStr = `${startStr} – ${endStr}`;
  const retraitDate = isValid(start)
    ? `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`
    : '';
  const retraitLine = `RETRAIT : ${retraitDate ? `${retraitDate} · ` : ''}${slotStr}`;
  const createdLine = isValid(created) ? `${dayLabel(created)} · ${hhmm(created)}` : 'Hier · 18:42';

  // Temps restant + progression (carte sombre)
  const now = Date.now();
  const totalMs = isValid(start) && isValid(end) ? end.getTime() - start.getTime() : 0;
  const remainingMs = isValid(end) ? end.getTime() - now : 0;
  const progressPct =
    totalMs > 0 ? Math.min(100, Math.max(0, ((now - start.getTime()) / totalMs) * 100)) : 0;
  const remainingLabel = (() => {
    if (remainingMs <= 0) return 'Créneau terminé';
    const h = Math.floor(remainingMs / 3600000);
    const m = Math.round((remainingMs % 3600000) / 60000);
    return h > 0 ? `Il vous reste ${h} h ${pad(m)}` : `Il vous reste ${m} min`;
  })();
  const slotDayLabel = isValid(start) ? dayLabel(start) : 'Aujourd’hui';

  const isAccepted = reservation.status === 'ACCEPTED';
  const isPending = reservation.status === 'PENDING';
  const isPickedUp = reservation.status === 'PICKED_UP';
  const isExpired = reservation.status === 'EXPIRED';
  const isCancelled = reservation.status === 'CANCELLED' || reservation.status === 'REFUSED';
  const canCancel = (isPending || isAccepted) && !!onCancel;

  const statusLabel = isPickedUp
    ? 'Retirée · ticket scanné'
    : isExpired
      ? 'Réservation expirée'
      : isCancelled
        ? 'Réservation annulée'
        : 'Réservation confirmée'; // TODO-FIGMA : « Retrait confirmé » (1:16985) non lu

  const darkTitle = isPickedUp
    ? 'Retiré'
    : isExpired
      ? 'Expiré'
      : isCancelled
        ? 'Annulée'
        : 'Prêt à retirer';
  const darkSubtitle = isPickedUp
    ? 'Ticket scanné en magasin'
    : 'Ticket généré · à scanner en magasin';

  // Suivi : 4 étapes (Réservée, Ticket généré, Retrait, Avis)
  const stage = isPickedUp ? 4 : 3; // TODO-FIGMA : états annulée / expirée du suivi non lus
  const stepDone = (n: number) => n < stage;

  return (
    <div
      className="fixed inset-y-0 right-0 left-[238px] z-20 overflow-y-auto bg-[#FFFAF0] font-poppins"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex flex-col gap-[24px] pb-[28px] pt-[30px] px-[40px]">
        {/* ===== Page header — Figma 1:16543 ===== */}
        <div className="flex flex-row items-center justify-between gap-[24px] w-full">
          <div className="flex min-w-px flex-1 flex-col gap-[3px] whitespace-nowrap text-[#0B2C25]">
            <p className="text-[11px] font-normal">Mon espace / Mes réservations / Justificatif</p>
            <p className="text-[48px] font-semibold">Justificatif de retrait</p>
            <p className="text-[20px] font-normal">
              Présentez ce QR code au commerçant : lui seul confirme le retrait après votre règlement en magasin.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[14px]">
            <button
              type="button"
              onClick={onClose}
              className="flex h-[42px] cursor-pointer items-center justify-center gap-[8px] rounded-[12px] border border-[#78847F] px-[16px]"
            >
              <div className="relative size-[16px] shrink-0 overflow-clip">
                <div
                  className="absolute flex items-center justify-center inset-[29.17%_16.66%_29.16%_16.67%]"
                  style={{ containerType: 'size' }}
                >
                  <div className="-rotate-90 flex-none h-[16px] w-[16px]">
                    <div className="relative size-full">
                      <div className="absolute inset-[-7.04%_-11.25%_-7.02%_-11.26%]">
                        <img src={ImgArrowLeft} alt="" className="block size-full max-w-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-[13px] font-semibold text-[#0B2C25]">Mes réservations</span>
            </button>
            <div className="flex items-center gap-[7px] pr-[12px]">
              <FigIcon src={IconHeaderLocation} size={18} inset="8.33% 12.49% 8.33% 12.5%" inner="-5% -5.56%" />
              <span className="text-[12px] font-normal leading-[1.5] text-[#0B2C25] whitespace-nowrap">
                Bab Ezzouar, Alger
              </span>
            </div>
            <div className="relative flex size-[42px] shrink-0 items-center justify-center rounded-full">
              <FigIcon src={IconHeaderBell} size={22} inset="8.33% 12.5%" inner="-4.09% -4.55%" />
              <div className="absolute left-[27px] top-[8px] size-[7px]">
                <img src={IconHeaderDot} alt="" className="absolute inset-0 block size-full max-w-none" />
              </div>
            </div>
            {/* Avatar : photo fournie par le backend */}
            <div className="flex size-[48px] shrink-0 items-center justify-center rounded-full bg-[#D9D9D9]" />
          </div>
        </div>

        {/* ===== Colonnes — Figma 1:16559 ===== */}
        <div className="content-start flex flex-wrap gap-[24px] items-start overflow-clip w-full">
          {/* ---------- Scène du ticket (1:16560) ---------- */}
          <div className="flex flex-col h-[787px] items-center justify-center p-[16px] rounded-[32px] shrink-0 w-[500px]">
            <div className="relative h-[743px] shrink-0 w-[468px]">
                  {/* Sortie du ticket : rogne le ticket (1:16562) */}
                  <div className="absolute left-0 top-[25.2px] h-[717.6px] w-[468px] overflow-clip">
                    {/* Ticket justificatif (1:16563) : toutes les couches partagent ce repère. */}
                    <div
                      className="receipt-ticket-anim absolute left-[60px] top-[13.2px] h-[687.6px] w-[348px]"
                      style={{ '--receipt-ticket-duration': `${TICKET_ANIMATION_DURATION_S}s` } as React.CSSProperties}
                    >
                      {/* Ticket zigzag (vecteur Figma) */}
                      <div className="absolute inset-0">
                        <div className="absolute inset-[-2.09%_-6.9%_-4.89%_-6.9%]">
                          <img src={ImgTicketZigzag} alt="" className="block size-full max-w-none" />
                        </div>
                      </div>

                      {/* Statut */}
                      <div className="absolute left-[79.2px] top-[30px] flex items-center gap-[6px] whitespace-nowrap rounded-[120px] bg-[#DBF0DD] px-[12px] py-[4.8px]">
                        <FigIcon
                          src={ImgStatusTick}
                          size={14.4}
                          inset="27.08% 20.83% 27.09% 20.83%"
                          inner="-13.63% -10.71% -13.64% -10.71%"
                        />
                        <span className="text-[13.2px] font-medium text-[#17664E]">{statusLabel}</span>
                      </div>

                      {/* Produit */}
                      <div className="absolute left-[33.6px] top-[72px] flex w-[280.8px] flex-col items-center gap-[2.4px] text-center">
                        <p className="max-w-full truncate text-[24px] font-bold text-[#17664E]">{productName}</p>
                        <p className="max-w-full truncate text-[13.2px] font-normal text-[rgba(11,44,37,0.71)]">
                          {shopName} · {shopDistance}
                        </p>
                      </div>

                      {/* Photo du produit : fournie par le backend (gris en attendant) */}
                      {/* TODO-FIGMA : brancher la vraie photo du produit */}
                      <div className="absolute left-[33.6px] top-[142.8px] h-[100.8px] w-[280.8px] rounded-[16.8px] bg-[#D9D9D9]" />

                      <Dots top={255.6} />
                      <p className="absolute left-[174px] top-[267.6px] w-[280.8px] -translate-x-1/2 text-center text-[13.2px] font-medium text-[#0B2C25]">
                        {retraitLine}
                      </p>
                      <Dots top={300} />

                      {/* Ligne article */}
                      <div className="absolute left-[33.6px] top-[312px] flex w-[280.8px] items-center justify-between gap-[8px]">
                        <div className="flex min-w-px flex-1 flex-col gap-[1.2px]">
                          <p className="truncate text-[14.4px] font-medium text-[#0B2C25]" title={productName}>
                            {productName}
                          </p>
                          <p className="truncate text-[12px] font-normal text-[rgba(11,44,37,0.71)]">{unitsLabel}</p>
                        </div>
                        <p className="shrink-0 whitespace-nowrap text-[19.2px] font-bold text-[#0B2C25]">{price}</p>
                      </div>

                      <Dots top={364.8} />

                      {/* QR code */}
                      <div className="absolute left-[97.2px] top-[376.8px] flex items-center justify-center rounded-[16.8px] border-[1.2px] border-solid border-[#E8EBDF] bg-white p-[9.6px]">
                        <div className="relative size-[132px] shrink-0">
                          <img
                            src={reservation.qrCodeData || ImgTicketQr}
                            alt={`QR ${reservation.pickupCode}`}
                            className="absolute inset-0 block size-full max-w-none object-contain"
                          />
                        </div>
                      </div>

                      {/* Code de retrait */}
                      <div className="absolute left-[33.6px] top-[537.6px] flex w-[280.8px] flex-col items-center gap-[2.4px] text-center whitespace-nowrap">
                        <p className="text-[12px] font-normal text-[rgba(11,44,37,0.71)]">CODE DE RETRAIT</p>
                        <p className="select-all text-[26.4px] font-bold tracking-[3.168px] text-[#0B2C25]">
                          {reservation.pickupCode}
                        </p>
                        <p className="text-[12px] font-normal text-[rgba(11,44,37,0.71)]">
                          N° de réservation : {reservationNum}
                        </p>
                      </div>

                      <p className="absolute left-[174px] top-[627.6px] w-[280.8px] -translate-x-1/2 text-center text-[13.2px] font-semibold text-[#17664E]">
                        Merci de lutter contre le gaspillage !
                      </p>

                      {/* Bordure ondulée (vecteur Figma) */}
                      <div className="pointer-events-none absolute left-[7.2px] top-[7.2px] h-[652.8px] w-[333.6px]">
                        <div className="absolute inset-[-0.11%_-0.22%]">
                          <img src={ImgTicketBorder} alt="" className="block size-full max-w-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fente imprimante + voyant (au-dessus du ticket) */}
                  <div className="absolute left-[36px] top-[9.6px] h-[31.2px] w-[396px] rounded-[15.6px] bg-[#0B2C25] shadow-[0px_4.8px_12px_0px_rgba(0,0,0,0.18)]" />
                  <div className="absolute left-[408px] top-[21.6px] size-[7.2px]">
                    <img src={ImgPrinterLed} alt="" className="absolute inset-0 block size-full max-w-none" />
                  </div>
                </div>
          </div>

          {/* ---------- Colonne principale (1:16603) ---------- */}
          <div className="flex w-full min-w-[460px] flex-1 flex-col gap-[24px] overflow-clip">
    {/* Carte retrait à venir (1:16604) */}
    <div className="flex w-full flex-col gap-[20px] rounded-[24px] bg-[#0B2C25] p-[28px] overflow-clip">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <div className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-[#41967D]">
            <FigIcon

              src={ImgDarkTick}
              size={20}
              inset="27.08% 20.83% 27.08% 20.84%"
              inner="-8.19% -6.42% -8.18% -6.44%"
            />
          </div>
          <div className="flex flex-col gap-px whitespace-nowrap">
            <p className="text-[16px] font-semibold text-white">{darkTitle}</p>
            <p className="text-[11px] font-normal text-[#DBF0DD]">{darkSubtitle}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-px whitespace-nowrap">
          <p className="text-[11px] font-normal text-[#DBF0DD]">N° de réservation</p>
          <p className="text-[14px] font-semibold text-white">{reservationNum}</p>
        </div>
      </div>

      <div className="flex w-full items-end justify-between whitespace-nowrap">
        <div className="flex flex-col gap-[2px]">
          <p className="text-[12px] font-normal text-[#DBF0DD]">À retirer avant</p>
          <p className="text-[56px] font-bold text-white">{endStr}</p>
          <p className="text-[12px] font-normal text-[#DBF0DD]">
            {slotDayLabel} · créneau {slotStr}
          </p>
        </div>
        <div className="flex flex-col items-end gap-[2px] text-[#DBF0DD]">
          <p className="text-[12px] font-normal">À payer sur place</p>
          <p className="text-[36px] font-bold">{price}</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-[8px]">
        <div className="flex w-full items-start justify-between">
          <div className="flex items-center gap-[6px]">
            <FigIcon
              src={ImgDarkClock}
              size={14}
              inset="8.34% 8.32% 8.33% 8.34%"
              inner="-6.43% -6.42% -6.43% -6.44%"
            />
            <p className="whitespace-nowrap text-[12px] font-semibold text-white">{remainingLabel}</p>
          </div>
          <p className="whitespace-nowrap text-[11px] font-normal text-[#DBF0DD]">{startStr}</p>
        </div>
        <div className="relative flex h-[8px] w-full items-start overflow-clip rounded-[4px] bg-[rgba(255,255,255,0.15)]">
          <div className="absolute left-0 top-0 h-[8px] bg-[#7BE3AC]" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </div>

    {/* Carte suivi (1:16631) */}
    <div className="flex w-full flex-col gap-[20px] rounded-[24px] border-[1.5px] border-solid border-[#DBF0DD] bg-white p-[24px] overflow-clip">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <div className="flex size-[44px] shrink-0 items-center justify-center rounded-full border border-solid border-[#235347] bg-[#EEF7EC]">
            <FigIcon
              src={ImgTrackCheck}
              size={22}
              inset="8.33% 8.34% 8.33% 8.33%"
              inner="-4.09% -4.1% -4.09% -4.08%"
            />
          </div>
          <p className="whitespace-nowrap text-[20px] font-medium text-[#0B2C25]">Suivi de la réservation</p>
        </div>
        <div className="flex items-start rounded-full bg-[#FDF3D8] px-[12px] py-[5px]">
          <p className="whitespace-nowrap text-[11px] font-semibold text-[#6B4E00]">Étape {stage} sur 4</p>
        </div>
      </div>

      <div className="flex w-full items-start">
        {[
          { n: 1, label: 'Réservée', sub: createdLine },
          { n: 2, label: 'Ticket généré', sub: `Code ${reservation.pickupCode}` },
          { n: 3, label: 'Retrait', sub: 'Scan en magasin' },
          { n: 4, label: 'Avis', sub: 'Après le retrait' },
        ].map((s) => {
          const done = stepDone(s.n);
          const current = s.n === stage;
          const traitGreen = s.n < 4 && stepDone(s.n + 1);
          return (
            <div key={s.n} className="flex min-w-px flex-1 flex-col gap-[10px]">
              <div className="flex w-full items-center gap-[8px]">
                {done ? (
                  <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#17664E]">
                    <FigIcon src={ImgStepTick} size={18} inset="27.08% 20.83%" inner="-9.09% -7.14%" />
                  </div>
                ) : s.n === 3 && current ? (
                  <div className="relative size-[34px] shrink-0">
                    <img src={ImgStepCurrent} alt="" className="absolute inset-0 block size-full max-w-none" />
                  </div>
                ) : (
                  <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full border-2 border-solid border-[#DBF0DD] bg-white">
                    <FigIcon
                      src={ImgStepStar}
                      size={16}
                      inset="8.33% 8.34% 8.34% 8.33%"
                      inner="-5.62% -5.65% -5.64% -5.63%"
                    />
                  </div>
                )}
                {s.n < 4 && (
                  <div
                    className={`h-[4px] min-w-px flex-1 rounded-[2px] ${traitGreen ? 'bg-[#17664E]' : 'bg-[#EBEEE1]'}`}
                  />
                )}
              </div>
              <div className="flex flex-col gap-px whitespace-nowrap">
                <p className={`text-[14px] font-semibold ${current ? 'text-[#17664E]' : 'text-[#0B2C25]'}`}>
                  {s.label}
                </p>
                <p className="text-[11px] font-normal text-[rgba(11,44,37,0.71)]">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Rangée basse (1:16671) */}
    <div className="content-start flex flex-wrap gap-[24px] items-start overflow-clip w-full">
      {/* Carte commerce */}
      <div className="flex w-full min-w-[240px] flex-1 flex-col gap-[12px] rounded-[24px] border-[1.5px] border-solid border-[#DBF0DD] bg-white p-[16px] overflow-clip">
        <div className="relative h-[96px] w-full shrink-0 overflow-clip rounded-[16px]">
          <div className="absolute left-0 top-0 h-[96px] w-[252px]">
            <img src={ImgMapBg} alt="" className="absolute inset-0 block size-full max-w-none" />
          </div>
          {/* Repères : photos des produits fournies par le backend (gris en attendant) */}
          <div className="absolute left-[62px] top-[39px] size-[28px] rounded-[14px] bg-white drop-shadow-[0px_3px_4px_rgba(0,0,0,0.18)]">
            <div className="absolute left-[5px] top-[5px] size-[18px] rounded-full bg-[#D9D9D9]" />
          </div>
          <div className="absolute left-[121px] top-[25px] size-[36px] rounded-[18px] border-4 border-solid border-[#17664E] bg-white drop-shadow-[0px_3px_4px_rgba(0,0,0,0.18)]">
            <div className="absolute left-[3px] top-[3px] size-[22px] rounded-full bg-[#D9D9D9]" />
          </div>
          <div className="absolute left-[193px] top-[44px] size-[28px] rounded-[14px] bg-white drop-shadow-[0px_3px_4px_rgba(0,0,0,0.18)]">
            <div className="absolute left-[5px] top-[5px] size-[18px] rounded-full bg-[#D9D9D9]" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-[2px]">
          <p className="whitespace-nowrap text-[16px] font-semibold text-[#0B2C25]">{shopName}</p>
          <div className="flex items-center gap-[6px]">
            <FigIcon
              src={ImgPinLocation}
              size={14}
              inset="8.34% 20.82% 8.33% 20.84%"
              inner="-6.43% -9.17% -6.43% -9.2%"
            />
            <p className="whitespace-nowrap text-[12px] font-normal text-[rgba(11,44,37,0.71)]">{shopDistance}</p>
          </div>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopName + ' ' + shopDistance)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[42px] w-full items-center justify-center gap-[8px] rounded-[12px] bg-[#0B2C25] px-[16px]"
        >
          <FigIcon src={ImgNav} size={16} inset="12.5%" inner="-6.25%" />
          <span className="whitespace-nowrap text-[13px] font-semibold text-white">Voir l’itinéraire</span>
        </a>
      </div>

      {/* Carte bon à savoir */}
      <div className="flex w-full min-w-[240px] flex-1 flex-col gap-[12px] rounded-[24px] border-[1.5px] border-solid border-[#DBF0DD] bg-white p-[16px] overflow-clip">
        <p className="whitespace-nowrap text-[16px] font-semibold text-[#0B2C25]">Bon à savoir</p>
        {[
          { src: ImgTipQr, inset: '8.33% 8.34% 8.34% 8.33%', inner: '-5.62% -5.63% -5.63% -5.62%', t: 'Montrez ce QR code' },
          { src: ImgTipWallet, inset: '8.33% 12.5%', inner: '-5.64% -6.25% -5.62% -6.25%', t: 'Réglez sur place' },
          { src: ImgTipBag, inset: '8.33% 12.5%', inner: '-5.62% -6.25%', t: 'Apportez votre sac' },
        ].map((row) => (
          <div key={row.t} className="flex w-full items-center gap-[10px]">
            <div className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#EBEEE1]">
              <FigIcon src={row.src} size={16} inset={row.inset} inner={row.inner} />
            </div>
            <p className="whitespace-nowrap text-[13px] font-normal text-[#0B2C25]">{row.t}</p>
          </div>
        ))}
        {canCancel && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onCancel!(reservation);
            }}
            className="flex h-[42px] w-full cursor-pointer items-center justify-center rounded-[12px] border border-solid border-[#78847F] px-[16px]"
          >
            <span className="whitespace-nowrap text-[13px] font-semibold text-[#0B2C25]">
              Annuler avant le retrait
            </span>
          </button>
        )}
      </div>
    </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default ReceiptTicketModal;