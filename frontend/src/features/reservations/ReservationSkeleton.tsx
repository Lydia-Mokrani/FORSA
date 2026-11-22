import React from 'react';
import IconClock from './assets/icons/Icône clock-01.svg';
import IconCalendar from './assets/icons/calendar-03.svg';
import IconCheckmark from './assets/icons/checkmark-circle-02.svg';

/**
 * État de chargement – Skeleton
 * Figma spec: node #994:17344 ("Desktop · Réservations — Chargement")
 * Exactly replicates the layout, dimensions, and card structure of the real screen.
 */
export const ReservationSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-[24px] items-start w-full animate-pulse">
      {/* ============================================================
          MAIN COLUMN SKELETON
          ============================================================ */}
      <div className="flex-1 flex flex-col gap-[24px] min-w-0 w-full">
        {/* ----------------------------------------------------------
            CARD SKELETON: Prochain retrait (Figma #994:17362)
            ---------------------------------------------------------- */}
        <div className="flex flex-col gap-[16px] p-4 sm:p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
          {/* Card header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-[12px]">
              <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[#EEF7EC] border border-[#235347] shrink-0">
                <img src={IconClock} alt="" className="w-[22px] h-[22px] opacity-70" />
              </div>
              <div className="h-[22px] w-[140px] bg-[#0B2C25]/10 rounded-[6px]" />
            </div>
            {/* Puce squelette */}
            <div className="h-[26px] w-[90px] bg-[#EEF7EC] rounded-full" />
          </div>

          {/* Squelette content row (Figma #994:17371) */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-[20px]">
            {/* Photo squelette: 112x112px, rounded-[16px] */}
            <div className="w-[112px] h-[112px] rounded-[16px] bg-[#0B2C25]/10 shrink-0" />

            {/* Lignes squelette (gap: 12px) */}
            <div className="flex-1 flex flex-col gap-[12px] min-w-0 w-full">
              <div className="h-[22px] w-[75%] bg-[#0B2C25]/10 rounded-[6px]" />
              <div className="h-[16px] w-[50%] bg-[#0B2C25]/10 rounded-[6px]" />
              <div className="h-[16px] w-[65%] bg-[#0B2C25]/10 rounded-[6px]" />
              <div className="flex gap-2 pt-1">
                <div className="h-[36px] w-[130px] bg-[#0B2C25]/10 rounded-[10px]" />
                <div className="h-[36px] w-[90px] bg-[#0B2C25]/10 rounded-[10px]" />
              </div>
            </div>

            {/* QR box squelette: 150x112px, rounded-[16px] */}
            <div className="w-[150px] h-[112px] rounded-[16px] bg-[#0B2C25]/10 shrink-0 self-center md:self-auto" />
          </div>
        </div>

        {/* ----------------------------------------------------------
            CARD SKELETON: Autres réservations (Figma #994:17378)
            ---------------------------------------------------------- */}
        <div className="flex flex-col gap-[16px] p-4 sm:p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[14px]">
            <div className="flex items-center gap-[12px]">
              <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[#EEF7EC] border border-[#235347] shrink-0">
                <img src={IconCalendar} alt="" className="w-[22px] h-[22px] opacity-70" />
              </div>
              <div className="h-[22px] w-[170px] bg-[#0B2C25]/10 rounded-[6px]" />
            </div>

            {/* Filter pills skeleton */}
            <div className="flex items-center gap-[6px]">
              <div className="h-[32px] w-[75px] bg-[#0B2C25] opacity-20 rounded-full" />
              <div className="h-[32px] w-[85px] bg-[#0B2C25]/10 rounded-full" />
              <div className="h-[32px] w-[80px] bg-[#0B2C25]/10 rounded-full" />
              <div className="h-[32px] w-[85px] bg-[#0B2C25]/10 rounded-full" />
            </div>
          </div>

          {/* 3 Reservation lines skeleton (Figma #994:17393) */}
          <div className="flex flex-col gap-[10px]">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] p-[12px_14px_12px_12px] bg-forsa-cream border border-[#DBF0DD] rounded-[16px]"
              >
                <div className="flex items-center gap-[16px] flex-1 min-w-0">
                  {/* Photo: 72x72px, rounded-[14px] */}
                  <div className="w-[72px] h-[72px] rounded-[14px] bg-[#0B2C25]/10 shrink-0" />

                  {/* Lines */}
                  <div className="flex-1 flex flex-col gap-[8px] min-w-0">
                    <div className="flex items-center gap-[8px]">
                      <div className="h-[18px] w-[45%] bg-[#0B2C25]/10 rounded-[6px]" />
                      <div className="h-[22px] w-[70px] bg-[#0B2C25]/10 rounded-full" />
                    </div>
                    <div className="h-[14px] w-[55%] bg-[#0B2C25]/10 rounded-[6px]" />
                    <div className="h-[14px] w-[35%] bg-[#0B2C25]/10 rounded-[6px]" />
                  </div>
                </div>

                {/* Price & action button skeleton */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-[10px] shrink-0 pt-2 sm:pt-0">
                  <div className="h-[18px] w-[60px] bg-[#0B2C25]/10 rounded-[6px]" />
                  <div className="h-[36px] w-[100px] bg-[#0B2C25]/10 rounded-[10px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          SIDEBAR COLUMN SKELETON (Figma #994:17415)
          ============================================================ */}
      <div className="w-full lg:w-[340px] flex flex-col gap-[24px] shrink-0">
        {/* Activity skeleton */}
        <div className="flex flex-col gap-[20px] p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
          <div className="flex items-center gap-[12px]">
            <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[#EEF7EC] border border-[#235347] shrink-0">
              <img src={IconCalendar} alt="" className="w-[22px] h-[22px] opacity-70" />
            </div>
            <div className="h-[20px] w-[120px] bg-[#0B2C25]/10 rounded-[6px]" />
          </div>

          <div className="flex gap-[10px]">
            <div className="flex-1 h-[75px] bg-[#FDF3D8] opacity-70 rounded-[16px]" />
            <div className="flex-1 h-[75px] bg-[#DBF0DD] opacity-70 rounded-[16px]" />
            <div className="flex-1 h-[75px] bg-[#EBEEE1] opacity-70 rounded-[16px]" />
          </div>

          <div className="h-[64px] w-full bg-[#EEF7EC] rounded-[16px]" />
          <div className="h-[16px] w-[120px] bg-[#0B2C25]/10 rounded-[6px]" />
        </div>

        {/* Bon à savoir skeleton */}
        <div className="flex flex-col gap-[12px] p-[24px] bg-white border-[1.5px] border-[#DBF0DD] rounded-[24px] shadow-sm">
          <div className="flex items-center gap-[12px]">
            <div className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[#EEF7EC] border border-[#235347] shrink-0">
              <img src={IconCheckmark} alt="" className="w-[22px] h-[22px] opacity-70" />
            </div>
            <div className="h-[20px] w-[120px] bg-[#0B2C25]/10 rounded-[6px]" />
          </div>

          <div className="h-[1px] bg-[#EBEEE1]" />

          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-[12px] py-[8px]">
              <div className="w-[40px] h-[40px] rounded-full bg-[#EBEEE1] shrink-0" />
              <div className="flex-1 flex flex-col gap-[6px]">
                <div className="h-[14px] w-[70%] bg-[#0B2C25]/10 rounded-[4px]" />
                <div className="h-[11px] w-[50%] bg-[#0B2C25]/10 rounded-[4px]" />
              </div>
            </div>
          ))}

          <div className="h-[40px] w-full bg-[#0B2C25]/10 rounded-[12px] mt-2" />
        </div>
      </div>
    </div>
  );
};

export default ReservationSkeleton;
