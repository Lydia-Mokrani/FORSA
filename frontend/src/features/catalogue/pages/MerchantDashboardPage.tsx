
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, X, Clock, AlertTriangle } from 'lucide-react';

import { CatalogueApi } from '../services/api';
import { MerchantDashboardData } from '../types';

const FIGMA_ASSETS =
  'https://www.figma.com/api/mcp/asset/a9b292fb-1ade-425d-b43f-b930a09ee78d';

const assets = {
  avatar: `${FIGMA_ASSETS}/6247d.png`,
  product: `${FIGMA_ASSETS}/a9c3d.png`,
  active: `${FIGMA_ASSETS}/50881.svg`,
  reservations: `${FIGMA_ASSETS}/f8563.svg`,
  soldOut: `${FIGMA_ASSETS}/6047d.svg`,
  rating: `${FIGMA_ASSETS}/65f25.svg`,
  clock: `${FIGMA_ASSETS}/815bb.svg`,
  edit: `${FIGMA_ASSETS}/48081.svg`,
};

type DashboardOffer = MerchantDashboardData['recentOffers'][number] & {
  description?: string;
  originalPrice?: number;
  quantityAvailable?: number;
  quantityInitial?: number;
  pickupStartTime?: string;
  pickupEndTime?: string;
};

type ExtendedStats = MerchantDashboardData['stats'] & {
  todayReservations?: number;
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} DA`;

const getOriginalPrice = (offer: DashboardOffer) => {
  if (offer.originalPrice != null) return offer.originalPrice;

  if (offer.discountPercent >= 100 || offer.discountPercent <= 0) {
    return null;
  }

  return Math.round(
    offer.discountedPrice / (1 - offer.discountPercent / 100),
  );
};

const formatTime = (value?: string) => {
  if (!value) return null;
  if (/^\d{2}:\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface StatCardProps {
  value: string | number;
  label: string;
  icon: string;
  iconBackground: string;
  iconSize?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon,
  iconBackground,
  iconSize = 54,
}) => (
  <div className="flex min-w-0 flex-1 items-center justify-center gap-[23px] rounded-[19px] bg-white px-[13px] py-[12px] shadow-[0px_4px_3px_rgba(0,0,0,0.05)]">
    <div
      className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-[17px]"
      style={{ backgroundColor: iconBackground }}
    >
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="object-contain"
        style={{ width: iconSize, height: iconSize }}
      />
    </div>

    <div className="min-w-0">
      <p className="font-poppins text-[40px] font-semibold leading-[1.15] text-[#0B2C25]">
        {value}
      </p>
      <p className="mt-[2px] font-poppins text-[13px] leading-[1.35] text-[rgba(11,44,37,0.71)]">
        {label}
      </p>
    </div>
  </div>
);

interface OfferCardProps {
  offer: DashboardOffer;
  onDelete: (offer: DashboardOffer) => void;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, onDelete }) => {
  const originalPrice = getOriginalPrice(offer);
  const quantityAvailable = offer.quantityAvailable;
  const quantityInitial = offer.quantityInitial;

  const hasStock =
    typeof quantityAvailable === 'number' &&
    typeof quantityInitial === 'number' &&
    quantityInitial > 0;

  const stockPercentage = hasStock
    ? Math.min(
        100,
        Math.max(0, (quantityAvailable / quantityInitial) * 100),
      )
    : 0;

  const pickupStart = formatTime(offer.pickupStartTime);
  const pickupEnd = formatTime(offer.pickupEndTime);

  return (
    <article className="w-full min-w-0 rounded-[16px] bg-white p-[12px] shadow-[0px_4px_7px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col gap-[14px]">
        <div className="flex flex-col gap-[9px]">
          <div className="flex flex-col gap-[6px]">
            <div className="relative h-[140px] w-full overflow-hidden rounded-[12px]">
              <img
                src={offer.thumbnailUrl || assets.product}
                alt={offer.name}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <Link
                to={`/merchant/edit-offer/${offer.id}`}
                aria-label={`Modifier ${offer.name}`}
                className="absolute right-[9px] top-[9px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[rgba(255,255,255,0.79)]"
              >
                <img
                  src={assets.edit}
                  alt=""
                  className="h-[24px] w-[24px]"
                />
              </Link>
            </div>

            <div className="flex min-h-[12px] items-center gap-[6px]">
              <img
                src={assets.clock}
                alt=""
                className="h-[10px] w-[10px]"
              />
              <p className="font-poppins text-[8px] leading-normal text-[#78847F]">
                Retrait :{' '}
                {pickupStart && pickupEnd
                  ? `${pickupStart} – ${pickupEnd}`
                  : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-[8px]">
            <div className="min-w-0">
              <h3 className="truncate font-poppins text-[17px] font-semibold leading-[26px] text-[#0B2C25]">
                {offer.name}
              </h3>
              <p className="truncate font-poppins text-[8px] leading-[12px] text-[rgba(11,44,37,0.66)]">
                {offer.description || offer.category?.nameFr || ''}
              </p>
            </div>

            <div className="flex shrink-0 items-baseline gap-[4px] whitespace-nowrap pt-[4px]">
              <span className="font-poppins text-[14px] font-bold text-[#17664E]">
                {formatPrice(offer.discountedPrice)}
              </span>

              {originalPrice != null && (
                <span className="font-poppins text-[8px] text-[#78847F] line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[4px]">
          <p className="font-poppins text-[7px] leading-normal text-[rgba(11,44,37,0.59)]">
            {hasStock
              ? `${quantityAvailable} pièces restantes sur ${quantityInitial}`
              : 'Quantité restante non renseignée'}
          </p>

          <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-[#D9D9D9]">
            <div
              className="h-full rounded-[3px] bg-[#0B2C25]"
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
        </div>

        <div className="h-[1px] w-full bg-[#F0F0F0]" />

        <div className="flex items-center gap-[10px]">
          <Link
            to={`/merchant/edit-offer/${offer.id}`}
            className="flex min-w-0 flex-1 items-center justify-center rounded-[8px] bg-[#0B2C25] px-[12px] py-[8px] font-poppins text-[10px] font-bold text-white transition-colors hover:bg-[#17664E]"
          >
            Gérer
          </Link>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete(offer)}
            title="Supprimer l'offre"
            aria-label={`Supprimer ${offer.name}`}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white text-[#0B2C25] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2
              size={17}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </article>
  );
};

interface DeleteOfferModalProps {
  offer: DashboardOffer;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteOfferModal: React.FC<DeleteOfferModalProps> = ({
  offer,
  deleting,
  error,
  onCancel,
  onConfirm,
}) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,27,23,0.48)] px-4 py-6 backdrop-blur-[2px]"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget && !deleting) {
        onCancel();
      }
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-offer-title"
      className="relative w-full max-w-[560px] rounded-[28px] bg-white px-7 pb-8 pt-8 shadow-[0px_14px_30px_rgba(0,0,0,0.18)] sm:h-[330px] sm:px-[40px]"
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={deleting}
        aria-label="Fermer"
        className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#526C63] transition hover:bg-[#F3F4EF] disabled:opacity-40"
      >
        <X size={19} />
      </button>

      <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#FBE8E5] text-[#B94A43]">
        <Trash2 size={30} strokeWidth={1.8} />
      </div>

      <h2
        id="delete-offer-title"
        className="mt-[16px] font-poppins text-[23px] font-semibold leading-tight text-[#0B2C25] sm:text-[26px]"
      >
        Supprimer cette offre ?
      </h2>

      <p className="mt-[12px] font-poppins text-[13px] leading-[1.65] text-[rgba(11,44,37,0.65)] sm:text-[14px]">
        « {offer.name} » sera retirée de la plateforme. Si des clients
        l’ont déjà réservée, elle sera seulement masquée aux nouveaux
        clients et les réservations en cours restent valables.
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-[#FBE8E5] p-3 text-[12px] text-[#9D3932]">
          <AlertTriangle size={16} className="mt-[1px] shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:absolute sm:bottom-[38px] sm:right-[40px] sm:mt-0 sm:flex-row sm:gap-[19px]">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="rounded-[10px] border border-[rgba(0,0,0,0.44)] px-[17px] py-[10px] font-poppins text-[16px] font-semibold text-[rgba(11,44,37,0.7)] transition hover:bg-[#F7F7F3] disabled:opacity-40 sm:text-[18px]"
        >
          Annuler
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="flex min-w-[150px] items-center justify-center gap-2 rounded-[10px] bg-[#0B2C25] px-[17px] py-[10px] font-poppins text-[16px] font-semibold text-white transition hover:bg-[#17664E] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[18px]"
        >
          {deleting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Suppression...
            </>
          ) : (
            'Supprimer l’offre'
          )}
        </button>
      </div>
    </section>
  </div>
);

export const MerchantDashboardPage: React.FC = () => {
  const [data, setData] = useState<MerchantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [offerToDelete, setOfferToDelete] =
    useState<DashboardOffer | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let mounted = true;

    CatalogueApi.getMerchantDashboard()
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((error) => {
        console.error('Unable to load merchant dashboard:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const openDeleteModal = (offer: DashboardOffer) => {
    setDeleteError('');
    setOfferToDelete(offer);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setOfferToDelete(null);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!offerToDelete || deleting) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await CatalogueApi.deleteOffer(offerToDelete.id);

      setData((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          recentOffers: previous.recentOffers.filter(
            (offer) => offer.id !== offerToDelete.id,
          ),
        };
      });

      setOfferToDelete(null);
    } catch (error) {
      console.error('Unable to delete offer:', error);

      setDeleteError(
        'La suppression a échoué. Vérifiez votre connexion puis réessayez.',
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1066px] animate-pulse space-y-[50px]">
        <div className="h-[112px] rounded-xl bg-[#F2EEE5]" />

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[108px] rounded-[19px] bg-white"
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[330px] rounded-[16px] bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-[1066px] py-12 text-center font-poppins text-[#0B2C25]">
        Impossible de charger les données du tableau de bord.
      </div>
    );
  }

  const { stats, recentOffers, shops } = data;
  const extendedStats = stats as ExtendedStats;
  const offers = (recentOffers || []) as DashboardOffer[];

  const averageRating =
    shops?.length > 0 && typeof shops[0].averageRating === 'number'
      ? shops[0].averageRating.toLocaleString('fr-FR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : '—';

  const statCards: StatCardProps[] = [
    {
      label: 'offres actives',
      value: stats.activeOffers,
      icon: assets.active,
      iconBackground: 'rgba(134,207,238,0.34)',
      iconSize: 54,
    },
    {
      label: 'réservations du jour',
      value: extendedStats.todayReservations ?? '—',
      icon: assets.reservations,
      iconBackground: 'rgba(238,214,134,0.47)',
      iconSize: 48,
    },
    {
      label: 'offres épuisées',
      value: stats.soldOutOffers,
      icon: assets.soldOut,
      iconBackground: 'rgba(206,86,86,0.47)',
      iconSize: 53,
    },
    {
      label: 'note moyenne',
      value: averageRating,
      icon: assets.rating,
      iconBackground: '#EAF5EB',
      iconSize: 54,
    },
  ];

  return (
    <>
      <div className="w-full max-w-[1066px]">
        <header className="flex min-h-[112px] items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-poppins text-[clamp(30px,3.35vw,48px)] font-semibold leading-[1.25] text-[#0B2C25]">
              Bonjour, {shops?.[0]?.name || '[Commerce]'} !
            </h1>

            <p className="mt-[3px] font-poppins text-[20px] leading-[1.5] text-[rgba(11,44,37,0.79)]">
              Voici un aperçu de votre activité aujourd’hui
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-[14px] pt-[2px]">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-[45px] w-[45px] items-center justify-center text-[#0B2C25]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[32px] w-[32px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
                <path d="M12 2V1" />
              </svg>
            </button>

            <img
              src={assets.avatar}
              alt="Profil du commerce"
              className="h-[48px] w-[48px] rounded-full object-cover"
            />
          </div>
        </header>

        <section
          aria-label="Statistiques du commerce"
          className="mt-[50px] grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4 xl:gap-[33px]"
        >
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        <section className="mt-[50px]">
          <h2 className="mb-[22px] font-poppins text-[36px] font-semibold leading-[1.3] text-[#0B2C25]">
            Vos offres du jour
          </h2>

          {offers.length > 0 ? (
            <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 xl:grid-cols-4">
              {offers.slice(0, 4).map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onDelete={openDeleteModal}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-[16px] bg-white p-6 font-poppins text-sm text-[#78847F]">
              Aucune offre à afficher pour le moment.
            </p>
          )}
        </section>

        <div className="mt-[50px] flex justify-end pb-8">
          <Link
            to="/merchant/create-offer"
            className="inline-flex items-center gap-[7px] rounded-[10px] bg-[#0B2C25] px-[10px] py-[10px] font-poppins text-[20px] font-semibold text-white transition-colors hover:bg-[#17664E]"
          >
            <Plus className="h-[30px] w-[30px]" strokeWidth={1.8} />
            Ajouter une offre
          </Link>
        </div>
      </div>

      {offerToDelete && (
        <DeleteOfferModal
          offer={offerToDelete}
          deleting={deleting}
          error={deleteError}
          onCancel={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
};

export default MerchantDashboardPage;
