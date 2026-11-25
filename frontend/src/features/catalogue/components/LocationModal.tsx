// frontend/src/features/catalogue/components/LocationModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '../context/LocationContext';
import { MapPin, Navigation, Search, X, Check } from 'lucide-react';
import L from 'leaflet';
import { updateUserProfile } from '../../auth/services/authService';

const ALGERIAN_WILAYAS = [
  { code: '01', name: 'Adrar', lat: 27.8742, lng: -0.2939 },
  { code: '02', name: 'Chlef', lat: 36.1654, lng: 1.3345 },
  { code: '03', name: 'Laghouat', lat: 33.8000, lng: 2.8651 },
  { code: '04', name: 'Oum El Bouaghi', lat: 35.8755, lng: 7.1135 },
  { code: '05', name: 'Batna', lat: 35.5559, lng: 6.1741 },
  { code: '06', name: 'Béjaïa', lat: 36.7559, lng: 5.0843 },
  { code: '07', name: 'Biskra', lat: 34.8504, lng: 5.7281 },
  { code: '08', name: 'Béchar', lat: 31.6167, lng: -2.2167 },
  { code: '09', name: 'Blida', lat: 36.4706, lng: 2.8275 },
  { code: '10', name: 'Bouira', lat: 36.3749, lng: 3.9020 },
  { code: '11', name: 'Tamanrasset', lat: 22.7850, lng: 5.5228 },
  { code: '12', name: 'Tébessa', lat: 35.4042, lng: 8.1242 },
  { code: '13', name: 'Tlemcen', lat: 34.8783, lng: -1.3150 },
  { code: '14', name: 'Tiaret', lat: 35.3710, lng: 1.3170 },
  { code: '15', name: 'Tizi Ouzou', lat: 36.7118, lng: 4.0459 },
  { code: '16', name: 'Alger', lat: 36.7538, lng: 3.0588 },
  { code: '17', name: 'Djelfa', lat: 34.6728, lng: 3.2530 },
  { code: '18', name: 'Jijel', lat: 36.8206, lng: 5.7667 },
  { code: '19', name: 'Sétif', lat: 36.1911, lng: 5.4137 },
  { code: '20', name: 'Saïda', lat: 34.8303, lng: 0.1517 },
  { code: '21', name: 'Skikda', lat: 36.8762, lng: 6.9092 },
  { code: '22', name: 'Sidi Bel Abbès', lat: 35.1899, lng: -0.6308 },
  { code: '23', name: 'Annaba', lat: 36.9000, lng: 7.7667 },
  { code: '24', name: 'Guelma', lat: 36.4621, lng: 7.4261 },
  { code: '25', name: 'Constantine', lat: 36.3650, lng: 6.6147 },
  { code: '26', name: 'Médéa', lat: 36.2642, lng: 2.7539 },
  { code: '27', name: 'Mostaganem', lat: 35.9312, lng: 0.0892 },
  { code: '28', name: 'M\'Sila', lat: 35.7058, lng: 4.5419 },
  { code: '29', name: 'Mascara', lat: 35.3948, lng: 0.1403 },
  { code: '30', name: 'Ouargla', lat: 31.9493, lng: 5.3250 },
  { code: '31', name: 'Oran', lat: 35.6987, lng: -0.6349 },
  { code: '32', name: 'El Bayadh', lat: 33.6832, lng: 1.0193 },
  { code: '33', name: 'Illizi', lat: 26.4833, lng: 8.4667 },
  { code: '34', name: 'Bordj Bou Arreridj', lat: 36.0732, lng: 4.7611 },
  { code: '35', name: 'Boumerdès', lat: 36.7664, lng: 3.4772 },
  { code: '36', name: 'El Tarf', lat: 36.7672, lng: 8.3138 },
  { code: '37', name: 'Tindouf', lat: 27.6711, lng: -8.1478 },
  { code: '38', name: 'Tissemsilt', lat: 35.6072, lng: 1.8108 },
  { code: '39', name: 'El Oued', lat: 33.3683, lng: 6.8674 },
  { code: '40', name: 'Khenchela', lat: 35.4358, lng: 7.1433 },
  { code: '41', name: 'Souk Ahras', lat: 36.2864, lng: 7.9511 },
  { code: '42', name: 'Tipaza', lat: 36.5897, lng: 2.4475 },
  { code: '43', name: 'Mila', lat: 36.4503, lng: 6.2644 },
  { code: '44', name: 'Aïn Defla', lat: 36.2641, lng: 1.9679 },
  { code: '45', name: 'Naâma', lat: 33.2667, lng: -0.3167 },
  { code: '46', name: 'Aïn Témouchent', lat: 35.2975, lng: -1.1404 },
  { code: '47', name: 'Ghardaïa', lat: 32.4909, lng: 3.6736 },
  { code: '48', name: 'Relizane', lat: 35.7373, lng: 0.5559 },
  { code: '49', name: 'Timimoun', lat: 29.2639, lng: 0.2310 },
  { code: '50', name: 'Bordj Badji Mokhtar', lat: 21.3283, lng: 0.9547 },
  { code: '51', name: 'Ouled Djellal', lat: 34.4333, lng: 5.0667 },
  { code: '52', name: 'Béni Abbès', lat: 30.1333, lng: -2.1667 },
  { code: '53', name: 'In Salah', lat: 27.1936, lng: 2.4608 },
  { code: '54', name: 'In Guezzam', lat: 19.5694, lng: 5.7694 },
  { code: '55', name: 'Touggourt', lat: 33.1053, lng: 6.0578 },
  { code: '56', name: 'Djanet', lat: 24.5531, lng: 9.4853 },
  { code: '57', name: 'El M\'Ghair', lat: 33.9494, lng: 5.9239 },
  { code: '58', name: 'El Meniaa', lat: 30.5833, lng: 2.8833 },
];

export const LocationModal: React.FC = () => {
  const { location, setLocation, isModalOpen, closeModal, requestCurrentPosition } = useLocation();
  const [addressInput, setAddressInput] = useState('');
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [savingBackend, setSavingBackend] = useState(false);
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('');
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
    { label: 'Blida Centre', lat: 36.4706, lng: 2.8275 },
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

  const handleSave = async () => {
    const finalLabel = selectedLabel || addressInput || 'Position personnalisée';
    const newLoc = {
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      label: finalLabel,
    };
    setLocation(newLoc);
    setSavingBackend(true);
    try {
      await updateUserProfile({ preferredLocation: finalLabel });
    } catch {
      // Ignorer si non authentifié
    } finally {
      setSavingBackend(false);
      closeModal();
    }
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

          {/* Sélecteur de Wilaya (58 wilayas d'Algérie) */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Sélectionner une Wilaya (58 wilayas)
            </label>
            <select
              value={selectedWilayaCode}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedWilayaCode(code);
                const w = ALGERIAN_WILAYAS.find((item) => item.code === code);
                if (w) {
                  handleQuickSelect({ label: `${w.name} (${w.code})`, lat: w.lat, lng: w.lng });
                }
              }}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- Choisir une wilaya algérienne --</option>
              {ALGERIAN_WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
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
