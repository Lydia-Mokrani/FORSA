
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { CatalogueApi } from '../services/api';
import { Offer } from '../types';
import { useLocation } from '../context/LocationContext';

type ShopGroup = {
  shop: Offer['shop'];
  offers: Offer[];
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fr-FR').format(price)} DA`;

const getDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (distance: number) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
};

type EmptyMapStateProps = {
  onExpandZone: () => void;
  onResetFilters: () => void;
};

const EmptyMapState: React.FC<EmptyMapStateProps> = ({
  onExpandZone,
  onResetFilters,
}) => (
  <div className="flex w-full flex-col items-center gap-[10px] rounded-[20px] border border-[rgba(11,44,37,0.10)] bg-white p-[18px] text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DBF0DD]">
      <MapPin size={30} strokeWidth={1.8} className="text-[#17664E]" />
    </div>

    <h2 className="text-[18px] font-semibold leading-[1.3] text-[#0B2C25]">
      Aucune offre dans cette zone
    </h2>

    <p className="text-[12px] leading-relaxed text-[#526C63]">
      Aucune offre ne correspond à votre recherche et à vos filtres.
      Élargissez la zone ou assouplissez vos critères.
    </p>

    <button
      type="button"
      onClick={onExpandZone}
      className="mt-1 flex h-12 w-full items-center justify-center rounded-[14px] bg-[#0B2C25] px-4 text-[13px] font-semibold text-white transition hover:bg-[#17664E]"
    >
      Élargir la zone
    </button>

    <button
      type="button"
      onClick={onResetFilters}
      className="flex h-12 w-full items-center justify-center rounded-[14px] border border-[rgba(11,44,37,0.10)] bg-white px-4 text-[13px] font-semibold text-[#0B2C25] transition hover:bg-[#FFFAF0]"
    >
      Réinitialiser les filtres
    </button>
  </div>
);

