// frontend/src/features/profile/LocationPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useLocation, UserLocation } from '../catalogue/context/LocationContext';
import {
  MapPin,
  Navigation,
  Search,
  Building2,
  Sliders,
  Check,
  Info,
  Compass,
  CheckCircle2,
  Loader2,
  Store,
  ChevronRight,
  Edit2,
  X,
} from 'lucide-react';
import { updateUserProfile } from '../auth/services/authService';

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
  { code: '53', name: 'In Salah', lat: 27.1935, lng: 2.4607 },
  { code: '54', name: 'In Guezzam', lat: 19.5683, lng: 5.7686 },
  { code: '55', name: 'Touggourt', lat: 33.1064, lng: 6.0594 },
  { code: '56', name: 'Djanet', lat: 24.5539, lng: 9.4844 },
  { code: '57', name: 'El M\'Ghair', lat: 33.9483, lng: 5.9222 },
  { code: '58', name: 'El Meniaa', lat: 30.5847, lng: 2.8839 },
];

// Commerces partenaires de démonstration sur la carte (Figma 1364:92691 - 1364:92703)
const SAMPLE_SHOPS = [
  { id: 's1', name: 'La Boulangerie', lat: 36.7580, lng: 3.0640, isPrimary: true },
  { id: 's2', name: 'Pâtisserie Nour', lat: 36.7490, lng: 3.0510 },
  { id: 's3', name: 'Laiterie Atlas', lat: 36.7620, lng: 3.0720 },
  { id: 's4', name: 'Boulangerie du Parc', lat: 36.7440, lng: 3.0610 },
  { id: 's5', name: 'Pâtisserie Rose', lat: 36.7420, lng: 3.0480 },
];

