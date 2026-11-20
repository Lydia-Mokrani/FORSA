
import React, { useEffect, useState } from 'react';
import { Link, useLocation as useRouterLocation, useNavigate, useParams } from 'react-router-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  ShieldCheck,
  Store,
  Share2,
  ShoppingBasket,
  CalendarDays,
  CheckCircle2,
  Tag,
} from 'lucide-react';

import { CatalogueApi } from '../services/api';
import { Offer } from '../types';

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} DA`;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Non précisée';

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatPickupTime = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Horaire à confirmer';

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return isToday
    ? `Aujourd'hui avant ${time}`
    : `${date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
      })} avant ${time}`;
};

export const OfferDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();

  const hasBackground = Boolean(
    (routerLocation.state as { backgroundLocation?: unknown } | null)
      ?.backgroundLocation,
  );

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [reservationNotice, setReservationNotice] = useState(false);

  const closePopup = () => {
    if (hasBackground) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setOffer(null);
    setActivePhotoIdx(0);
    setReservationNotice(false);

    CatalogueApi.getOfferById(id)
      .then((result) => {
        if (!cancelled) setOffer(result);
      })
      .catch((error) => {
        console.error('Unable to load offer details:', error);
        if (!cancelled) setOffer(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopup();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasBackground, navigate]);

  const photos =
    offer?.photos && offer.photos.length > 0
      ? offer.photos
      : [
          {
            id: 'default',
            url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85',
            sortOrder: 0,
          },
        ];

  const activePhoto = photos[activePhotoIdx] || photos[0];

  const quantityAvailable = offer?.quantityAvailable ?? 0;
  const quantityInitial =
    offer?.quantityInitial || offer?.quantityAvailable || 1;

  const stockPercentage = Math.min(
    100,
    Math.max(0, (quantityAvailable / quantityInitial) * 100),
  );

  const savings = offer
    ? offer.originalPrice - offer.discountedPrice
    : 0;

  const isLowStock = quantityAvailable <= 3;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Lien de l’offre copié !');
    } catch {
      alert('Impossible de copier le lien.');
    }
  };

  const showPreviousPhoto = () => {
    setActivePhotoIdx((current) =>
      current === 0 ? photos.length - 1 : current - 1,
    );
  };

  const showNextPhoto = () => {
    setActivePhotoIdx((current) =>
      current === photos.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B2C25]/60 p-0 backdrop-blur-[3px] sm:p-4 lg:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePopup();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Détails de l'offre"
        className="relative flex h-full max-h-[760px] w-full max-w-[1000px] flex-col overflow-hidden rounded-none bg-[#FFFAF0] shadow-[0px_24px_64px_rgba(11,44,37,0.30)] sm:flex-row sm:rounded-[24px] lg:rounded-[28px]"
      >
        {/* Close button for mobile */}
        <button
          type="button"
          onClick={closePopup}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFAF0] text-[#0B2C25] shadow-md transition hover:bg-white sm:hidden"
        >
          <X size={20} />
        </button>

        {/* LEFT: PHOTO GALLERY */}
        <section className="relative h-[270px] w-full shrink-0 overflow-hidden bg-[#E9E5D9] sm:h-full sm:w-[40%]">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-[#E5E1D6]" />
          ) : (
            <>
              <img
                src={activePhoto.url}
                alt={offer?.name || 'Photo du produit'}
                className="h-full w-full object-cover"
              />

              {/* Image overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />

              {/* Quantity badge */}
              {offer && (
                <div className="absolute left-5 top-5 rounded-[9px] bg-[#0B2C25] px-4 py-2 text-[12px] font-semibold text-[#FFFAF0] shadow-md">
                  {quantityAvailable}{' '}
                  {quantityAvailable > 1 ? 'restants' : 'restant'}
                </div>
              )}

              {/* Desktop close button */}
              <button
                type="button"
                onClick={closePopup}
                aria-label="Fermer"
                className="absolute right-5 top-5 hidden h-10 w-10 items-center justify-center rounded-full bg-[#FFFAF0]/95 text-[#0B2C25] shadow-md transition hover:bg-white sm:flex"
              >
                <X size={19} />
              </button>

              {/* Gallery navigation */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousPhoto}
                    aria-label="Photo précédente"
                    className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFFAF0]/90 text-[#0B2C25] shadow-md transition hover:bg-white"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={showNextPhoto}
                    aria-label="Photo suivante"
                    className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFFAF0]/90 text-[#0B2C25] shadow-md transition hover:bg-white"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Photo counter */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[#FFFAF0] px-4 py-2 text-[11px] font-semibold text-[#0B2C25] shadow-md">
                {activePhotoIdx + 1} / {photos.length}
              </div>
            </>
          )}
        </section>

        {/* RIGHT: DETAILS */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col sm:w-[60%]">
          {/* Scrollable details */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-7">
            {loading ? (
              <div className="animate-pulse space-y-5">
                <div className="h-6 w-28 rounded-full bg-[#E8E5DA]" />
                <div className="h-9 w-3/4 rounded-lg bg-[#E8E5DA]" />
                <div className="h-20 rounded-2xl bg-[#E8E5DA]" />
                <div className="h-16 rounded-2xl bg-[#E8E5DA]" />
                <div className="h-24 rounded-2xl bg-[#E8E5DA]" />
              </div>
            ) : !offer ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="mb-4 text-4xl">🔍</span>
                <h2 className="text-lg font-semibold text-[#0B2C25]">
                  Offre introuvable
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#78847F]">
                  Cette offre a peut-être expiré ou a été retirée par le commerçant.
                </p>
                <button
                  type="button"
                  onClick={closePopup}
                  className="mt-5 rounded-xl bg-[#0B2C25] px-5 py-3 text-xs font-semibold text-white"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="space-y-[18px]">
                {/* Category and share */}
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#DBF0DD] px-3 py-[7px] text-[11px] font-semibold text-[#17664E]">
                    <Tag size={13} />
                    {offer.category?.nameFr || 'Offre anti-gaspi'}
                  </span>

                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Partager l'offre"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E9E6DC] bg-white text-[#0B2C25] transition hover:bg-[#F3F1E8]"
                  >
                    <Share2 size={16} />
                  </button>
                </div>

                {/* Product title */}
                <div>
                  <h1 className="font-poppins text-[23px] font-semibold leading-[1.3] text-[#0B2C25] sm:text-[28px]">
                    {offer.name}
                  </h1>

                  <p className="mt-2 text-[12px] leading-[1.7] text-[#78847F]">
                    {offer.description}
                  </p>
                </div>

                {/* Price section */}
                <div className="rounded-[16px] bg-[#F0F5E9] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-medium text-[#78847F]">
                        Prix anti-gaspi
                      </p>

                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-poppins text-[29px] font-semibold leading-none text-[#17664E]">
                          {formatPrice(offer.discountedPrice)}
                        </span>

                        <span className="text-[13px] text-[#89918B] line-through">
                          {formatPrice(offer.originalPrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <span className="rounded-full bg-[#EDBD4D] px-3 py-1 text-[10px] font-bold text-[#493A13]">
                        -{offer.discountPercent}%
                      </span>

                      <span className="text-[10px] font-medium text-[#17664E]">
                        Économisez {formatPrice(savings)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pickup time */}
                <div className="flex items-center gap-3 rounded-[14px] bg-[#EAF3E6] px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#17664E]">
                    <Clock size={19} />
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-[#78847F]">
                      À récupérer
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-[#0B2C25]">
                      {formatPickupTime(offer.expiresAt)}
                    </p>
                  </div>
                </div>

                {/* Merchant card */}
                <Link
                  to="/map"
                  onClick={() => {
                    // The map route is opened from the popup.
                  }}
                  className="flex items-center gap-3 rounded-[15px] border border-[#EAE7DE] bg-white p-3 transition hover:border-[#B7CCB7]"
                >
                  <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#E8F0E5] text-[#17664E]">
                    <Store size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#0B2C25]">
                      {offer.shop?.name || 'Commerce partenaire'}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#78847F]">
                      <span className="inline-flex items-center gap-1 text-[#A77B20]">
                        <Star size={12} fill="currentColor" />
                        {offer.shop?.averageRating?.toFixed(1) || '4.8'}
                      </span>
                      <span>•</span>
                      <span>{offer.shop?.salesCount ?? 0} ventes</span>
                    </div>
                  </div>

                  <ChevronRight size={18} className="shrink-0 text-[#78847F]" />
                </Link>

                {/* Pickup address */}
                <Link
                  to="/map"
                  className="flex items-center gap-3 rounded-[15px] border border-[#EAE7DE] bg-white p-3 transition hover:border-[#B7CCB7]"
                >
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#F0F3E9] text-[#17664E]">
                    <MapPin size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-[#78847F]">
                      Adresse de retrait
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#0B2C25]">
                      {offer.shop?.address || 'Adresse non renseignée'}
                    </p>
                  </div>

                  <ChevronRight size={18} className="shrink-0 text-[#78847F]" />
                </Link>

                {/* Quantity available */}
                <div className="rounded-[14px] border border-[#EAE7DE] bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold text-[#0B2C25]">
                      Disponibilité
                    </p>
                    <span
                      className={`text-[10px] font-semibold ${
                        isLowStock ? 'text-[#A34A42]' : 'text-[#17664E]'
                      }`}
                    >
                      {quantityAvailable}{' '}
                      {quantityAvailable > 1 ? 'restants' : 'restant'}
                    </span>
                  </div>

                  <div className="h-[7px] overflow-hidden rounded-full bg-[#E8E8E1]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLowStock ? 'bg-[#C8785C]' : 'bg-[#17664E]'
                      }`}
                      style={{ width: `${stockPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Expiry date */}
                {offer.productExpiryDate && (
                  <div className="flex items-start gap-3 rounded-[14px] border border-[#DCE8D8] bg-[#F3F7EF] p-3">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-[#17664E]"
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-[#17664E]">
                        Date du produit vérifiée
                      </p>
                      <p className="mt-1 text-[11px] text-[#78847F]">
                        Date indiquée : {formatDate(offer.productExpiryDate)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="pb-2">
                  <h2 className="mb-2 text-[13px] font-semibold text-[#0B2C25]">
                    À propos de cette offre
                  </h2>
                  <p className="whitespace-pre-line text-[11px] leading-[1.8] text-[#78847F]">
                    {offer.description || 'Aucune description disponible.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom reservation section */}
          {!loading && offer && (
            <div className="shrink-0 border-t border-[#EAE7DE] bg-[#FFFAF0] px-5 py-4 sm:px-7">
              {reservationNotice && (
                <div className="mb-3 rounded-xl border border-[#CFE3CD] bg-[#EDF5E9] p-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#17664E]">
                    <CheckCircle2 size={15} />
                    Module de réservation (MS3)
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#64756A]">
                    L'action de réservation sera connectée au module MS3.
                    Aucune réservation réelle n'a été effectuée.
                  </p>
                  <button
                    type="button"
                    onClick={() => setReservationNotice(false)}
                    className="mt-2 text-[10px] font-semibold text-[#17664E] underline"
                  >
                    Fermer
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setReservationNotice(true)}
                disabled={quantityAvailable === 0}
                className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-[#0B2C25] px-5 py-[14px] text-[12px] font-semibold text-white transition hover:bg-[#17664E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingBasket size={17} />
                {quantityAvailable > 0 ? 'Réserver ce panier' : 'Panier épuisé'}
              </button>

              <p className="mt-2 text-center text-[9px] text-[#89918B]">
                Paiement sur place lors du retrait
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OfferDetailsPage;
