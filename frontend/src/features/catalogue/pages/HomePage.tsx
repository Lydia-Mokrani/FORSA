
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
  Leaf,
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
    name.includes(key)
  );

  return matchedKey
    ? CATEGORY_IMAGES[matchedKey]
    : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=160&q=80';
};

const getPickupTime = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Retrait à confirmer';
  }

  return `Retrait avant ${date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

interface HomeOfferCardProps {
  offer: Offer;
}

const HomeOfferCard: React.FC<HomeOfferCardProps> = ({ offer }) => {
  const photo =
    offer.photos?.[0]?.url ||
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80';

  const isLowStock = offer.quantityAvailable <= 5;

  return (
    <Link
      to={`/offers/${offer.id}`}
      className="group min-w-0 overflow-hidden rounded-[18px] border border-[#EAE8E1] bg-white transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-[164px] overflow-hidden bg-[#EAE8E1]">
        <img
          src={photo}
          alt={offer.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute left-3 top-3 rounded-full bg-[#0B2C25] px-3 py-1 text-[11px] font-semibold text-white">
          {isLowStock
            ? `${offer.quantityAvailable} restants`
            : `-${offer.discountPercent}%`}
        </div>
      </div>

      <div className="p-[18px]">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-[#777C74]">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">
            {offer.shop?.name || 'Commerce partenaire'}
          </span>
        </p>

        <h3 className="mb-3 line-clamp-1 text-[16px] font-bold text-[#0B2C25]">
          {offer.name}
        </h3>

        <div className="mb-3 flex items-baseline gap-3">
          <span className="text-[23px] font-bold text-[#0B2C25]">
            {offer.discountedPrice} DA
          </span>

          <span className="text-sm text-[#969990] line-through">
            {offer.originalPrice} DA
          </span>
        </div>

        <p className="mb-4 flex items-center gap-2 text-xs text-[#777C74]">
          <Clock size={14} />
          {getPickupTime(offer.expiresAt)}
        </p>

        <div className="flex items-center justify-between border-t border-[#F0EEE8] pt-3 text-sm font-semibold text-[#0B5B43]">
          <span>Voir l'offre</span>
          <ArrowRight
            size={17}
            className="transition group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
};

export const HomePage: React.FC = () => {
  const { location, openModal } = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [nearbyOffers, setNearbyOffers] = useState<Offer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const result = await CatalogueApi.getCategories();

        if (!cancelled) {
          setCategories(result);
        }
      } catch (err) {
        console.error('Unable to load categories:', err);
      }
    };

    loadCategories();

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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, [location, selectedCategory, searchQuery]);

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
        {/* Page heading */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-xs font-medium text-[#7B8178]">
              Mon espace / Accueil
            </p>

            <h1 className="text-[29px] font-bold tracking-tight text-[#0B2C25] sm:text-[32px]">
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
              className="hidden items-center gap-2 text-xs font-medium text-[#0B2C25] transition hover:text-[#14734F] sm:flex"
            >
              <MapPin size={18} />
              <span className="max-w-[160px] truncate">{location.label}</span>
            </button>

            <button
              type="button"
              aria-label="Notifications"
              title="Notifications"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[#EAE8E1] bg-white text-[#0B2C25]"
            >
              <Bell size={20} />
            </button>

            <button
              type="button"
              aria-label="Profil"
              title="Profil"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#E8E9DF] text-[#0B2C25]"
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
        <form
          onSubmit={handleSearch}
          className="mb-6 flex max-w-[666px] gap-3"
        >
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
            title="Filtres"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] border border-[#E6E4DD] bg-white text-[#0B2C25] transition hover:bg-[#E8F2E8]"
          >
            <SlidersHorizontal size={20} />
          </button>
        </form>

        {/* Nearby map */}
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

        {/* Category navigation */}
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
                    : category.slug
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

        {/* Nearby offers */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[20px] font-bold text-[#0B2C25]">
              Offres à proximité
            </h2>

            <Link
              to="/map"
              className="flex items-center gap-2 text-xs font-medium text-[#0B5B43] transition hover:text-[#14734F]"
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
                  className="h-[350px] animate-pulse rounded-[18px] bg-[#EEECE4]"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[#E8E6DF] bg-white p-10 text-center">
              <p className="text-sm text-[#73796F]">{error}</p>
              <button
                type="button"
                onClick={() => setSearchQuery((value) => value)}
                className="mt-4 text-sm font-semibold text-[#0B5B43]"
              >
                Réessayer
              </button>
            </div>
          ) : nearbyOffers.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {nearbyOffers.slice(0, 3).map((offer) => (
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
                className="mt-4 rounded-xl bg-[#0B2C25] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#17483B]"
              >
                Modifier ma localisation
              </button>
            </div>
          )}
        </section>

        {/* Reservation handoff */}
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

          <div className="hidden items-center gap-2 text-xs text-white/80 lg:flex">
            <Leaf size={17} />
            <span>Un petit geste, moins de gaspillage.</span>
          </div>

          <Link
            to="/explore"
            className="flex shrink-0 items-center gap-2 text-xs font-semibold text-white transition hover:text-[#BDE5C2]"
          >
            Explorer
            <ChevronRight size={17} />
          </Link>
        </section>
      </div>
    </div>
  );
};