function createLocationMarkerIcon(label?: string): L.DivIcon {
  const display = label ? (label.length > 25 ? label.slice(0, 22) + '...' : label) : '';
  const labelHtml = display
    ? `<div style="
        position: absolute;
        bottom: 46px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffffff;
        border-radius: 100px;
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 600;
        color: #0b2c25;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        border: 1px solid rgba(11,44,37,0.15);
        pointer-events: none;
        font-family: inherit;
      ">${display}</div>`
    : '';

  return L.divIcon({
    className: 'forsa-user-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        ${labelHtml}
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 100px;
          background: #0b2c25;
          border: 3px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(11,44,37,0.4);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function createShopMarkerIcon(name: string, isPrimary = false): L.DivIcon {
  const bg = isPrimary ? '#0b2c25' : '#ffffff';
  const color = isPrimary ? '#ffffff' : '#0b2c25';
  const border = isPrimary ? 'border: 2px solid #17664e;' : 'border: 1px solid rgba(11,44,37,0.2);';

  return L.divIcon({
    className: 'forsa-shop-marker',
    html: `
      <div style="
        background: ${bg};
        color: ${color};
        ${border}
        border-radius: 100px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        white-space: nowrap;
        pointer-events: auto;
      ">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${isPrimary ? '#6ee7b7' : '#17664e'};"></span>
        <span>${name}</span>
      </div>
    `,
    iconSize: [120, 26],
    iconAnchor: [60, 13],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const LocationPage: React.FC = () => {
  const navigate = useNavigate();
  const { location, setLocation } = useLocation();

  const [selectedLat, setSelectedLat] = useState<number>(location.lat || 36.7538);
  const [selectedLng, setSelectedLng] = useState<number>(location.lng || 3.0588);
  const [selectedLabel, setSelectedLabel] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('forsa_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const u = parsed.user || parsed;
        const loc = u.preferences?.preferredLocation || u.preferredLocation;
        if (loc) return loc;
      }
    } catch {}
    return location.label || 'Bab Ezzouar, Alger';
  });
  const [radiusKm, setRadiusKm] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('forsa_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const u = parsed.user || parsed;
        const rad = u.preferences?.searchRadiusKm || u.searchRadiusKm;
        if (rad) return rad;
      }
    } catch {}
    return (location as any).radius || 10;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);

  // Détection GPS
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLat(lat);
        setSelectedLng(lng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            setSelectedLabel(parts.slice(0, 3).join(',').trim());
          } else {
            setSelectedLabel('Ma position GPS');
          }
        } catch {
          setSelectedLabel('Ma position GPS');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.warn('GPS error:', err);
        setGpsLoading(false);
        alert('Impossible d’accéder à votre position GPS. Veuillez vérifier vos autorisations ou choisir une wilaya.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Clic sur la carte pour définir la position
  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        setSelectedLabel(parts.slice(0, 3).join(',').trim());
      }
    } catch {}
  };

  // Recherche d'adresse
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim() + ', Algérie'
        )}&limit=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setSelectedLat(lat);
        setSelectedLng(lng);
        const parts = data[0].display_name.split(',');
        setSelectedLabel(parts.slice(0, 3).join(',').trim());
      } else {
        alert('Adresse introuvable en Algérie. Veuillez préciser ou sélectionner une wilaya.');
      }
    } catch {
      alert('Erreur lors de la recherche.');
    } finally {
      setSearching(false);
    }
  };

  // Sélection d'une wilaya
  const handleSelectWilaya = (wilayaName: string) => {
    const w = ALGERIAN_WILAYAS.find((item) => item.name === wilayaName);
    if (!w) return;
    setSelectedLat(w.lat);
    setSelectedLng(w.lng);
    setSelectedLabel(`${w.name}, Algérie`);
  };

  // Sauvegarde
  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedLoc: UserLocation & { radius: number } = {
        lat: selectedLat,
        lng: selectedLng,
        label: selectedLabel,
        radius: radiusKm,
      };

      setLocation(updatedLoc);

      // Immédiatement mettre à jour le cache local forsa_user
      try {
        const cached = localStorage.getItem('forsa_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          const u = parsed.user || parsed;
          if (!u.preferences) u.preferences = {};
          u.preferences.preferredLocation = selectedLabel;
          u.preferences.searchRadiusKm = radiusKm;
          u.preferredLocation = selectedLabel;
          localStorage.setItem('forsa_user', JSON.stringify(parsed));
        }
      } catch {}

      // Persistance backend si connecté
      const token = localStorage.getItem('forsa_access_token');
      if (token) {
        await updateUserProfile({
          preferredLocation: selectedLabel,
          searchRadiusKm: radiusKm,
        }).catch((e) => console.warn('Erreur sauvegarde profil:', e));
      }

      setSuccessBanner(true);
      setTimeout(() => {
        navigate('/profile');
      }, 900);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#fffaf0] p-4 sm:p-6 md:p-8 font-poppins text-[#0B2C25] selection:bg-[#17664e] selection:text-white"
      data-node-id="1364:92386"
      data-name="Desktop · Localisation — Ma localisation"
    >
      <div className="max-w-[1140px] mx-auto space-y-5">
        {/* En-tête Figma 1364:92389 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-bold tracking-tight text-[#0b2c25]">
              Ma localisation
            </h1>
            <p className="text-sm sm:text-base text-[#0b2c25]/75 mt-1 font-normal">
              Choisissez la zone où trouver les offres près de vous.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="self-start sm:self-auto border border-[#0b2c25]/30 hover:bg-stone-100 text-[#0b2c25] text-xs font-semibold px-4 py-2 rounded-full transition cursor-pointer"
          >
            ← Retour au profil
          </button>
        </div>

        {successBanner && (
          <div className="p-4 rounded-[16px] bg-[#eef7ec] border border-[#235347]/30 text-[#0b2c25] flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="size-5 text-[#17664e] shrink-0" />
            <p className="text-sm font-medium">
              Votre zone de recherche a été enregistrée avec succès ! Redirection vers votre profil...
            </p>
          </div>
        )}

        {/* Grille Colonnes : Figma 1364:92402 (Carte carte à gauche + Panneau à droite) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── COLONNE GAUCHE : VRAIE CARTE INTERACTIVE LEAFLET (Figma 1364:92403) ─── */}
          <div className="lg:col-span-7 flex flex-col w-full">
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] overflow-hidden relative h-[520px] lg:h-[730px] shadow-sm flex flex-col">
              {/* Barre de recherche flottante sur carte (Figma 1364:92707) */}
              <div className="absolute top-4 left-4 right-4 z-[1000]">
                <form
                  onSubmit={handleSearchSubmit}
                  className="bg-white/95 backdrop-blur-md border border-[#0b2c25]/30 rounded-[14px] shadow-md flex items-center gap-2.5 px-3.5 h-12"
                >
                  <Search className="size-4 text-[#0b2c25]/60 shrink-0" />
                  <input
                    type="text"
                    placeholder="Rechercher une ville, une adresse…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#0b2c25] focus:outline-none placeholder:text-[#0b2c25]/50 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="submit"
                      disabled={searching}
                      className="px-3 py-1.5 bg-[#0b2c25] hover:bg-[#17664e] text-white text-[11px] font-semibold rounded-[10px] transition cursor-pointer shrink-0"
                    >
                      {searching ? '...' : 'Chercher'}
                    </button>
                  )}
                </form>
              </div>

              {/* Composant Vraie Carte Leaflet */}
              <div className="size-full relative z-0">
                <MapContainer
                  center={[selectedLat, selectedLng]}
                  zoom={13}
                  zoomControl={false}
                  scrollWheelZoom={true}
                  className="size-full"
                  style={{ background: '#ebeee1' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapController center={[selectedLat, selectedLng]} zoom={13} />
                  <MapClickHandler onMapClick={handleMapClick} />

                  {/* Cercle représentant le rayon de recherche dynamique */}
                  <Circle
                    center={[selectedLat, selectedLng]}
                    radius={radiusKm * 1000}
                    pathOptions={{
                      color: '#17664e',
                      fillColor: '#17664e',
                      fillOpacity: 0.12,
                      weight: 2,
                    }}
                  />

                  {/* Repère de position de l'utilisateur avec label */}
                  <Marker
                    position={[selectedLat, selectedLng]}
                    icon={createLocationMarkerIcon(selectedLabel)}
                  />

                  {/* Repères des commerces partenaires de la zone */}
                  {SAMPLE_SHOPS.map((shop) => (
                    <Marker
                      key={shop.id}
                      position={[shop.lat, shop.lng]}
                      icon={createShopMarkerIcon(shop.name, shop.isPrimary)}
                    />
                  ))}
                </MapContainer>
              </div>

              {/* Bouton Me localiser rapide (Figma 1364:92711) */}
              <div className="absolute bottom-4 right-4 z-[1000]">
                <button
                  type="button"
                  onClick={handleUseGPS}
                  title="Me localiser automatiquement avec le GPS"
                  className="size-12 rounded-[24px] bg-white border border-[#0b2c25]/30 shadow-lg flex items-center justify-center text-[#17664e] hover:bg-stone-50 transition cursor-pointer"
                >
                  {gpsLoading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Compass className="size-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ─── COLONNE DROITE : PANNEAU DE CONTRÔLE (Figma 1364:92713) ─── */}
          <div className="lg:col-span-5 space-y-4 w-full">
            {/* 1. Section Position enregistrée (Figma 1364:92714) */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-[18px] shadow-sm flex flex-col gap-[14px]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <MapPin className="size-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-[#0b2c25]">Position enregistrée</h3>
              </div>

              <div className="flex items-center gap-3.5 py-2">
                <div className="size-10 rounded-[14px] bg-[#0b2c25] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Navigation className="size-4 -rotate-45" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-[#0b2c25] truncate">
                    {selectedLabel}
                  </p>
                  <p className="text-[12px] text-[#0b2c25]/70">
                    Localisation préférée actuelle
                  </p>
                </div>
                <span className="text-[12px] font-medium text-[#17664e] bg-[#dbf0dd] px-2.5 py-1 rounded-full whitespace-nowrap">
                  Active
                </span>
              </div>
            </div>

            {/* 2. Section Choisir une autre localisation (Figma 1364:92727) */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-[18px] shadow-sm flex flex-col gap-[14px]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <Compass className="size-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-[#0b2c25]">Autre localisation</h3>
              </div>

              <div className="divide-y divide-[#0b2c25]/10">
                {/* Ligne Utiliser ma position (GPS) - Figma 1364:92733 */}
                <div
                  onClick={handleUseGPS}
                  className="flex items-center justify-between py-3 px-1 hover:bg-[#fffaf0] rounded-[14px] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-[14px] bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Compass className="size-4 text-[#17664e]" />
                    </div>
                    <span className="text-[14px] font-medium text-[#0b2c25] group-hover:text-[#17664e] transition">
                      Utiliser ma position
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0b2c25]/80 bg-[#ebeee1] px-2 py-0.5 rounded-[8px]">
                      GPS
                    </span>
                    {gpsLoading ? (
                      <Loader2 className="size-4 animate-spin text-[#17664e]" />
                    ) : (
                      <ChevronRight className="size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition" />
                    )}
                  </div>
                </div>

                {/* Ligne Saisir une adresse - Figma 1364:92741 */}
                <div className="py-2.5 px-1">
                  <div
                    onClick={() => setShowAddressInput((prev) => !prev)}
                    className="flex items-center justify-between py-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-[14px] bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                        <Edit2 className="size-4" />
                      </div>
                      <span className="text-[14px] font-medium text-[#0b2c25] group-hover:text-[#17664e] transition">
                        Saisir une adresse
                      </span>
                    </div>
                    <ChevronRight
                      className={`size-4 text-[#0b2c25]/40 group-hover:text-[#0b2c25] transition transform ${
                        showAddressInput ? 'rotate-90' : ''
                      }`}
                    />
                  </div>

                  {showAddressInput && (
                    <form onSubmit={handleSearchSubmit} className="mt-2.5 relative flex items-center">
                      <input
                        type="text"
                        placeholder="Ex: Bab Ezzouar, Alger"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-3 pr-20 rounded-[12px] bg-[#fffaf0] border border-[#dbf0dd] text-xs text-[#0b2c25] focus:outline-none focus:ring-1 focus:ring-[#17664e]"
                      />
                      <button
                        type="submit"
                        disabled={searching || !searchQuery.trim()}
                        className="absolute right-1 h-7 px-2.5 bg-[#0b2c25] hover:bg-[#17664e] text-white text-[11px] font-semibold rounded-[8px] transition disabled:opacity-50 cursor-pointer"
                      >
                        {searching ? '...' : 'Valider'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Ligne Choisir une ville (58 wilayas) - Figma 1364:92748 */}
                <div className="py-3 px-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-[14px] bg-[#ebeee1] flex items-center justify-center text-[#0b2c25] shrink-0">
                      <Building2 className="size-4 text-[#0b2c25]" />
                    </div>
                    <span className="text-[14px] font-medium text-[#0b2c25]">
                      Choisir une ville
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <select
                      onChange={(e) => handleSelectWilaya(e.target.value)}
                      defaultValue=""
                      style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                      className="w-full h-10 px-3.5 pr-10 rounded-[12px] bg-[#fffaf0] border border-[#dbf0dd] text-xs font-medium text-[#0b2c25] focus:outline-none focus:ring-1 focus:ring-[#17664e] cursor-pointer appearance-none leading-normal"
                    >
                      <option value="" disabled>
                        -- Sélectionner une wilaya parmi les 58 --
                      </option>
                      {ALGERIAN_WILAYAS.map((w) => (
                        <option key={w.code} value={w.name}>
                          {w.code} - {w.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 flex items-center text-[#0b2c25]/60">
                      <ChevronRight className="size-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Section Rayon (Figma 1364:92755) */}
            <div className="bg-white rounded-[24px] border-[1.5px] border-[#dbf0dd] p-[18px] shadow-sm flex flex-col gap-[14px]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center text-[#17664e] shrink-0">
                  <Sliders className="size-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-[#0b2c25]">Rayon de recherche</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[14px] text-[#0b2c25]">
                  <span className="font-medium">Distance de recherche</span>
                  <span className="font-semibold">{radiusKm} km</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                  className="w-full accent-[#0b2c25] cursor-pointer h-2 bg-[#ebeee1] rounded-lg"
                />

                <div className="flex justify-between text-[12px] text-[#0b2c25]/60 font-medium">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>

            {/* 4. Information (Figma 1364:92772) */}
            <div className="bg-[#eef7ec] border-[1.5px] border-[#dbf0dd] rounded-[20px] px-4 py-3.5 flex items-start gap-3">
              <Info className="size-5 text-[#17664e] shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#17664e] leading-relaxed">
                Votre localisation nous aide à vous proposer des offres proches de chez vous. Elle n’est jamais partagée.
              </p>
            </div>

            {/* 5. Actions (Figma 1364:92775) */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 h-11 rounded-[12px] border border-black/40 bg-white hover:bg-stone-50 text-[#0b2c25] text-[13px] font-semibold transition cursor-pointer flex items-center justify-center"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] text-white text-[13px] font-semibold shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4 stroke-[3]" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LocationPage;
