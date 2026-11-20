
import React, { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation as useRouterLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  ChevronDown,
  ArrowRight,
  PackageSearch,
  RotateCcw,
} from 'lucide-react';

import { CatalogueApi } from '../services/api';
import { Category, Offer, OfferFilterParams } from '../types';
import { useLocation } from '../context/LocationContext';

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} DA`;

const formatTime = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Horaire non précisé';

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDistance = (
  lat1: number,
  lng1: number,
  lat2?: number,
  lng2?: number,
) => {
  if (
    typeof lat2 !== 'number' ||
    typeof lng2 !== 'number' ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const distance = earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
};

const readFilters = (params: URLSearchParams): OfferFilterParams => ({
  q: params.get('q') || undefined,
  category: params.get('category') || undefined,
  minPrice: params.has('minPrice')
    ? Number(params.get('minPrice'))
    : undefined,
  maxPrice: params.has('maxPrice')
    ? Number(params.get('maxPrice'))
    : undefined,
  minDiscount: params.has('minDiscount')
    ? Number(params.get('minDiscount'))
    : undefined,
  available: params.has('available')
    ? params.get('available') === 'true'
    : true,
  sort:
    (params.get('sort') as OfferFilterParams['sort']) || 'distance',
  page: 1,
  limit: 12,
});

interface FilterChip {
  key: string;
  label: string;
  remove: () => void;
}

interface ResultOfferCardProps {
  offer: Offer;
  latitude: number;
  longitude: number;
}

const ResultOfferCard: React.FC<ResultOfferCardProps> = ({
  offer,
  latitude,
  longitude,
}) => {
  const backgroundLocation = useRouterLocation();

  const photo =
    offer.photos?.[0]?.url ||
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80';

  const distance = getDistance(
    latitude,
    longitude,
    offer.shop?.latitude,
    offer.shop?.longitude,
  );

  return (
    <Link
      to={`/offers/${offer.id}`}
      state={{ backgroundLocation }}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0px_4px_16px_rgba(11,44,37,0.04)] transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-[164px] w-full overflow-hidden bg-[#EBEEE1]">
        <img
          src={photo}
          alt={offer.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <span className="absolute left-[10px] top-[10px] rounded-full bg-[#0B2C25] px-[9px] py-[4px] font-poppins text-[10px] font-medium text-[#FFFAF0]">
          -{offer.discountPercent}%
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-[8px] p-[18px]">
        <p className="text-[11px] text-[rgba(11,44,37,0.71)]">
          {offer.category?.nameFr || 'Offre'} ·{' '}
          {offer.shop?.address || 'Adresse non précisée'}
        </p>

        <h2 className="line-clamp-2 font-poppins text-[18px] font-semibold leading-[1.4] text-[#0B2C25]">
          {offer.name}
        </h2>

        <div className="flex flex-wrap items-center gap-[7px]">
          <span className="font-poppins text-[21px] font-semibold text-[#17664E]">
            {formatPrice(offer.discountedPrice)}
          </span>

          <span className="text-[12px] text-[rgba(11,44,37,0.71)] line-through">
            {formatPrice(offer.originalPrice)}
          </span>
        </div>

        <p className="text-[12px] text-[rgba(11,44,37,0.71)]">
          Retrait avant {formatTime(offer.expiresAt)}
          {distance ? ` · ${distance}` : ''}
        </p>

        <div className="mt-auto flex h-[32px] items-center justify-between pt-1">
          <span className="text-[12px] font-semibold text-[#17664E]">
            Voir l’offre
          </span>

          <ArrowRight
            size={18}
            className="text-[#17664E] transition group-hover:translate-x-1"
          />
        </div>
      </div>
    </Link>
  );
};

export const ExploreOffersPage: React.FC = () => {
  const navigate = useNavigate();
  const { location } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const filters = useMemo(
    () => readFilters(searchParams),
    [searchParams],
  );

  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    CatalogueApi.getCategories()
      .then((result) => {
        if (!cancelled) {
          setCategories(result);
        }
      })
      .catch((err) => {
        console.error('Unable to load categories:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchFilteredOffers = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await CatalogueApi.getOffers({
          ...filters,
          lat: location.lat,
          lng: location.lng,
        });

        if (!cancelled) {
          setOffers(result.data || []);
          setTotalCount(result.pagination?.total ?? result.data.length);
        }
      } catch (err) {
        console.error('Unable to load filtered offers:', err);

        if (!cancelled) {
          setOffers([]);
          setTotalCount(0);
          setError('Impossible de charger les résultats pour le moment.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchFilteredOffers();

    return () => {
      cancelled = true;
    };
  }, [filters, location]);

  const selectedCategory = categories.find(
    (category) => category.slug === filters.category,
  );

  const merchantCount = new Set(
    offers.map((offer) => offer.shopId),
  ).size;

  const activeFilterCount = [
    filters.category,
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.minDiscount !== undefined,
    filters.available === false,
  ].filter(Boolean).length;

  const sortLabel: Record<string, string> = {
    distance: 'Distance',
    price: 'Prix croissant',
    discount: 'Meilleures réductions',
    deadline: 'Expiration la plus proche',
  };

  const updateParams = (nextFilters: OfferFilterParams) => {
    const params = new URLSearchParams();

    if (nextFilters.q) params.set('q', nextFilters.q);
    if (nextFilters.category) {
      params.set('category', nextFilters.category);
    }

    if (nextFilters.minPrice !== undefined) {
      params.set('minPrice', String(nextFilters.minPrice));
    }

    if (nextFilters.maxPrice !== undefined) {
      params.set('maxPrice', String(nextFilters.maxPrice));
    }

    if (nextFilters.minDiscount !== undefined) {
      params.set('minDiscount', String(nextFilters.minDiscount));
    }

    if (nextFilters.available === false) {
      params.set('available', 'false');
    }

    if (nextFilters.sort) {
      params.set('sort', nextFilters.sort);
    }

    setSearchParams(params);
  };

  const removeFilter = (key: string) => {
    const nextFilters = { ...filters };

    if (key === 'category') nextFilters.category = undefined;
    if (key === 'minPrice') nextFilters.minPrice = undefined;
    if (key === 'maxPrice') nextFilters.maxPrice = undefined;
    if (key === 'minDiscount') nextFilters.minDiscount = undefined;
    if (key === 'available') nextFilters.available = true;
    if (key === 'q') nextFilters.q = undefined;

    updateParams(nextFilters);
  };

  const clearFilters = () => {
    updateParams({
      available: true,
      sort: 'distance',
      page: 1,
      limit: 12,
    });
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();

    updateParams({
      ...filters,
      q: searchInput.trim() || undefined,
      page: 1,
    });
  };

  const chips: FilterChip[] = [];

  if (filters.category) {
    chips.push({
      key: 'category',
      label: selectedCategory?.nameFr || filters.category,
      remove: () => removeFilter('category'),
    });
  }

  if (filters.minPrice !== undefined) {
    chips.push({
      key: 'minPrice',
      label: `Dès ${formatPrice(filters.minPrice)}`,
      remove: () => removeFilter('minPrice'),
    });
  }

  if (filters.maxPrice !== undefined) {
    chips.push({
      key: 'maxPrice',
      label: `Jusqu'à ${formatPrice(filters.maxPrice)}`,
      remove: () => removeFilter('maxPrice'),
    });
  }

  if (filters.minDiscount !== undefined) {
    chips.push({
      key: 'minDiscount',
      label: `Réduction ≥ ${filters.minDiscount}%`,
      remove: () => removeFilter('minDiscount'),
    });
  }

  if (filters.available === false) {
    chips.push({
      key: 'available',
      label: 'Toutes les disponibilités',
      remove: () => removeFilter('available'),
    });
  }

  if (filters.q) {
    chips.push({
      key: 'q',
      label: `Recherche : ${filters.q}`,
      remove: () => removeFilter('q'),
    });
  }

  return (
    <div className="min-h-screen bg-[#FFFAF0] px-5 pb-12 pt-7 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* PAGE HEADER */}
        <section className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2 text-[11px] text-[rgba(11,44,37,0.71)]">
              Mon espace / Accueil / Recherche
            </p>

            <h1 className="font-poppins text-[27px] font-semibold tracking-[-0.8px] text-[#0B2C25] sm:text-[30px]">
              {filters.q
                ? `Résultats pour « ${filters.q} »`
                : 'Résultats de recherche'}
            </h1>

            <p className="mt-1 text-[13px] text-[rgba(11,44,37,0.71)]">
              {totalCount} offre{totalCount > 1 ? 's' : ''} ·{' '}
              {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}{' '}
              actif{activeFilterCount > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-[12px] text-[#0B2C25] sm:flex">
              <MapPin size={17} />
              {location.label}
            </div>

            <button
              type="button"
              aria-label="Notifications"
              className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-[rgba(11,44,37,0.10)] bg-white text-[#0B2C25]"
            >
              <span className="relative">
                <SlidersHorizontal size={19} />
              </span>
            </button>
          </div>
        </section>

        {/* SEARCH BAR */}
        <form
          onSubmit={handleSearch}
          className="flex w-full items-center gap-[10px]"
        >
          <div className="flex h-[46px] min-w-0 flex-1 items-center gap-[10px] rounded-[14px] border border-[rgba(11,44,37,0.10)] bg-white px-[14px]">
            <Search size={20} className="shrink-0 text-[#0B2C25]" />

            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher une offre, un produit..."
              className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-[#0B2C25] outline-none placeholder:text-[#8A9088]"
            />

            {searchInput && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setSearchInput('')}
                className="text-[#78847F]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Retour aux filtres"
            className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] border border-[rgba(11,44,37,0.10)] bg-white text-[#0B2C25] transition hover:bg-[#DBF0DD]"
          >
            <SlidersHorizontal size={20} />

            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#17664E] px-1 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button type="submit" className="sr-only">
            Rechercher
          </button>
        </form>

        {/* ACTIVE FILTER CHIPS */}
        {chips.length > 0 && (
          <section className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                type="button"
                key={chip.key}
                onClick={chip.remove}
                className="flex items-center gap-[6px] rounded-full bg-[#0B2C25] px-[14px] py-[8px] text-[12px] font-semibold text-[#FFFAF0] transition hover:bg-[#17664E]"
              >
                {chip.label}
                <X size={14} />
              </button>
            ))}

            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] font-semibold text-[#17664E] underline underline-offset-2"
            >
              Tout effacer
            </button>
          </section>
        )}

        {/* RESULTS HEADER */}
        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-end gap-2">
            <h2 className="text-[18px] font-semibold text-[#0B2C25]">
              {totalCount} offre{totalCount > 1 ? 's' : ''}
            </h2>

            <p className="pb-[2px] text-[12px] text-[rgba(11,44,37,0.71)]">
              · triées par {sortLabel[filters.sort || 'distance']}
            </p>
          </div>

          <div className="flex-1" />

          <label className="flex h-[38px] items-center gap-[6px] rounded-full border border-[rgba(11,44,37,0.10)] bg-white px-[14px] text-[12px] text-[#0B2C25]">
            <span className="whitespace-nowrap">Trier :</span>

            <select
              value={filters.sort || 'distance'}
              onChange={(event) =>
                updateParams({
                  ...filters,
                  sort: event.target.value as OfferFilterParams['sort'],
                  page: 1,
                })
              }
              className="max-w-[155px] cursor-pointer bg-transparent font-medium outline-none"
            >
              <option value="distance">Plus proches</option>
              <option value="price">Prix croissant</option>
              <option value="discount">Meilleures réductions</option>
              <option value="deadline">Expiration la plus proche</option>
            </select>

            <ChevronDown size={14} />
          </label>

          <Link
            to="/map"
            className="flex h-[38px] items-center justify-center gap-[6px] rounded-full border border-[rgba(11,44,37,0.10)] bg-white px-[14px] text-[12px] font-medium text-[#0B2C25] transition hover:bg-[#DBF0DD]"
          >
            <MapPin size={16} />
            Voir sur la carte
          </Link>
        </section>

        {/* RESULTS */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-[360px] animate-pulse rounded-[20px] bg-[#EBEEE1]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[20px] border border-[#E8E6DF] bg-white p-12 text-center">
            <p className="text-sm text-[#526C63]">{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-[12px] bg-[#0B2C25] px-5 py-3 text-xs font-semibold text-white"
            >
              Réessayer
            </button>
          </div>
        ) : offers.length > 0 ? (
          <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => (
              <ResultOfferCard
                key={offer.id}
                offer={offer}
                latitude={location.lat}
                longitude={location.lng}
              />
            ))}

            {/* EXPAND SEARCH CARD */}
            {chips.length > 0 && (
              <div className="flex min-h-[330px] flex-col items-center justify-center gap-[14px] rounded-[20px] bg-[#DBF0DD] p-8 text-center">
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white text-[#17664E]">
                  <RotateCcw size={22} />
                </div>

                <h3 className="text-[15px] font-semibold text-[#0B2C25]">
                  Pas assez de choix ?
                </h3>

                <p className="max-w-[240px] text-[12px] leading-relaxed text-[rgba(11,44,37,0.71)]">
                  Retirez un filtre pour voir plus d’offres près de vous.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full bg-[#0B2C25] px-[18px] py-[9px] text-[12px] font-semibold text-[#FFFAF0] transition hover:bg-[#17664E]"
                >
                  Effacer les filtres
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[20px] border border-[rgba(11,44,37,0.10)] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#DBF0DD] text-[#17664E]">
              <PackageSearch size={30} />
            </div>

            <h3 className="mt-5 text-[18px] font-semibold text-[#0B2C25]">
              Aucune offre ne correspond à vos filtres
            </h3>

            <p className="mx-auto mt-2 max-w-[440px] text-[12px] leading-relaxed text-[#526C63]">
              Essayez un autre mot-clé ou retirez un filtre pour découvrir
              davantage d’offres.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 inline-flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-[#0B2C25] px-5 text-[12px] font-semibold text-white transition hover:bg-[#17664E]"
            >
              <RotateCcw size={15} />
              Effacer les filtres
            </button>
          </div>
        )}

        {totalCount > offers.length && (
          <p className="text-center text-[11px] text-[#526C63]">
            {offers.length} offres affichées sur {totalCount}. La pagination
            sera disponible avec le chargement des pages suivantes.
          </p>
        )}
      </div>
    </div>
  );
};

export default ExploreOffersPage;
