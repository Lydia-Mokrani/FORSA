
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Bell,
  UserRound,
  ArrowRight,
  Clock,
  ShoppingBasket,
  ChevronRight,
} from 'lucide-react';

import { CatalogueApi } from '../services/api';
import { Category, Offer } from '../types';
import { useLocation } from '../context/LocationContext';

const CATEGORY_IMAGES: Record<string, string> = {
  epicerie:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=160&q=80',
  pâtisserie:
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=160&q=80',
  patisserie:
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=160&q=80',
  boulangerie:
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=160&q=80',
  laitier:
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=160&q=80',
};

const getCategoryImage = (category: Category) => {
  const name = category.nameFr.toLowerCase();

  const matchedKey = Object.keys(CATEGORY_IMAGES).find((key) =>
    name.includes(key),
  );

  return matchedKey
    ? CATEGORY_IMAGES[matchedKey]
    : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=160&q=80';
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} DA`;

const formatPickupTime = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'À confirmer';

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface HomeOfferCardProps {
  offer: Offer;
}

const HomeOfferCard: React.FC<HomeOfferCardProps> = ({ offer }) => {
  const photo =
    offer.photos?.[0]?.url ||
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80';

  const quantityAvailable = offer.quantityAvailable;
  const quantityInitial =
    offer.quantityInitial || offer.quantityAvailable || 1;

  const stockPercentage = Math.min(
    100,
    Math.max(0, (quantityAvailable / quantityInitial) * 100),
  );

  const isLowStock = quantityAvailable <= 3;

  return (
    <Link
      to={`/offers/${offer.id}`}
      className="group flex min-w-0 flex-col rounded-[16px] bg-white p-[12px] shadow-[0px_4px_7px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Product image */}
      <div className="relative h-[150px] w-full overflow-hidden rounded-[12px] bg-[#F0EEE8]">
        <img
          src={photo}
          alt={offer.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <span className="absolute left-[9px] top-[9px] rounded-[7px] bg-[#0B2C25] px-[10px] py-[6px] font-poppins text-[10px] font-bold text-white">
          -{offer.discountPercent}%
        </span>

        {offer.category && (
          <span className="absolute right-[9px] top-[9px] rounded-[7px] bg-white/90 px-[9px] py-[6px] font-poppins text-[10px] font-semibold text-[#0B2C25]">
            {offer.category.nameFr}
          </span>
        )}
      </div>

      {/* Pickup information */}
      <div className="mt-[9px] flex items-center gap-[6px]">
        <Clock size={12} className="shrink-0 text-[#78847F]" />

        <p className="font-poppins text-[9px] text-[#78847F]">
          Retrait avant {formatPickupTime(offer.expiresAt)}
        </p>
      </div>

      {/* Product title and merchant */}
      <div className="mt-[9px] min-h-[65px]">
        <h3 className="line-clamp-1 font-poppins text-[16px] font-semibold leading-[24px] text-[#0B2C25]">
          {offer.name}
        </h3>

        <p className="mt-[2px] truncate font-poppins text-[10px] text-[rgba(11,44,37,0.66)]">
          {offer.shop?.name || 'Commerce partenaire'}
        </p>
      </div>

      {/* Pricing */}
      <div className="mt-[8px] flex flex-wrap items-baseline gap-[7px]">
        <span className="font-poppins text-[17px] font-bold text-[#17664E]">
          {formatPrice(offer.discountedPrice)}
        </span>

        <span className="font-poppins text-[10px] text-[#78847F] line-through">
          {formatPrice(offer.originalPrice)}
        </span>
      </div>

      {/* Stock progress */}
      <div className="mt-[13px]">
        <div className="mb-[5px] flex items-center justify-between gap-2">
          <p className="font-poppins text-[9px] text-[rgba(11,44,37,0.65)]">
            {quantityAvailable}{' '}
            {quantityAvailable > 1 ? 'pièces restantes' : 'pièce restante'}
          </p>

          {isLowStock && (
            <span className="font-poppins text-[8px] font-semibold text-[#A34A42]">
              Bientôt épuisé
            </span>
          )}
        </div>

        <div className="h-[6px] w-full overflow-hidden rounded-[3px] bg-[#D9D9D9]">
          <div
            className="h-full rounded-[3px] bg-[#0B2C25] transition-all"
            style={{ width: `${stockPercentage}%` }}
          />
        </div>
      </div>

      {/* Action */}
      <div className="mt-[13px] border-t border-[#F0F0F0] pt-[11px]">
        <span className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#0B2C25] px-3 py-[9px] font-poppins text-[11px] font-bold text-white transition-colors group-hover:bg-[#17664E]">
          Voir l'offre
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
};

export const HomePage: React.FC = () => {
  const { location, openModal } = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [nearbyOffers, setNearbyOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    CatalogueApi.getCategories()
      .then((result) => {
        if (!cancelled) setCategories(result);
      })
      .catch((err) => console.error('Unable to load categories:', err));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await CatalogueApi.getOffers({
          lat: location.lat,
          lng: location.lng,
          category: selectedCategory,
          q: searchQuery || undefined,
          limit: 8,
          sort: 'distance',
        });

        if (!cancelled) {
          setNearbyOffers(result.data || []);
        }
      } catch (err) {
        console.error('Unable to load nearby offers:', err);

        if (!cancelled) {
          setError('Impossible de charger les offres pour le moment.');
          setNearbyOffers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, [location, selectedCategory, searchQuery, retryCount]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const displayedCategories = categories.slice(0, 4);

  const mapBox = [
    location.lng - 0.012,
    location.lat - 0.008,
    location.lng + 0.012,
    location.lat + 0.008,
  ].join('%2C');

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapBox}&layer=mapnik&marker=${location.lat}%2C${location.lng}`;

  return (
    <div className="min-h-screen bg-[#FFFAF0] px-5 pb-32 pt-7 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1200px]">

        {/* Heading */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-medium text-[#7B8178]">
              Mon espace / Accueil
            </p>

            <h1 className="text-[29px] font-semibold tracking-tight text-[#0B2C25] sm:text-[32px]">
              Bonjour !
            </h1>

            <p className="mt-1 text-sm text-[#73796F]">
              Que souhaitez-vous acheter aujourd'hui ?
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openModal}
              className="hidden items-center gap-2 text-xs font-medium text-[#0B2C25] sm:flex"
            >
              <MapPin size={18} />
              <span className="max-w-[160px] truncate">{location.label}</span>
            </button>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-[45px] w-[45px] items-center justify-center rounded-full text-[#0B2C25]"
            >
              <Bell size={22} />
            </button>

            <button
              type="button"
              aria-label="Profil"
              className="flex h-[45px] w-[45px] items-center justify-center rounded-full bg-[#E8E9DF] text-[#0B2C25]"
            >
              <UserRound size={21} />
            </button>
          </div>
        </section>

        {/* Mobile location */}
        <button
          type="button"
          onClick={openModal}
          className="mb-5 flex w-full items-center gap-2 rounded-xl border border-[#EAE8E1] bg-white px-4 py-3 text-left text-xs text-[#0B2C25] sm:hidden"
        >
          <MapPin size={17} />
          <span className="truncate">{location.label}</span>
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6 flex max-w-[666px] gap-3">
          <div className="flex h-[46px] flex-1 items-center gap-3 rounded-[13px] border border-[#E6E4DD] bg-white px-4">
            <Search size={19} className="shrink-0 text-[#0B2C25]" />

            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher"
              className="h-full w-full bg-transparent text-sm text-[#0B2C25] outline-none placeholder:text-[#8A9088]"
            />
          </div>

          <button
            type="button"
            onClick={() => navigate('/explore')}
            aria-label="Filtres"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] border border-[#E6E4DD] bg-white text-[#0B2C25]"
          >
            <SlidersHorizontal size={20} />
          </button>
        </form>

        {/* Map */}
        <section className="relative mb-6 h-[210px] overflow-hidden rounded-[22px] border border-[#E8E5DC] bg-[#E5E8D8] sm:h-[234px]">
          <iframe
            title="Carte des commerces à proximité"
            src={mapUrl}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0B2C25] px-4 py-2 text-xs font-semibold text-white shadow-lg">
            {nearbyOffers.length > 0
              ? `${nearbyOffers.length} offres disponibles près de vous`
              : 'Découvrez les commerces près de vous'}
          </div>
        </section>

        {/* Categories */}
        <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setSelectedCategory(undefined)}
            className={`flex h-[64px] items-center gap-3 rounded-[14px] border px-3 text-left transition ${
              !selectedCategory
                ? 'border-[#0B5B43] bg-[#DCEEDD]'
                : 'border-[#E8E6DF] bg-white hover:border-[#A8C6AD]'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EDE2] text-lg">
              🥖
            </span>
            <span className="text-xs font-medium text-[#0B2C25]">Tout</span>
          </button>

          {displayedCategories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category.slug
                    ? undefined
                    : category.slug,
                )
              }
              className={`flex h-[64px] min-w-0 items-center gap-3 rounded-[14px] border px-3 text-left transition ${
                selectedCategory === category.slug
                  ? 'border-[#0B5B43] bg-[#DCEEDD]'
                  : 'border-[#E8E6DF] bg-white hover:border-[#A8C6AD]'
              }`}
            >
              <img
                src={getCategoryImage(category)}
                alt=""
                className="h-10 w-10 shrink-0 rounded-xl object-cover"
              />

              <span className="truncate text-xs font-medium text-[#0B2C25]">
                {category.nameFr}
              </span>
            </button>
          ))}
        </section>

        {/* Offers */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[20px] font-semibold text-[#0B2C25]">
              Offres à proximité
            </h2>

            <Link
              to="/map"
              className="flex items-center gap-2 text-xs font-medium text-[#0B5B43]"
            >
              <MapPin size={16} />
              Voir sur la carte
              <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[350px] animate-pulse rounded-[16px] bg-[#EEECE4]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-10 text-center">
              <p className="text-sm text-[#73796F]">{error}</p>

              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-4 text-sm font-semibold text-[#0B5B43]"
              >
                Réessayer
              </button>
            </div>
          ) : nearbyOffers.length > 0 ? (
           <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {nearbyOffers.map((offer) => (
    <HomeOfferCard key={offer.id} offer={offer} />
  ))}
</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#DCD9CF] bg-white p-10 text-center">
              <ShoppingBasket
                size={32}
                className="mx-auto mb-3 text-[#8A9088]"
              />

              <h3 className="text-sm font-semibold text-[#0B2C25]">
                Aucune offre disponible pour le moment
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#777C74]">
                Essayez une autre catégorie ou modifiez votre localisation
                pour découvrir davantage de commerces.
              </p>

              <button
                type="button"
                onClick={openModal}
                className="mt-4 rounded-xl bg-[#0B2C25] px-5 py-3 text-xs font-semibold text-white"
              >
                Modifier ma localisation
              </button>
            </div>
          )}
        </section>

        {/* Bottom reservation bar */}
        <section className="fixed bottom-3 left-3 right-3 z-30 flex min-h-[70px] items-center gap-3 rounded-[16px] bg-[#0B2C25] px-4 py-3 text-white shadow-xl md:left-[258px] md:right-10 md:px-5">
          <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-xl bg-[#FFFAF0] text-[#0B2C25]">
            <ShoppingBasket size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Mes réservations</p>
            <p className="mt-1 truncate text-[11px] text-white/70">
              Retrouvez ici les offres que vous avez réservées.
            </p>
          </div>

          <Link
            to="/explore"
            className="flex shrink-0 items-center gap-2 text-xs font-semibold text-white"
          >
            Explorer
            <ChevronRight size={17} />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