export const ShopsMapViewPage: React.FC = () => {
  const { location, openModal } = useLocation();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      setLoading(true);

      try {
        const result = await CatalogueApi.getOffers({
          available: true,
          limit: 50,
        });

        if (!cancelled) {
          setOffers(result.data);
        }
      } catch (error) {
        console.error('Unable to load map offers:', error);

        if (!cancelled) {
          setOffers([]);
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
  }, []);

  const shops = useMemo<ShopGroup[]>(() => {
    const grouped = new Map<string, ShopGroup>();

    offers.forEach((offer) => {
      if (!offer.shop) return;

      const existing = grouped.get(offer.shop.id);

      if (existing) {
        existing.offers.push(offer);
      } else {
        grouped.set(offer.shop.id, {
          shop: offer.shop,
          offers: [offer],
        });
      }
    });

    return Array.from(grouped.values());
  }, [offers]);

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();

    offers.forEach((offer) => {
      if (offer.category?.slug && offer.category?.nameFr) {
        categoryMap.set(offer.category.slug, offer.category.nameFr);
      }
    });

    return Array.from(categoryMap.entries()).map(([slug, name]) => ({
      slug,
      name,
    }));
  }, [offers]);

  const filteredShops = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    return shops.filter(({ shop, offers: shopOffers }) => {
      const matchesSearch =
        !query ||
        shop.name.toLowerCase().includes(query) ||
        shop.address.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategory === 'all' ||
        shopOffers.some(
          (offer) => offer.category?.slug === selectedCategory,
        );

      return matchesSearch && matchesCategory;
    });
  }, [shops, searchInput, selectedCategory]);

  const selectedShop = useMemo(
    () =>
      filteredShops.find(({ shop }) => shop.id === selectedShopId) ??
      filteredShops[0] ??
      null,
    [filteredShops, selectedShopId],
  );

  const selectedOffer = selectedShop?.offers[0] ?? null;

  const getShopDistance = (shop: Offer['shop']) =>
    getDistance(
      location.lat,
      location.lng,
      shop.latitude,
      shop.longitude,
    );

  const resetFilters = () => {
    setSearchInput('');
    setSelectedCategory('all');
    setSelectedShopId(null);
    setShowFilters(false);
  };

  // Initialize the map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([location.lat, location.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      userMarkerRef.current = null;
    };
  }, []);

  // Update the user's location marker when the selected location changes.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setView([location.lat, location.lng], 13);

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userIcon = L.divIcon({
      className: 'forsa-user-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #2563EB;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker(
      [location.lat, location.lng],
      { icon: userIcon, zIndexOffset: 1000 },
    )
      .bindPopup('Votre position')
      .addTo(map);
  }, [location]);

  // Rebuild shop markers when the filtered shop list changes.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    filteredShops.forEach(({ shop }) => {
      if (
        !Number.isFinite(shop.latitude) ||
        !Number.isFinite(shop.longitude) ||
        (shop.latitude === 0 && shop.longitude === 0)
      ) {
        return;
      }

      const markerIcon = L.divIcon({
        className: 'forsa-shop-marker',
        html: `
          <div style="
            width: 38px;
            height: 38px;
            background: #0B2C25;
            border: 3px solid #FFFAF0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFAF0;
            font-size: 17px;
            box-shadow: 0 3px 10px rgba(11,44,37,.25);
          ">⌖</div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker(
        [shop.latitude, shop.longitude],
        { icon: markerIcon },
      ).addTo(map);

      marker.on('click', () => {
        setSelectedShopId(shop.id);
      });

      markersRef.current[shop.id] = marker;
    });

    if (filteredShops.length > 0) {
      const validCoordinates = filteredShops
        .filter(
          ({ shop }) =>
            Number.isFinite(shop.latitude) &&
            Number.isFinite(shop.longitude) &&
            !(shop.latitude === 0 && shop.longitude === 0),
        )
        .map(({ shop }) => [shop.latitude, shop.longitude] as L.LatLngTuple);

      if (validCoordinates.length > 1) {
        map.fitBounds(validCoordinates, {
          padding: [45, 45],
          maxZoom: 14,
        });
      }
    }
  }, [filteredShops]);

  const handleSelectShop = (shop: Offer['shop']) => {
    setSelectedShopId(shop.id);

    const map = mapInstanceRef.current;

    if (map) {
      map.flyTo([shop.latitude, shop.longitude], 15, {
        animate: true,
        duration: 0.6,
      });

      markersRef.current[shop.id]?.openPopup();
    }
  };

  const handleLocate = () => {
    const map = mapInstanceRef.current;

    if (map) {
      map.flyTo([location.lat, location.lng], 14, {
        animate: true,
        duration: 0.6,
      });

      userMarkerRef.current?.openPopup();
    }
  };

  const handleSearchThisArea = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = map.getBounds();

    const visibleShops = filteredShops.filter(({ shop }) =>
      bounds.contains([shop.latitude, shop.longitude]),
    );

    if (visibleShops.length > 0) {
      setSelectedShopId(visibleShops[0].shop.id);
    } else {
      setSelectedShopId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFAF0] px-4 py-5 font-poppins text-[#0B2C25] sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1440px] space-y-5">

        {/* Page heading */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0B2C25] sm:text-[28px]">
              Carte des commerces
            </h1>

            <p className="mt-1 text-[12px] text-[#0B2C25]/65 sm:text-sm">
              Découvrez les commerces et leurs offres près de {location.label}
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-[#0B2C25]/10 bg-white px-4 py-3 text-xs font-medium text-[#0B2C25] transition hover:bg-[#DBF0DD] sm:self-auto"
          >
            <Navigation size={15} className="text-[#17664E]" />
            Changer de zone
          </button>
        </div>

        {/* Search and filters */}
        <div className="relative z-[500] flex gap-2">
          <div className="flex h-[48px] min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-[#0B2C25]/10 bg-white px-4">
            <Search size={19} className="shrink-0 text-[#17664E]" />

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher un commerce…"
              className="w-full bg-transparent text-[12px] text-[#0B2C25] outline-none placeholder:text-[#0B2C25]/55"
              aria-label="Rechercher un commerce"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Effacer la recherche"
                className="shrink-0 text-[#0B2C25]/50 hover:text-[#0B2C25]"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            aria-label="Afficher les filtres"
            aria-expanded={showFilters}
            className={`flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] border transition ${
              showFilters
                ? 'border-[#17664E] bg-[#DBF0DD] text-[#17664E]'
                : 'border-[#0B2C25]/10 bg-white text-[#0B2C25]'
            }`}
          >
            <SlidersHorizontal size={19} />
          </button>

          {showFilters && (
            <div className="absolute right-0 top-[56px] z-[1000] w-full max-w-[340px] rounded-2xl border border-[#0B2C25]/10 bg-[#FFFAF0] p-5 shadow-[0_12px_35px_rgba(11,44,37,0.15)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Filtrer les commerces
                </h3>

                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  aria-label="Fermer les filtres"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mb-3 text-xs font-medium text-[#0B2C25]/65">
                Catégorie
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`rounded-full px-3 py-2 text-[11px] transition ${
                    selectedCategory === 'all'
                      ? 'bg-[#0B2C25] text-[#FFFAF0]'
                      : 'border border-[#0B2C25]/10 bg-white text-[#0B2C25]'
                  }`}
                >
                  Toutes
                </button>

                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.slug}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`rounded-full px-3 py-2 text-[11px] transition ${
                      selectedCategory === category.slug
                        ? 'bg-[#0B2C25] text-[#FFFAF0]'
                        : 'border border-[#0B2C25]/10 bg-white text-[#0B2C25]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="mt-5 h-11 w-full rounded-xl bg-[#0B2C25] text-xs font-semibold text-[#FFFAF0] transition hover:bg-[#17664E]"
              >
                Appliquer
              </button>
            </div>
          )}
        </div>

        {/* Main map and results */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* Map */}
          <div className="relative h-[570px] overflow-hidden rounded-[20px] border border-[#0B2C25]/10 bg-[#EBEEE1] shadow-sm sm:h-[650px] lg:h-[720px]">
            <div
              ref={mapContainerRef}
              className="z-0 h-full w-full"
              aria-label="Carte des commerces"
            />

            {/* Search this area */}
            <button
              type="button"
              onClick={handleSearchThisArea}
              className="absolute left-4 top-4 z-[400] inline-flex h-[40px] items-center gap-2 rounded-full bg-white px-4 text-[11px] font-medium text-[#0B2C25] shadow-[0_4px_16px_rgba(11,44,37,0.10)] transition hover:bg-[#DBF0DD]"
            >
              <Navigation size={14} className="text-[#17664E]" />
              Rechercher dans cette zone
            </button>

            {/* Map controls */}
            <div className="absolute right-4 top-[76px] z-[400] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                aria-label="Zoom avant"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0B2C25] shadow-[0_4px_16px_rgba(11,44,37,0.10)] transition hover:bg-[#DBF0DD]"
              >
                <Plus size={18} />
              </button>

              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                aria-label="Zoom arrière"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0B2C25] shadow-[0_4px_16px_rgba(11,44,37,0.10)] transition hover:bg-[#DBF0DD]"
              >
                <Minus size={18} />
              </button>

              <button
                type="button"
                onClick={handleLocate}
                aria-label="Revenir à ma position"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#17664E] shadow-[0_4px_16px_rgba(11,44,37,0.10)] transition hover:bg-[#DBF0DD]"
              >
                <LocateFixed size={18} />
              </button>
            </div>

            {/* Nearby count */}
            <div className="absolute bottom-4 left-4 z-[400] rounded-full bg-[#0B2C25] px-4 py-2 text-[11px] font-medium text-[#FFFAF0] shadow-sm">
              {filteredShops.length} commerce
              {filteredShops.length !== 1 ? 's' : ''} trouvé
              {filteredShops.length !== 1 ? 's' : ''}
            </div>

            {/* Mobile selected-shop preview */}
            {selectedShop && selectedOffer && (
              <div className="absolute bottom-4 left-3 right-3 z-[400] rounded-[18px] bg-white p-3 shadow-[0_6px_25px_rgba(11,44,37,0.14)] lg:hidden">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-semibold text-[#0B2C25]">
                      {selectedShop.shop.name}
                    </h3>

                    <p className="mt-0.5 truncate text-[10px] text-[#17664E]">
                      {formatDistance(getShopDistance(selectedShop.shop))}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedShopId(null)}
                    aria-label="Fermer l'aperçu"
                    className="shrink-0 text-[#0B2C25]/50"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <img
                    src={selectedOffer.photos?.[0]?.url || ''}
                    alt={selectedOffer.name}
                    className="h-16 w-16 shrink-0 rounded-[10px] bg-[#EBEEE1] object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[12px] font-semibold text-[#0B2C25]">
                      {selectedOffer.name}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-[10px] text-[#0B2C25]/60">
                      <Clock3 size={11} />
                      {new Date(selectedOffer.expiresAt).toLocaleTimeString(
                        'fr-FR',
                        { hour: '2-digit', minute: '2-digit' },
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[14px] font-semibold text-[#17664E]">
                      {formatPrice(selectedOffer.discountedPrice)}
                    </p>

                    <p className="text-[10px] text-[#0B2C25]/50 line-through">
                      {formatPrice(selectedOffer.originalPrice)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[#17664E]">
                    {selectedOffer.quantityAvailable} restant(s)
                  </span>

                  <Link
                    to={`/offers/${selectedOffer.id}`}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B2C25] text-[11px] font-semibold text-[#FFFAF0] transition hover:bg-[#17664E]"
                  >
                    Voir l'offre
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Desktop shop list */}
          <aside className="hidden h-[720px] flex-col overflow-hidden rounded-[20px] border border-[#0B2C25]/10 bg-white p-5 lg:flex">
            {loading ? (
              <p className="py-8 text-center text-xs text-[#0B2C25]/55">
                Chargement des commerces…
              </p>
            ) : filteredShops.length === 0 ? (
              <div className="flex flex-1 items-center">
                <EmptyMapState
                  onExpandZone={openModal}
                  onResetFilters={resetFilters}
                />
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between border-b border-[#0B2C25]/10 pb-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#0B2C25]">
                      Commerces à proximité
                    </h2>

                    <p className="mt-1 text-[11px] text-[#0B2C25]/55">
                      {filteredShops.length} résultat(s)
                    </p>
                  </div>

                  <Store size={19} className="text-[#17664E]" />
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {filteredShops.map(({ shop, offers: shopOffers }) => {
                    const isSelected = selectedShop?.shop.id === shop.id;
                    const firstOffer = shopOffers[0];

                    return (
                      <button
                        type="button"
                        key={shop.id}
                        onClick={() => handleSelectShop(shop)}
                        className={`w-full rounded-[15px] border p-4 text-left transition ${
                          isSelected
                            ? 'border-[#17664E] bg-[#DBF0DD]/50'
                            : 'border-[#0B2C25]/10 bg-white hover:border-[#17664E]/40 hover:bg-[#FFFAF0]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DBF0DD] text-[#17664E]">
                              <Store size={18} />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-[12px] font-semibold text-[#0B2C25]">
                                {shop.name}
                              </h3>

                              <p className="mt-1 truncate text-[10px] text-[#0B2C25]/55">
                                {shop.address}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full bg-[#DBF0DD] px-2 py-1 text-[10px] font-medium text-[#17664E]">
                            {shopOffers.length} offre(s)
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#0B2C25]/10 pt-3">
                          <span className="text-[10px] text-[#17664E]">
                            {formatDistance(getShopDistance(shop))}
                          </span>

                          {firstOffer && (
                            <span className="text-[11px] font-semibold text-[#17664E]">
                              Dès {formatPrice(firstOffer.discountedPrice)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedShop && selectedOffer && (
                  <div className="mt-4 rounded-[16px] bg-[#FFFAF0] p-4">
                    <p className="mb-3 text-[11px] font-semibold text-[#0B2C25]">
                      Offre sélectionnée
                    </p>

                    <div className="flex items-center gap-3">
                      <img
                        src={selectedOffer.photos?.[0]?.url || ''}
                        alt={selectedOffer.name}
                        className="h-[62px] w-[62px] shrink-0 rounded-xl bg-[#EBEEE1] object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[11px] font-semibold">
                          {selectedOffer.name}
                        </p>

                        <p className="mt-1 text-[10px] text-[#0B2C25]/55">
                          {selectedOffer.quantityAvailable} restant(s)
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-[#17664E]">
                          {formatPrice(selectedOffer.discountedPrice)}
                        </p>

                        <p className="text-[10px] text-[#0B2C25]/50 line-through">
                          {formatPrice(selectedOffer.originalPrice)}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/offers/${selectedOffer.id}`}
                      className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0B2C25] text-[11px] font-semibold text-[#FFFAF0] transition hover:bg-[#17664E]"
                    >
                      Voir l'offre
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>

        {/* Mobile empty state */}
        {!loading && filteredShops.length === 0 && (
          <div className="lg:hidden">
            <EmptyMapState
              onExpandZone={openModal}
              onResetFilters={resetFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopsMapViewPage;
