// frontend/src/features/catalogue/pages/ShopsMapViewPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { Offer } from '../types';
import { useLocation } from '../context/LocationContext';
import { MapPin, Star, Store, ArrowRight, Navigation } from 'lucide-react';
import L from 'leaflet';

export const ShopsMapViewPage: React.FC = () => {
  const { location, openModal } = useLocation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    CatalogueApi.getOffers({ limit: 50 }).then((res) => setOffers(res.data));
  }, []);

  // Distinct shops from offers
  const shops = React.useMemo(() => {
    const map = new Map<string, { shop: Offer['shop']; offers: Offer[] }>();
    offers.forEach((o) => {
      if (!o.shop) return;
      if (!map.has(o.shop.id)) {
        map.set(o.shop.id, { shop: o.shop, offers: [] });
      }
      map.get(o.shop.id)!.offers.push(o);
    });
    return Array.from(map.values());
  }, [offers]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView([location.lat, location.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // User location marker (Blue)
    const userIcon = L.divIcon({
      className: 'user-pin',
      html: `<div style="background-color: #2563EB; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">🏠</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    L.marker([location.lat, location.lng], { icon: userIcon })
      .bindPopup(`<strong>Votre position actuelle</strong><br />${location.label}`)
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [location]);

  // Update shop markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    shops.forEach(({ shop, offers: shopOffers }) => {
      if (!shop.latitude || !shop.longitude) return;

      const shopIcon = L.divIcon({
        className: 'shop-pin',
        html: `<div style="background-color: #10B981; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">🥖</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const marker = L.marker([shop.latitude, shop.longitude], { icon: shopIcon }).addTo(map);

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; padding: 4px;">
          <h4 style="margin: 0 0 4px; font-weight: 800; font-size: 13px;">${shop.name}</h4>
          <p style="margin: 0 0 6px; color: #64748B;">${shop.address}</p>
          <div style="color: #059669; font-weight: 700;">${shopOffers.length} panier(s) actif(s)</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => setSelectedShopId(shop.id));

      markersRef.current[shop.id] = marker;
    });
  }, [shops]);

  const handleSelectShop = (shopId: string, lat: number, lng: number) => {
    setSelectedShopId(shopId);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
      markersRef.current[shopId]?.openPopup();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Carte des commerces anti-gaspi</h1>
          <p className="text-xs text-gray-500">
            Localisez les boulangeries, primeurs et restaurants engagés près de {location.label}
          </p>
        </div>

        <button
          onClick={openModal}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-xs transition"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Changer de zone</span>
        </button>
      </div>

      {/* Grid: Map + Side List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px]">
        {/* Map View (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-gray-200 shadow-md relative">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Shops Side List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-100 p-5 shadow-xs flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Commerces à proximité ({shops.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {shops.map(({ shop, offers: shopOffers }) => {
              const isSelected = selectedShopId === shop.id;
              return (
                <div
                  key={shop.id}
                  onClick={() => handleSelectShop(shop.id, shop.latitude, shop.longitude)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{shop.name}</h4>
                        <div className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{shop.averageRating?.toFixed(1) || '4.8'}</span>
                          <span className="text-gray-400 font-normal">({shop.salesCount} ventes)</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      {shopOffers.length} offre(s)
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 mt-2 line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span>{shop.address}</span>
                  </p>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      to={`/explore?q=${encodeURIComponent(shop.name)}`}
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>Voir les paniers</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
