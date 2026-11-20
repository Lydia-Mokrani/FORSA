
import React, { useEffect, useState } from 'react';
import {
  Link,
  useLocation as useRouterLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  X,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  Store,
  Tag,
  ShoppingBag,
  Flag,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react';

import { CatalogueApi } from '../services/api';
import { Offer } from '../types';

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} DA`;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Non précisée';

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
};

const formatPickupTime = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Horaire à confirmer';

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const reviews = [
  {
    initials: 'SM',
    name: 'Sarah M.',
    rating: 5,
    comment: 'Très frais, retrait rapide et commerçant adorable.',
  },
  {
    initials: 'KB',
    name: 'Karim B.',
    rating: 4,
    comment: 'Bon rapport qualité/prix, je recommande.',
  },
];

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
  const [quantity, setQuantity] = useState(1);

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
    setQuantity(1);

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

  const quantityAvailable = offer?.quantityAvailable ?? 0;
  const quantityInitial =
    offer?.quantityInitial || offer?.quantityAvailable || 1;

  const savings = offer
    ? offer.originalPrice - offer.discountedPrice
    : 0;

  const discountPercent = offer?.discountPercent ?? 0;

  const shopRating = offer?.shop?.averageRating ?? 4.8;

  const handleQuantityChange = (direction: 'minus' | 'plus') => {
    setQuantity((current) => {
      if (direction === 'minus') return Math.max(1, current - 1);

      return Math.min(quantityAvailable, current + 1);
    });
  };

  const handleAddToCart = () => {
    // Cart integration will be connected when the cart module is available.
    // This button currently reproduces the Figma interface.
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(65,65,65,0.42)] p-0 backdrop-blur-[3px] sm:p-4 lg:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePopup();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Détails de l'offre"
        className="relative flex h-full max-h-[760px] w-full max-w-[1000px] overflow-hidden rounded-none bg-[#FFFAF0] shadow-[0px_24px_64px_rgba(11,44,37,0.30)] sm:rounded-[28px]"
      >
        {/* LEFT: PHOTO GALLERY */}
        <section className="relative hidden h-full w-[400px] shrink-0 overflow-hidden bg-[#EBEEE1] sm:block">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-[#EBEEE1]" />
          ) : (
            <>
              <img
                src={photos[0]?.url}
                alt={offer?.name || 'Photo du produit'}
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute left-5 top-5 rounded-full bg-[#0B2C25] px-[14px] py-[6px] text-[12px] font-semibold text-[#FFFAF0]">
                {quantityAvailable}{' '}
                {quantityAvailable > 1 ? 'restants' : 'restant'}
              </div>

              <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 rounded-full bg-[#FFFAF0] px-3 py-[5px] text-[12px] font-medium text-[#0B2C25]">
                1 / {photos.length}
              </div>
            </>
          )}
        </section>

        {/* RIGHT: DETAILS COLUMN */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* MOBILE IMAGE */}
          <div className="relative h-[220px] shrink-0 overflow-hidden bg-[#EBEEE1] sm:hidden">
            {!loading && (
              <>
                <img
                  src={photos[0]?.url}
                  alt={offer?.name || 'Photo du produit'}
                  className="h-full w-full object-cover"
                />

                <div className="absolute left-4 top-4 rounded-full bg-[#0B2C25] px-[14px] py-[6px] text-[12px] font-semibold text-[#FFFAF0]">
                  {quantityAvailable} restants
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#FFFAF0] px-3 py-[5px] text-[12px] text-[#0B2C25]">
                  1 / {photos.length}
                </div>
              </>
            )}
          </div>

          {/* SCROLLABLE CONTENT */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="space-y-5 p-7">
                <div className="h-6 w-28 animate-pulse rounded-full bg-[#EBEEE1]" />
                <div className="h-9 w-3/4 animate-pulse rounded-lg bg-[#EBEEE1]" />
                <div className="h-20 animate-pulse rounded-[14px] bg-[#EBEEE1]" />
                <div className="h-16 animate-pulse rounded-[14px] bg-[#EBEEE1]" />
                <div className="h-24 animate-pulse rounded-[14px] bg-[#EBEEE1]" />
              </div>
            ) : !offer ? (
              <div className="flex min-h-[500px] flex-col items-center justify-center px-8 text-center">
                <h2 className="font-poppins text-lg font-semibold text-[#0B2C25]">
                  Offre introuvable
                </h2>

                <p className="mt-2 max-w-xs text-sm leading-relaxed text-[rgba(11,44,37,0.71)]">
                  Cette offre a peut-être expiré ou a été retirée par le commerçant.
                </p>

                <button
                  type="button"
                  onClick={closePopup}
                  className="mt-5 rounded-[14px] bg-[#0B2C25] px-5 py-3 text-sm font-medium text-[#FFFAF0]"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-5 sm:p-7">
                {/* CATEGORY */}
                <div className="flex items-center">
                  <span className="rounded-full bg-[#DBF0DD] px-[10px] py-1 text-[11px] font-medium text-[#17664E]">
                    {offer.category?.nameFr || 'Offre anti-gaspi'}
                  </span>
                </div>

                {/* TITLE */}
                <h1 className="font-poppins text-[24px] font-semibold leading-[1.3] text-[#0B2C25] sm:text-[28px]">
                  {offer.name}
                </h1>

                {/* PRICE */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-poppins text-[30px] font-semibold leading-none text-[#17664E] sm:text-[32px]">
                    {formatPrice(offer.discountedPrice)}
                  </span>

                  <span className="text-[16px] text-[rgba(11,44,37,0.71)] line-through">
                    {formatPrice(offer.originalPrice)}
                  </span>

                  <span className="rounded-full bg-[#EDBD4D] px-3 py-[6px] text-[13px] font-semibold text-[#0B2C25]">
                    -{discountPercent}%
                  </span>

                  <span className="ml-auto text-[12px] font-medium text-[#17664E]">
                    Vous économisez {formatPrice(savings)}
                  </span>
                </div>

                {/* SHORT DESCRIPTION */}
                <p className="text-[13px] leading-[21px] text-[rgba(11,44,37,0.71)]">
                  {offer.description}
                </p>

                {/* PICKUP TIME */}
                <div className="flex items-center gap-[14px] rounded-[14px] bg-[#DBF0DD] px-[18px] py-4">
                  <Clock size={25} className="shrink-0 text-[#17664E]" />

                  <div className="flex flex-col gap-[2px]">
                    <p className="text-[12px] text-[#17664E]">
                      À récupérer aujourd’hui
                    </p>

                    <p className="font-poppins text-[18px] font-semibold text-[#0B2C25]">
                      {formatPickupTime(offer.expiresAt)}
                    </p>
                  </div>
                </div>

                {/* MERCHANT CARD */}
                <Link
                  to="/map"
                  className="flex items-center gap-3 rounded-[14px] border border-[rgba(11,44,37,0.30)] bg-transparent px-4 py-[14px] transition hover:bg-white/60"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#EBEEE1] text-[#17664E]">
                    <Store size={23} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#0B2C25]">
                      {offer.shop?.name || 'Commerce partenaire'}
                    </p>

                    <p className="truncate text-[12px] text-[rgba(11,44,37,0.71)]">
                      Le Fournil De Suresnes
                    </p>
                  </div>

                  <div className="ml-auto flex shrink-0 flex-col items-end gap-px">
                    <div className="flex items-center gap-1">
                      <Star
                        size={14}
                        fill="#EDBD4D"
                        stroke="#EDBD4D"
                      />
                      <span className="text-[14px] font-semibold text-[#0B2C25]">
                        {Number(shopRating).toFixed(1)}
                      </span>
                    </div>

                    <span className="text-[11px] text-[rgba(11,44,37,0.71)]">
                      63 avis · 210 ventes
                    </span>
                  </div>

                  <ChevronRight
                    size={18}
                    className="shrink-0 text-[#0B2C25]"
                  />
                </Link>

                {/* PICKUP ADDRESS */}
                <Link
                  to="/map"
                  className="flex items-center gap-[14px] rounded-[14px] border border-[rgba(11,44,37,0.31)] bg-transparent px-4 py-[14px] transition hover:bg-white/60"
                >
                  <MapPin
                    size={22}
                    className="shrink-0 text-[#17664E]"
                  />

                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#0B2C25]">
                      Bab Ezzouar
                    </p>

                    <p className="text-[12px] text-[rgba(11,44,37,0.71)]">
                      {offer.shop?.address || 'Quartier des affaires'}
                    </p>
                  </div>

                  <span className="ml-auto text-[13px] font-semibold text-[#17664E]">
                    100 m
                  </span>

                  <ChevronRight
                    size={18}
                    className="shrink-0 text-[#0B2C25]"
                  />
                </Link>

                {/* PRODUCT INFORMATION */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex min-w-0 flex-col gap-[2px] rounded-[14px] bg-[#EBEEE1] p-[14px]">
                    <p className="text-[14px] font-medium text-[#0B2C25]">
                      500 g
                    </p>
                    <p className="text-[11px] text-[rgba(11,44,37,0.71)]">
                      Poids approximatif
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-col gap-[2px] rounded-[14px] bg-[#EBEEE1] p-[14px]">
                    <p className="text-[14px] font-medium text-[#0B2C25]">
                      {offer.productExpiryDate
                        ? `Avant le ${formatDate(offer.productExpiryDate)}`
                        : 'Non précisée'}
                    </p>
                    <p className="text-[11px] text-[rgba(11,44,37,0.71)]">
                      À consommer
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-col gap-[2px] rounded-[14px] bg-[#EBEEE1] p-[14px]">
                    <p className="text-[14px] font-medium text-[#0B2C25]">
                      {quantityAvailable} restants
                    </p>
                    <p className="text-[11px] text-[rgba(11,44,37,0.71)]">
                      Quantité disponible
                    </p>
                  </div>
                </div>

                {/* MERCHANT DESCRIPTION */}
                <div className="flex flex-col gap-2">
                  <h2 className="text-[15px] font-semibold text-[#0B2C25]">
                    Le bon goût de l’anti-gaspillage
                  </h2>

                  <p className="text-[13px] leading-[21px] text-[rgba(11,44,37,0.71)]">
                    Engagé depuis 3 ans sur Forsa, Le Fournil De Suresnes donne
                    une seconde chance à ses invendus : viennoiseries,
                    sandwichs, boissons et desserts, à petits prix.
                  </p>
                </div>

                {/* CUSTOMER REVIEWS HEADER */}
                <div className="flex items-center gap-2">
                  <h2 className="shrink-0 text-[15px] font-semibold text-[#0B2C25]">
                    Avis des clients
                  </h2>

                  <div className="h-px flex-1 bg-[rgba(11,44,37,0.15)]" />

                  <div className="flex shrink-0 items-center gap-[2px]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={13}
                        fill="#EDBD4D"
                        stroke="#EDBD4D"
                      />
                    ))}
                  </div>

                  <span className="shrink-0 text-[12px] text-[rgba(11,44,37,0.71)]">
                    4.8 · 63 avis
                  </span>
                </div>

                {/* CUSTOMER REVIEW CARDS */}
                {reviews.map((review) => (
                  <div
                    key={review.initials}
                    className="flex items-start gap-3 rounded-[14px] border border-[rgba(11,44,37,0.10)] bg-white p-[14px]"
                  >
                    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#DBF0DD] text-[11px] font-semibold text-[#17664E]">
                      {review.initials}
                    </div>

                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-[#0B2C25]">
                          {review.name}
                        </p>

                        <div className="flex items-center gap-[2px]">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              size={11}
                              fill={
                                index < review.rating ? '#EDBD4D' : 'none'
                              }
                              stroke="#EDBD4D"
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-[12px] leading-normal text-[rgba(11,44,37,0.71)]">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                ))}

                {/* BRING YOUR BAG REMINDER */}
                <div className="flex items-center gap-3 rounded-[14px] bg-[#DBF0DD] p-4">
                  <ShoppingBag
                    size={22}
                    className="shrink-0 text-[#17664E]"
                  />

                  <p className="text-[12px] leading-[1.5] text-[#17664E]">
                    Apportez votre sac ou cabas pour le retrait. Ensemble,
                    limitons nos déchets !
                  </p>
                </div>

                {/* REPORT OFFER */}
                <button
                  type="button"
                  className="flex w-fit items-center gap-[6px] pb-1 text-[12px] text-[rgba(11,44,37,0.71)] underline"
                >
                  <Flag size={15} />
                  Signaler cette offre
                </button>
              </div>
            )}
          </div>

          {/* FIXED POPUP FOOTER */}
          {!loading && offer && (
            <div className="shrink-0 border-t border-[rgba(11,44,37,0.10)] bg-[#FFFAF0] px-5 pb-[18px] pt-4 sm:px-7 sm:pb-[22px]">
              <div className="flex items-center gap-[14px]">
                {/* QUANTITY SELECTOR */}
                <div className="flex h-12 w-[112px] shrink-0 items-center justify-between rounded-[14px] border border-[rgba(11,44,37,0.10)] bg-white px-3">
                  <button
                    type="button"
                    aria-label="Diminuer la quantité"
                    disabled={quantity <= 1}
                    onClick={() => handleQuantityChange('minus')}
                    className="text-[#0B2C25] disabled:opacity-30"
                  >
                    <Minus size={19} />
                  </button>

                  <span className="text-[14px] font-medium text-[#0B2C25]">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    aria-label="Augmenter la quantité"
                    disabled={quantity >= quantityAvailable}
                    onClick={() => handleQuantityChange('plus')}
                    className="text-[#0B2C25] disabled:opacity-30"
                  >
                    <Plus size={19} />
                  </button>
                </div>

                {/* ADD TO CART */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={quantityAvailable === 0}
                  className="flex h-12 min-w-0 flex-1 items-center justify-center gap-[10px] rounded-[14px] bg-[#0B2C25] px-4 text-[14px] font-medium text-[#FFFAF0] transition hover:bg-[#17664E] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ShoppingCart size={19} />
                  Ajouter au panier
                </button>
              </div>

              <p className="mt-[10px] text-center text-[11px] text-[rgba(11,44,37,0.71)]">
                Paiement sur place au retrait · {quantityAvailable} restants
              </p>
            </div>
          )}
        </section>

        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={closePopup}
          aria-label="Fermer"
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(11,44,37,0.10)] bg-white text-[#0B2C25] shadow-[0px_4px_8px_rgba(11,44,37,0.12)] transition hover:bg-[#DBF0DD]"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default OfferDetailsPage;
