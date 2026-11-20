// frontend/src/features/catalogue/components/LocationModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '../context/LocationContext';
import { MapPin, Navigation, Search, X, Check } from 'lucide-react';
import L from 'leaflet';

export const LocationModal: React.FC = () => {
  const { location, setLocation, isModalOpen, closeModal, requestCurrentPosition } = useLocation();
  const [addressInput, setAddressInput] = useState('');
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: location.lat,
    lng: location.lng,
  });
  const [selectedLabel, setSelectedLabel] = useState(location.label);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Popular Algerian city locations for quick manual selection
  const POPULAR_LOCATIONS = [
    { label: 'Alger Centre', lat: 36.7725, lng: 3.0588 },
    { label: 'Bab Ezzouar (Alger)', lat: 36.7212, lng: 3.1829 },
    { label: 'Oran Centre', lat: 35.6987, lng: -0.6349 },
    { label: 'Constantine', lat: 36.3650, lng: 6.6147 },
    { label: 'Sétif', lat: 36.1911, lng: 5.4137 },
    { label: 'Annaba', lat: 36.9000, lng: 7.7667 },
  ];

  useEffect(() => {
    if (!isModalOpen) return;
    setSelectedCoords({ lat: location.lat, lng: location.lng });
    setSelectedLabel(location.label);

    const timer = setTimeout(() => {
      if (mapContainerRef.current && !mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([location.lat, location.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color: #10B981; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">📍</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const marker = L.marker([location.lat, location.lng], { icon: customIcon }).addTo(map);
        markerRef.current = marker;

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setSelectedCoords({ lat, lng });
          setSelectedLabel(`Point sélectionné (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          marker.setLatLng([lat, lng]);
        });

        mapInstanceRef.current = map;
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isModalOpen, location]);

  if (!isModalOpen) return null;

  const handleUseCurrentPosition = async () => {
    setLoadingGeo(true);
    try {
      await requestCurrentPosition();
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleSave = () => {
    setLocation({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      label: selectedLabel || addressInput || 'Position personnalisée',
    });
    closeModal();
  };

  const handleQuickSelect = (loc: { label: string; lat: number; lng: number }) => {
    setSelectedCoords({ lat: loc.lat, lng: loc.lng });
    setSelectedLabel(loc.label);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([loc.lat, loc.lng], 13);
      markerRef.current.setLatLng([loc.lat, loc.lng]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Choisir votre localisation</h2>
              <p className="text-xs text-gray-500">Pour voir les offres disponibles autour de vous</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Geolocation Button with explanation */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-emerald-950">Utiliser ma position actuelle</h4>
                <p className="text-xs text-emerald-700/90 mt-0.5">
                  FORSA utilise votre position uniquement pour calculer la distance des commerces anti-gaspillage proches.
                </p>
                <button
                  onClick={handleUseCurrentPosition}
                  disabled={loadingGeo}
                  className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingGeo ? 'Localisation en cours...' : 'Me géolocaliser'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick city suggestions */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Villes populaires
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_LOCATIONS.map((city) => (
                <button
                  key={city.label}
                  onClick={() => handleQuickSelect(city)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                    selectedLabel === city.label
                      ? 'bg-emerald-600 text-white border-emerald-600 font-medium'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  {city.label}
                  {selectedLabel === city.label && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Ou saisissez une adresse
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: Bab El Oued, Alger..."
                value={addressInput}
                onChange={(e) => {
                  setAddressInput(e.target.value);
                  setSelectedLabel(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Interactive Map */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Sélectionnez un point précis sur la carte
            </label>
            <div
              ref={mapContainerRef}
              className="w-full h-48 rounded-xl border border-gray-200 overflow-hidden shadow-inner"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Cliquez n'importe où sur la carte pour déplacer le repère.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-600 truncate max-w-[260px]">
            <span className="font-semibold text-gray-800">Sélectionné :</span> {selectedLabel}
          </div>
          <div className="flex gap-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
