
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react';

import { CatalogueApi } from '../services/api';
import { MerchantDashboardData } from '../types';

const ASSET =
  'https://www.figma.com/api/mcp/asset/cc438a28-a653-4f3c-af2f-672fcc42c3cb';

const assets = {
  edit: `${ASSET}/48081.svg`,
  avatar: `${ASSET}/6247d.png`,
  product: `${ASSET}/a9c3d.png`,
  active: `${ASSET}/50881.svg`,
  reservations: `${ASSET}/f8563.svg`,
  soldOut: `${ASSET}/6047d.svg`,
  rating: `${ASSET}/65f25.svg`,
  clock: `${ASSET}/815bb.svg`,
  divider: `${ASSET}/8f6e0.svg`,
};

type DashboardOffer = MerchantDashboardData['recentOffers'][number];

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} DA`;

const getOriginalPrice = (offer: DashboardOffer) => {
  if (offer.discountPercent <= 0 || offer.discountPercent >= 100) {
    return null;
  }

  return Math.round(
    offer.discountedPrice / (1 - offer.discountPercent / 100),
  );
};

const formatDeadline = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Offre active',
  PENDING_VERIFICATION: 'En attente de vérification',
  SOLD_OUT: 'Offre épuisée',
  EXPIRED: 'Offre expirée',
  WITHDRAWN: 'Offre retirée',
  HIDDEN: 'Offre masquée',
  REJECTED: 'Offre refusée',
  DRAFT: 'Brouillon',
};

interface StatCardProps {
  value: string | number;
  label: string;
  icon: string;
  iconBackground: string;
  width: number;
  iconSize: number;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon,
  iconBackground,
  width,
  iconSize,
}) => (
  <div
    className="flex h-[108px] shrink-0 items-center justify-center gap-[23px] rounded-[19px] bg-white px-[13px] py-[12px] shadow-[0px_4px_3px_rgba(0,0,0,0.05)]"
    style={{ width }}
  >
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

    <div className="min-w-0 flex-1">
      <p className="font-poppins text-[40px] font-semibold leading-[1.15] text-[#0B2C25]">
        {value}
      </p>
      <p className="font-poppins text-[13px] leading-[1.35] text-[rgba(11,44,37,0.71)]">
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
  const isActive = offer.status === 'ACTIVE';

  return (
    <article className="flex h-[330px] w-full min-w-0 flex-col rounded-[16px] bg-white p-[12px] shadow-[0px_4px_7px_rgba(0,0,0,0.06)]">
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
                className="absolute right-[5px] top-[9px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[rgba(255,255,255,0.79)] transition hover:bg-white"
              >
                <img
                  src={assets.edit}
                  alt=""
                  className="h-[24px] w-[24px]"
                />
              </Link>
            </div>

            <div className="flex h-[12px] items-center gap-[6px]">
              <img
                src={assets.clock}
                alt=""
                className="h-[10px] w-[10px] shrink-0"
              />
              <p className="font-poppins text-[8px] leading-[12px] text-[#78847F]">
                Fin de l'offre : {formatDeadline(offer.expiresAt)}
              </p>
            </div>
          </div>

          <div className="flex h-[38px] items-start justify-between gap-[25px]">
            <div className="flex h-[38px] min-w-0 flex-1 flex-col">
              <h3 className="h-[26px] w-full truncate font-poppins text-[17px] font-semibold leading-[26px] text-[#0B2C25]">
                {offer.name}
              </h3>

              <p className="w-full truncate font-poppins text-[8px] leading-[12px] text-[rgba(11,44,37,0.66)]">
                {offer.category.nameFr}
              </p>
            </div>

            <div className="flex shrink-0 items-baseline gap-[4px] whitespace-nowrap py-[4px]">
              <span className="font-poppins text-[14px] font-bold text-[#17664E]">
                {formatPrice(offer.discountedPrice)}
              </span>

              {originalPrice !== null && (
                <span className="font-poppins text-[8px] text-[#78847F] line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-[21px] flex-col gap-[4px]">
          <p className="font-poppins text-[7px] leading-[11px] text-[rgba(11,44,37,0.59)]">
            {statusLabel[offer.status] || offer.status}
          </p>

          <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-[#D9D9D9]">
            <div
              className={`h-full rounded-[3px] ${
                isActive ? 'bg-[#0B2C25]' : 'bg-[#78847F]'
              }`}
              style={{
                width: isActive ? '50%' : '0%',
              }}
            />
          </div>
        </div>

        <div className="h-[6px] w-[214px] max-w-full shrink-0">
          <img
            src={assets.divider}
            alt=""
            className="h-full w-full object-fill"
          />
        </div>

        <div className="flex h-[32px] shrink-0 items-center gap-[10px]">
          <Link
            to={`/merchant/edit-offer/${offer.id}`}
            className="flex h-[32px] min-w-0 flex-1 items-center justify-center rounded-[8px] bg-[#0B2C25] px-[12px] font-poppins text-[10px] font-bold text-white transition-colors hover:bg-[#17664E]"
          >
            Gérer
          </Link>

          <button
            type="button"
            onClick={() => onDelete(offer)}
            title="Supprimer l'offre"
            aria-label={`Supprimer ${offer.name}`}
            className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] border border-[rgba(0,0,0,0.1)] bg-white text-[#0B2C25] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
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
        <div className="h-[108px] rounded-xl bg-white" />
        <div className="h-[406px] rounded-xl bg-white" />
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

  const averageRating =
    shops.length > 0
      ? (
          shops.reduce((sum, shop) => sum + shop.averageRating, 0) /
          shops.length
        ).toLocaleString('fr-FR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : '—';

  const shopName = shops[0]?.name || '[Commerce]';

  const statCards: StatCardProps[] = [
    {
      label: 'offres actives',
      value: stats.activeOffers,
      icon: assets.active,
      iconBackground: 'rgba(134,207,238,0.34)',
      width: 220,
      iconSize: 54,
    },
    {
      label: 'produits réservés',
      value: stats.reservedProducts,
      icon: assets.reservations,
      iconBackground: 'rgba(238,214,134,0.47)',
      width: 280,
      iconSize: 48,
    },
    {
      label: 'offres épuisées',
      value: stats.soldOutOffers,
      icon: assets.soldOut,
      iconBackground: 'rgba(206,86,86,0.47)',
      width: 232,
      iconSize: 53,
    },
    {
      label: 'note moyenne',
      value: averageRating,
      icon: assets.rating,
      iconBackground: '#EAF5EB',
      width: 226,
      iconSize: 54,
    },
  ];

  return (
    <>
      <div className="w-full max-w-[1066px]">
        <header className="flex h-[112px] w-full items-start justify-between">
          <div className="flex h-[112px] w-[680px] min-w-0 flex-col gap-[3px]">
            <h1 className="font-poppins text-[48px] font-semibold leading-[1.25] text-[#0B2C25]">
              Bonjour, {shopName} !
            </h1>

            <p className="font-poppins text-[20px] leading-[1.5] text-[rgba(11,44,37,0.79)]">
              Voici un aperçu de votre activité aujourd’hui
            </p>
          </div>

          <div className="flex h-[48px] shrink-0 items-start gap-[14px] pt-[0px]">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-[45px] w-[45px] items-center justify-center"
            >
              <img
                src={`${ASSET}/afff4.svg`}
                alt=""
                className="h-[45px] w-[45px]"
              />
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
          className="mt-[50px] flex w-full flex-wrap items-center gap-[33px] xl:flex-nowrap"
        >
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        <section className="mt-[50px]">
          <h2 className="mb-[22px] font-poppins text-[36px] font-semibold leading-[1.5] text-[#0B2C25]">
            Vos offres du jour
          </h2>

          {recentOffers.length > 0 ? (
            <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 xl:grid-cols-4">
              {recentOffers.slice(0, 4).map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onDelete={openDeleteModal}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-[16px] bg-white px-6 text-center">
              <p className="font-poppins text-[14px] text-[#78847F]">
                Aucune offre à afficher pour le moment.
              </p>
            </div>
          )}
        </section>

        <div className="mt-[70px] flex justify-end pb-8">
          <Link
            to="/merchant/create-offer"
            className="inline-flex h-[50px] items-center gap-[7px] rounded-[10px] bg-[#0B2C25] px-[10px] font-poppins text-[20px] font-semibold text-white transition-colors hover:bg-[#17664E]"
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
