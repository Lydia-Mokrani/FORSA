import React, { useState } from 'react';

import { CreateReservationForm } from '../CreateReservationForm';
import { MerchantDashboard } from '../MerchantDashboard';
import { ReservationDetail } from '../ReservationDetail';
import { ReservationList } from '../ReservationList';
import { ReservationSuccess } from '../ReservationSuccess';
import type { Reservation } from '../types';
import type { ReservationCreateParams, ReservationCreateResult } from '../ReservationDialog';
import {
  DEV_MERCHANT_HISTORY,
  DEV_MERCHANT_RESERVATIONS,
  DEV_RESERVATIONS,
  makeDevReservation,
} from './devReservations';

type PreviewScreen = 'list' | 'detail' | 'create' | 'success' | 'merchant';

const SCREENS: { id: PreviewScreen; label: string }[] = [
  { id: 'list', label: 'Liste des réservations' },
  { id: 'detail', label: "Détail d'une réservation" },
  { id: 'create', label: 'Formulaire de création' },
  { id: 'success', label: 'Écran de succès' },
  { id: 'merchant', label: 'Tableau de bord commerçant' },
];

export const DevReservationsPreview: React.FC = () => {
  const [screen, setScreen] = useState<PreviewScreen>('list');
  const [selectedId, setSelectedId] = useState<string | null>(DEV_RESERVATIONS[0]?.id ?? null);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const selectedReservation =
    DEV_RESERVATIONS.find((r) => r.id === selectedId) ?? DEV_RESERVATIONS[0] ?? null;

  const onReserve = async (params: ReservationCreateParams): Promise<ReservationCreateResult> => ({
    success: true,
    data: makeDevReservation(params),
  });

  return (
    <div className="w-full min-h-screen bg-forsa-cream font-poppins">
      <div className="w-full bg-amber-100 border-b border-amber-300 px-4 py-3 text-amber-950 text-sm">
        <strong>Mode développement — données locales de démonstration</strong>{' '}
        Aucune API MS3/MS1/MS2, aucun compte connecté, aucune donnée enregistrée. Les éléments <em>[DEMO]</em> sont fictifs.
      </div>

      <nav className="flex flex-wrap gap-2 px-4 py-3 border-b border-[#DBF0DD] bg-[#FFFAF0]" aria-label="Écrans de prévisualisation">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScreen(s.id)}
            className={`px-3 py-2 rounded-[12px] text-sm border ${
              screen === s.id
                ? 'bg-[#0B2C25] text-[#FFFAF0] border-[#0B2C25]'
                : 'bg-white text-[#0B2C25] border-[#DBF0DD]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {screen === 'list' && (
        <ReservationList
          onSelect={(id) => {
            setSelectedId(id);
            setScreen('detail');
          }}
          onCreate={() => setScreen('create')}
          onMerchant={() => setScreen('merchant')}
          previewMode={true}
          previewReservations={DEV_RESERVATIONS}
          onReserve={onReserve}
        />
      )}

      {screen === 'detail' && selectedReservation && (
        <div className="p-4 sm:p-6">
          <ReservationDetail
            reservationId={selectedReservation.id}
            onBack={() => setScreen('list')}
            previewReservation={selectedReservation}
          />
        </div>
      )}

      {screen === 'create' && (
        <CreateReservationForm
          onReserve={onReserve}
          onSuccess={(reservation) => {
            setCreatedReservation(reservation ?? null);
            setScreen('success');
          }}
          onCancel={() => setScreen('list')}
        />
      )}

      {screen === 'success' && (
        <div className="p-4 sm:p-6">
          <ReservationSuccess
            reservation={createdReservation ?? DEV_RESERVATIONS[0] ?? null}
            onBack={() => setScreen('list')}
          />
        </div>
      )}

      {screen === 'merchant' && (
        <div className="p-4 sm:p-6">
          <MerchantDashboard
            onBack={() => setScreen('list')}
            previewMode={true}
            previewReservations={DEV_MERCHANT_RESERVATIONS}
            previewHistory={DEV_MERCHANT_HISTORY}
          />
        </div>
      )}
    </div>
  );
};

export default DevReservationsPreview;
